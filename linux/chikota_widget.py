#!/usr/bin/env python3
"""Chikota's dependency-light desktop library widget for Linux."""

from __future__ import annotations

import json
import os
import subprocess
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from datetime import datetime, timezone
from pathlib import Path
import tkinter as tk
from tkinter import messagebox, ttk


APP_NAME = "chikota"
CONFIG_DIR = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config")) / APP_NAME
CACHE_DIR = Path(os.environ.get("XDG_CACHE_HOME", Path.home() / ".cache")) / APP_NAME
CONFIG_FILE = CONFIG_DIR / "widget.json"
CACHE_FILE = CACHE_DIR / "widget-cache.json"
REFRESH_MS = 5 * 60 * 1000
RECENT_OPEN_WINDOW_S = 604_800
MIN_SIZE = (286, 260)
MAX_SIZE = (920, 900)

INK = "#f7f3ec"
MUTED = "#9e9589"
PANEL = "#171412"
CARD = "#211d19"
CARD_HOVER = "#29231e"
LINE = "#393027"
AMBER = "#f2aa24"
GREEN = "#61c788"
RED = "#e16f67"


def read_json(path: Path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return fallback


def write_private_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, indent=2), encoding="utf-8")
    temporary.chmod(0o600)
    temporary.replace(path)


def parse_time(value) -> float | None:
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)):
        number = float(value)
        return number / 1000 if number > 1e12 else number
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.timestamp()


def belongs_on_widget(item: dict, now: float | None = None) -> bool:
    """Keep in sync with src/lib/widget-membership.ts. See docs/widget-membership.md."""
    current = time.time() if now is None else now
    if item.get("widgetEnabled") or item.get("isPinned"):
        return True
    opened = parse_time(item.get("openedAt"))
    if opened is not None and 0 <= current - opened <= RECENT_OPEN_WINDOW_S:
        return True
    reminder = parse_time(item.get("reminderAt"))
    return reminder is not None and reminder > current


def secret_tool_available() -> bool:
    try:
        return subprocess.run(
            ["secret-tool", "--version"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        ).returncode == 0
    except OSError:
        return False


def load_token(config: dict) -> str:
    if secret_tool_available():
        try:
            result = subprocess.run(
                ["secret-tool", "lookup", "application", APP_NAME, "kind", "widget"],
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode == 0:
                return result.stdout.strip()
        except OSError:
            pass
    return str(config.get("token", ""))


def save_token(config: dict, token: str) -> None:
    if secret_tool_available():
        try:
            subprocess.run(
                [
                    "secret-tool",
                    "store",
                    "--label=Chikota widget connection",
                    "application",
                    APP_NAME,
                    "kind",
                    "widget",
                ],
                input=token,
                text=True,
                check=True,
            )
            config.pop("token", None)
            return
        except (OSError, subprocess.CalledProcessError):
            pass
    config["token"] = token


class ChikotaWidget:
    def __init__(self) -> None:
        self.root = tk.Tk(className="Chikota")
        self.root.title("chikota desktop library")
        self.root.configure(bg=PANEL)
        self.app_icon = None
        self.header_icon = None
        for icon_name in ("chikota.png", "AppIcon-64.png"):
            icon_path = Path(__file__).with_name(icon_name)
            if not icon_path.exists():
                continue
            try:
                self.app_icon = tk.PhotoImage(file=icon_path)
                self.header_icon = self.app_icon.subsample(3, 3)
                self.root.iconphoto(True, self.app_icon)
            except tk.TclError:
                pass
            break
        self.root.attributes("-topmost", True)
        self.root.minsize(*MIN_SIZE)
        self.root.maxsize(*MAX_SIZE)
        self.root.resizable(True, True)
        try:
            self.root.attributes("-type", "utility")
        except tk.TclError:
            pass

        self.config = read_json(CONFIG_FILE, {})
        self.token = load_token(self.config)
        self.items: list[dict] = []
        self.categories: list[dict] = []
        self.online = False
        self.status = tk.StringVar(value="offline")
        self.filter_mode = tk.StringVar(value="all")
        self.category_id = tk.StringVar(value="")
        self.category_name = tk.StringVar(value="all collections")
        self.drag_origin: tuple[int, int] | None = None
        self.refresh_job = None
        self.geometry_job = None

        self._configure_styles()
        self.shell = tk.Frame(self.root, bg=PANEL, padx=14, pady=12)
        self.shell.pack(fill="both", expand=True)
        self.build_menu()
        self.place_window()
        self.root.bind("<Configure>", self.remember_geometry)
        self.root.protocol("WM_DELETE_WINDOW", self.close)

        if not self.config.get("server") or not self.token:
            self.root.after(120, self.configure_connection)
        self.render()
        self.refresh()

    def _configure_styles(self) -> None:
        style = ttk.Style(self.root)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure(
            "Chikota.TCombobox",
            fieldbackground=CARD,
            background=CARD,
            foreground=INK,
            arrowcolor=MUTED,
            bordercolor=LINE,
            lightcolor=LINE,
            darkcolor=LINE,
            padding=6,
        )
        style.map("Chikota.TCombobox", fieldbackground=[("readonly", CARD)])

    def build_menu(self) -> None:
        menu = tk.Menu(
            self.root,
            tearoff=False,
            bg=CARD,
            fg=INK,
            activebackground=AMBER,
            activeforeground="#17120c",
        )
        menu.add_command(label="add bookmark…", command=self.add_bookmark_dialog)
        menu.add_command(label="new collection…", command=self.add_category_dialog)
        menu.add_command(label="refresh", command=self.refresh)
        menu.add_command(label="connection…", command=self.configure_connection)
        menu.add_separator()
        menu.add_command(label="quit", command=self.close)
        self.root.bind("<Button-3>", lambda event: menu.tk_popup(event.x_root, event.y_root))

    def place_window(self) -> None:
        geometry = self.config.get("geometry")
        if isinstance(geometry, str) and "x" in geometry:
            self.root.geometry(geometry)
            return
        width, height = 420, 520
        x = max(12, self.root.winfo_screenwidth() - width - 24)
        y = max(12, self.root.winfo_screenheight() - height - 64)
        self.root.geometry(f"{width}x{height}+{x}+{y}")

    def remember_geometry(self, _event=None) -> None:
        if self.geometry_job:
            self.root.after_cancel(self.geometry_job)
        self.geometry_job = self.root.after(350, self.save_geometry)

    def save_geometry(self) -> None:
        self.geometry_job = None
        if self.root.state() == "normal":
            self.config["geometry"] = self.root.geometry()
            write_private_json(CONFIG_FILE, self.config)

    def start_drag(self, event) -> None:
        self.drag_origin = (event.x_root - self.root.winfo_x(), event.y_root - self.root.winfo_y())

    def drag(self, event) -> None:
        if self.drag_origin:
            self.root.geometry(
                f"+{event.x_root - self.drag_origin[0]}+{event.y_root - self.drag_origin[1]}"
            )

    def close(self) -> None:
        self.save_geometry()
        self.root.destroy()

    def configure_connection(self) -> None:
        dialog = self.dialog("connect chikota")
        tk.Label(dialog, text="chikota address", bg=PANEL, fg=MUTED).pack(anchor="w", padx=18, pady=(18, 5))
        server = self.entry(dialog)
        server.insert(0, str(self.config.get("server", "")))
        server.pack(fill="x", padx=18)
        tk.Label(dialog, text="connection code", bg=PANEL, fg=MUTED).pack(anchor="w", padx=18, pady=(14, 5))
        token = self.entry(dialog, show="•")
        token.insert(0, self.token)
        token.pack(fill="x", padx=18)

        def connect() -> None:
            address = server.get().strip().rstrip("/")
            connection_token = token.get().strip()
            if not address.startswith(("http://", "https://")) or not connection_token:
                messagebox.showerror("chikota", "enter a valid address and connection code.", parent=dialog)
                return
            self.config["server"] = address
            save_token(self.config, connection_token)
            write_private_json(CONFIG_FILE, self.config)
            self.token = connection_token
            dialog.destroy()
            self.refresh()

        self.dialog_actions(dialog, connect, "connect")
        server.focus_set()

    def dialog(self, title: str) -> tk.Toplevel:
        dialog = tk.Toplevel(self.root)
        dialog.title(title)
        dialog.configure(bg=PANEL)
        dialog.resizable(False, False)
        dialog.transient(self.root)
        dialog.grab_set()
        dialog.geometry("380x310")
        return dialog

    def entry(self, parent, show=None) -> tk.Entry:
        return tk.Entry(
            parent,
            bg=CARD,
            fg=INK,
            insertbackground=INK,
            relief="flat",
            highlightthickness=1,
            highlightbackground=LINE,
            highlightcolor=AMBER,
            font=("Sans", 10),
            show=show,
        )

    def dialog_actions(self, dialog, action, label: str) -> None:
        row = tk.Frame(dialog, bg=PANEL)
        row.pack(side="bottom", fill="x", padx=18, pady=18)
        self.button(row, "cancel", dialog.destroy, quiet=True).pack(side="right")
        self.button(row, label, action).pack(side="right", padx=(0, 8))

    def add_bookmark_dialog(self) -> None:
        if not self.require_connection():
            return
        dialog = self.dialog("add bookmark")
        fields = []
        for label in ("url", "title"):
            tk.Label(dialog, text=label, bg=PANEL, fg=MUTED).pack(anchor="w", padx=18, pady=(15 if not fields else 12, 5))
            field = self.entry(dialog)
            field.pack(fill="x", padx=18)
            fields.append(field)
        tk.Label(dialog, text="collection", bg=PANEL, fg=MUTED).pack(anchor="w", padx=18, pady=(12, 5))
        choices = ["none"] + [str(category.get("name", "untitled")) for category in self.categories]
        collection = ttk.Combobox(dialog, values=choices, state="readonly", style="Chikota.TCombobox")
        collection.set("none")
        collection.pack(fill="x", padx=18)

        def add() -> None:
            url, title = (field.get().strip() for field in fields)
            if not title:
                title = urllib.parse.urlparse(url).netloc or url
            category_id = None
            if collection.current() > 0:
                category_id = self.categories[collection.current() - 1].get("id")
            self.mutate("POST", {"url": url, "title": title, "categoryId": category_id}, dialog)

        self.dialog_actions(dialog, add, "add")
        fields[0].focus_set()

    def add_category_dialog(self) -> None:
        if not self.require_connection():
            return
        dialog = self.dialog("new collection")
        dialog.geometry("360x175")
        tk.Label(dialog, text="collection name", bg=PANEL, fg=MUTED).pack(anchor="w", padx=18, pady=(18, 5))
        name = self.entry(dialog)
        name.pack(fill="x", padx=18)
        self.dialog_actions(dialog, lambda: self.mutate("POST", {"type": "category", "name": name.get().strip()}, dialog), "create")
        name.focus_set()

    def require_connection(self) -> bool:
        if self.config.get("server") and self.token:
            return True
        self.configure_connection()
        return False

    def endpoint(self) -> str:
        return f"{str(self.config.get('server', '')).rstrip('/')}/api/widget"

    def api_request(self, method="GET", body=None):
        data = json.dumps(body).encode("utf-8") if body is not None else None
        request = urllib.request.Request(
            self.endpoint(),
            data=data,
            method=method,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            try:
                payload = json.load(exc)
                detail = payload.get("message") or payload.get("error")
            except (ValueError, AttributeError):
                detail = None
            raise RuntimeError(detail or f"request failed ({exc.code})") from exc

    def mutate(self, method: str, body: dict, dialog=None) -> None:
        self.status.set("syncing")
        self.render()

        def work() -> None:
            try:
                self.api_request(method, body)
                self.root.after(0, lambda: self.mutation_done(dialog))
            except (OSError, ValueError, urllib.error.URLError, RuntimeError) as exc:
                detail = str(exc)
                self.root.after(0, lambda value=detail: self.mutation_failed(value))

        threading.Thread(target=work, daemon=True).start()

    def mutation_done(self, dialog=None) -> None:
        if dialog and dialog.winfo_exists():
            dialog.destroy()
        self.refresh()

    def mutation_failed(self, detail: str) -> None:
        self.status.set("offline")
        self.render()
        messagebox.showerror("chikota", detail or "the change could not be saved.", parent=self.root)

    def refresh(self) -> None:
        if self.refresh_job:
            self.root.after_cancel(self.refresh_job)
            self.refresh_job = None
        if not self.config.get("server") or not self.token:
            self.accept_feed(read_json(CACHE_FILE, {}), False)
            return
        self.status.set("syncing")
        self.render()

        def fetch() -> None:
            try:
                payload = self.api_request()
                write_private_json(CACHE_FILE, payload)
                self.root.after(0, lambda: self.accept_feed(payload, True))
            except (OSError, ValueError, urllib.error.URLError, RuntimeError):
                self.root.after(0, lambda: self.accept_feed(read_json(CACHE_FILE, {}), False))

        threading.Thread(target=fetch, daemon=True).start()

    def accept_feed(self, payload, online: bool) -> None:
        self.items = [item for item in payload.get("items", []) if isinstance(item, dict)] if isinstance(payload, dict) else []
        self.categories = [item for item in payload.get("categories", []) if isinstance(item, dict)] if isinstance(payload, dict) else []
        self.online = online
        self.status.set("online" if online else "offline")
        self.render()
        self.refresh_job = self.root.after(REFRESH_MS, self.refresh)

    def visible_items(self) -> list[dict]:
        items = [item for item in self.items if belongs_on_widget(item)]
        if self.filter_mode.get() == "pinned":
            items = [item for item in items if item.get("isPinned")]
        if self.category_id.get():
            items = [item for item in items if item.get("categoryId") == self.category_id.get()]
        return items

    def choose_mode(self, mode: str) -> None:
        self.filter_mode.set(mode)
        self.render()

    def choose_category(self, _event=None) -> None:
        selected = self.category_name.get()
        category = next((item for item in self.categories if item.get("name") == selected), None)
        self.category_id.set(str(category.get("id")) if category else "")
        self.render()

    def delete_category(self) -> None:
        category_id = self.category_id.get()
        if not category_id:
            return
        name = self.category_name.get()
        if messagebox.askyesno("delete collection", f"Delete “{name}”? Its bookmarks will stay in your library.", parent=self.root):
            self.category_id.set("")
            self.category_name.set("all collections")
            self.mutate("DELETE", {"type": "category", "id": category_id})

    def delete_bookmark(self, item: dict) -> None:
        if messagebox.askyesno("delete bookmark", f"Delete “{item.get('title', 'bookmark')}”?", parent=self.root):
            self.mutate("DELETE", {"type": "bookmark", "id": item.get("id")})

    def toggle_pin(self, item: dict) -> None:
        self.mutate("PATCH", {"id": item.get("id"), "isPinned": not bool(item.get("isPinned"))})

    def button(self, parent, text, command, quiet=False, active=False):
        return tk.Button(
            parent,
            text=text,
            command=command,
            bg=(AMBER if active else PANEL if quiet else CARD),
            fg=("#17120c" if active else MUTED if quiet else INK),
            activebackground=AMBER,
            activeforeground="#17120c",
            relief="flat",
            borderwidth=0,
            padx=9,
            pady=5,
            cursor="hand2",
            font=("Sans", 9, "bold" if active else "normal"),
        )

    def render(self) -> None:
        for child in self.shell.winfo_children():
            child.destroy()

        header = tk.Frame(self.shell, bg=PANEL)
        header.pack(fill="x", pady=(0, 10))
        header.bind("<ButtonPress-1>", self.start_drag)
        header.bind("<B1-Motion>", self.drag)
        if self.header_icon:
            icon = tk.Label(header, image=self.header_icon, bg=PANEL)
            icon.pack(side="left", padx=(0, 8))
            icon.bind("<ButtonPress-1>", self.start_drag)
            icon.bind("<B1-Motion>", self.drag)
        brand = tk.Label(header, text="chikota", bg=PANEL, fg=INK, font=("Sans", 15, "bold"))
        brand.pack(side="left")
        brand.bind("<ButtonPress-1>", self.start_drag)
        brand.bind("<B1-Motion>", self.drag)
        self.button(header, "+", self.add_bookmark_dialog, active=True).pack(side="right")
        color = GREEN if self.status.get() == "online" else AMBER if self.status.get() == "syncing" else MUTED
        tk.Label(header, text=f"●  {self.status.get()}", bg=PANEL, fg=color, font=("Sans", 8)).pack(side="right", padx=(0, 9))

        tabs = tk.Frame(self.shell, bg=PANEL)
        tabs.pack(fill="x", pady=(0, 8))
        for mode, label in (("all", "library"), ("pinned", "pinned")):
            self.button(tabs, label, lambda value=mode: self.choose_mode(value), active=self.filter_mode.get() == mode).pack(side="left", padx=(0, 6))
        self.button(tabs, "+ collection", self.add_category_dialog, quiet=True).pack(side="right")

        collection_row = tk.Frame(self.shell, bg=PANEL)
        collection_row.pack(fill="x", pady=(0, 10))
        names = ["all collections"] + [str(category.get("name", "untitled")) for category in self.categories]
        if self.category_name.get() not in names:
            self.category_name.set("all collections")
            self.category_id.set("")
        chooser = ttk.Combobox(collection_row, textvariable=self.category_name, values=names, state="readonly", style="Chikota.TCombobox")
        chooser.pack(side="left", fill="x", expand=True)
        chooser.bind("<<ComboboxSelected>>", self.choose_category)
        if self.category_id.get():
            self.button(collection_row, "delete", self.delete_category, quiet=True).pack(side="right", padx=(7, 0))

        count = len(self.visible_items())
        tk.Label(self.shell, text=f"{count} bookmark{'s' if count != 1 else ''}", bg=PANEL, fg=MUTED, font=("Sans", 8)).pack(anchor="w", pady=(0, 6))

        canvas = tk.Canvas(self.shell, bg=PANEL, highlightthickness=0, bd=0)
        scrollbar = ttk.Scrollbar(self.shell, orient="vertical", command=canvas.yview)
        content = tk.Frame(canvas, bg=PANEL)
        window = canvas.create_window((0, 0), window=content, anchor="nw")
        content.bind("<Configure>", lambda _event: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.bind("<Configure>", lambda event: canvas.itemconfigure(window, width=event.width))
        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        canvas.bind_all("<MouseWheel>", lambda event: canvas.yview_scroll(int(-event.delta / 120), "units"))

        items = self.visible_items()
        if not items:
            tk.Label(
                content,
                text="nothing here yet\nadd a bookmark or choose another collection",
                bg=PANEL,
                fg=MUTED,
                justify="center",
                font=("Sans", 10),
                pady=36,
            ).pack(fill="x")
            return

        category_names = {item.get("id"): item.get("name") for item in self.categories}
        for item in items:
            row = tk.Frame(content, bg=CARD, padx=10, pady=9)
            row.pack(fill="x", pady=(0, 6))
            title_row = tk.Frame(row, bg=CARD)
            title_row.pack(fill="x")
            host = urllib.parse.urlparse(str(item.get("url", ""))).netloc.removeprefix("www.")
            initial = (host or str(item.get("title", "?"))).strip()[:1].upper()
            tk.Label(title_row, text=initial, bg="#33291f", fg=AMBER, width=2, height=1, font=("Sans", 10, "bold")).pack(side="left", padx=(0, 9))
            label = tk.Label(title_row, text=str(item.get("title") or host or "bookmark"), bg=CARD, fg=INK, anchor="w", font=("Sans", 10, "bold"), cursor="hand2")
            label.pack(side="left", fill="x", expand=True)
            self.button(title_row, "×", lambda value=item: self.delete_bookmark(value), quiet=True).pack(side="right")
            self.button(title_row, "●" if item.get("isPinned") else "○", lambda value=item: self.toggle_pin(value), quiet=True).pack(side="right")
            meta = host
            category = category_names.get(item.get("categoryId"))
            if category:
                meta = f"{host}  ·  {category}"
            meta_label = tk.Label(row, text=meta, bg=CARD, fg=MUTED, anchor="w", font=("Sans", 8), cursor="hand2")
            meta_label.pack(fill="x", padx=(31, 0), pady=(3, 0))
            for widget in (label, meta_label):
                widget.bind("<Button-1>", lambda _event, url=item.get("url"): url and webbrowser.open(str(url)))

    def run(self) -> None:
        self.root.mainloop()


if __name__ == "__main__":
    ChikotaWidget().run()

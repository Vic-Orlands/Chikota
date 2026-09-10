#!/usr/bin/env python3
"""Small, dependency-light Chikota desktop widget for Linux."""

from __future__ import annotations

import json
import os
import subprocess
import threading
import urllib.error
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


def belongs_on_widget(item: dict) -> bool:
    if item.get("widgetEnabled") or item.get("isPinned"):
        return True
    now = datetime.now(timezone.utc)
    for key, future in (("reminderAt", True), ("openedAt", False)):
        raw = item.get(key)
        if not raw:
            continue
        try:
            value = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
            if (future and value > now) or (
                not future and (now - value).total_seconds() < 604800
            ):
                return True
        except ValueError:
            continue
    return False


class ChikotaWidget:
    def __init__(self) -> None:
        self.root = tk.Tk(className="Chikota")
        self.root.title("chikota desktop widget")
        self.root.configure(bg="#f8f8f8")
        self.root.attributes("-topmost", True)
        self.root.resizable(False, False)
        try:
            self.root.attributes("-type", "utility")
        except tk.TclError:
            pass

        self.config = read_json(CONFIG_FILE, {})
        self.token = load_token(self.config)
        self.items: list[dict] = []
        self.online = False
        self.drag_origin: tuple[int, int] | None = None
        self.status = tk.StringVar(value="offline")
        self.frame = tk.Frame(
            self.root,
            bg="#ffffff",
            highlightbackground="#dfdfdf",
            highlightthickness=1,
            padx=14,
            pady=12,
        )
        self.frame.pack(fill="both", expand=True)
        self.frame.bind("<ButtonPress-1>", self.start_drag)
        self.frame.bind("<B1-Motion>", self.drag)
        self.build_menu()
        self.place_window()

        if not self.config.get("server") or not self.token:
            self.root.after(120, self.configure_connection)
        self.render()
        self.refresh()

    def build_menu(self) -> None:
        menu = tk.Menu(self.root, tearoff=False)
        menu.add_command(label="refresh", command=self.refresh)
        menu.add_command(label="connection…", command=self.configure_connection)
        menu.add_separator()
        menu.add_command(label="quit", command=self.root.destroy)
        self.root.bind("<Button-3>", lambda event: menu.tk_popup(event.x_root, event.y_root))

    def place_window(self) -> None:
        self.root.update_idletasks()
        width, height = 360, 330
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        x = max(12, screen_width - width - 24)
        y = max(12, screen_height - height - 64)
        self.root.geometry(f"{width}x{height}+{x}+{y}")

    def start_drag(self, event) -> None:
        self.drag_origin = (event.x_root - self.root.winfo_x(), event.y_root - self.root.winfo_y())

    def drag(self, event) -> None:
        if not self.drag_origin:
            return
        x = event.x_root - self.drag_origin[0]
        y = event.y_root - self.drag_origin[1]
        self.root.geometry(f"+{x}+{y}")

    def configure_connection(self) -> None:
        dialog = tk.Toplevel(self.root)
        dialog.title("connect chikota")
        dialog.configure(bg="#ffffff")
        dialog.resizable(False, False)
        dialog.transient(self.root)
        dialog.grab_set()

        ttk.Label(dialog, text="chikota address").grid(row=0, column=0, sticky="w", padx=16, pady=(16, 5))
        server = ttk.Entry(dialog, width=46)
        server.insert(0, str(self.config.get("server", "")))
        server.grid(row=1, column=0, padx=16)
        ttk.Label(dialog, text="connection code").grid(row=2, column=0, sticky="w", padx=16, pady=(14, 5))
        token = ttk.Entry(dialog, width=46, show="•")
        token.insert(0, self.token)
        token.grid(row=3, column=0, padx=16)

        actions = ttk.Frame(dialog)
        actions.grid(row=4, column=0, sticky="e", padx=16, pady=16)
        ttk.Button(actions, text="cancel", command=dialog.destroy).pack(side="left", padx=(0, 8))

        def connect() -> None:
            address = server.get().strip().rstrip("/")
            connection_token = token.get().strip()
            if not address.startswith(("http://", "https://")) or not connection_token:
                messagebox.showerror("chikota", "enter a valid chikota address and connection code.", parent=dialog)
                return
            self.config["server"] = address
            save_token(self.config, connection_token)
            write_private_json(CONFIG_FILE, self.config)
            self.token = connection_token
            dialog.destroy()
            self.refresh()

        ttk.Button(actions, text="connect", command=connect).pack(side="left")
        server.focus_set()

    def refresh(self) -> None:
        server = str(self.config.get("server", "")).rstrip("/")
        if not server or not self.token:
            cached = read_json(CACHE_FILE, {})
            self.items = cached.get("items", []) if isinstance(cached, dict) else []
            self.render()
            self.root.after(REFRESH_MS, self.refresh)
            return
        self.status.set("syncing")
        self.render()

        def fetch() -> None:
            try:
                request = urllib.request.Request(
                    f"{server}/api/widget",
                    headers={"Authorization": f"Bearer {self.token}"},
                )
                with urllib.request.urlopen(request, timeout=15) as response:
                    payload = json.load(response)
                write_private_json(CACHE_FILE, payload)
                self.root.after(0, lambda: self.accept_feed(payload, True))
            except (OSError, ValueError, urllib.error.URLError):
                cached = read_json(CACHE_FILE, {})
                self.root.after(0, lambda: self.accept_feed(cached, False))

        threading.Thread(target=fetch, daemon=True).start()

    def accept_feed(self, payload, online: bool) -> None:
        raw_items = payload.get("items", []) if isinstance(payload, dict) else []
        self.items = [item for item in raw_items if isinstance(item, dict) and belongs_on_widget(item)][:6]
        self.online = online
        self.status.set("online" if online else "offline")
        self.render()
        self.root.after(REFRESH_MS, self.refresh)

    def render(self) -> None:
        for child in self.frame.winfo_children():
            child.destroy()
        header = tk.Frame(self.frame, bg="#ffffff")
        header.pack(fill="x", pady=(0, 10))
        tk.Label(header, text="chikota", bg="#ffffff", fg="#242424", font=("Sans", 13, "bold")).pack(side="left")
        color = "#2e9b52" if self.status.get() == "online" else "#d48a16" if self.status.get() == "syncing" else "#8a8a8a"
        tk.Label(header, text=f"●  {self.status.get()}", bg="#ffffff", fg=color, font=("Sans", 9)).pack(side="right")

        if not self.items:
            tk.Label(
                self.frame,
                text="no widget bookmarks yet.\npin or add a bookmark from chikota.",
                bg="#ffffff",
                fg="#777777",
                justify="center",
                font=("Sans", 10),
            ).pack(expand=True)
            return
        for item in self.items:
            row = tk.Frame(self.frame, bg="#ffffff", cursor="hand2")
            row.pack(fill="x", pady=2)
            marker = "●" if item.get("reminderAt") else "◆" if item.get("isPinned") else "■"
            tk.Label(row, text=marker, bg="#ffffff", fg="#777777", width=2).pack(side="left")
            label = tk.Label(
                row,
                text=str(item.get("title") or item.get("url") or "bookmark"),
                bg="#ffffff",
                fg="#292929",
                anchor="w",
                font=("Sans", 10),
            )
            label.pack(side="left", fill="x", expand=True, padx=(6, 0), pady=5)
            for widget in (row, label):
                widget.bind("<Button-1>", lambda _event, url=item.get("url"): url and webbrowser.open(str(url)))

    def run(self) -> None:
        self.root.mainloop()


if __name__ == "__main__":
    ChikotaWidget().run()

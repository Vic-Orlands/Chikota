#!/usr/bin/env bash
set -euo pipefail

install_root="${XDG_DATA_HOME:-$HOME/.local/share}/chikota"
bin_root="$HOME/.local/bin"
applications_root="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
autostart_root="${XDG_CONFIG_HOME:-$HOME/.config}/autostart"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python 3 is required. install it with your distribution's package manager."
  exit 1
fi
if ! python3 -c 'import tkinter' >/dev/null 2>&1; then
  echo "python tkinter is required (often packaged as python3-tk or python3-tkinter)."
  exit 1
fi

mkdir -p "$install_root" "$bin_root" "$applications_root" "$autostart_root"
install -m 0755 chikota_widget.py "$install_root/chikota_widget.py"
install -m 0755 run-chikota-widget "$bin_root/chikota-widget"
sed "s|@BIN_ROOT@|$bin_root|g" chikota-widget.desktop > "$applications_root/chikota-widget.desktop"
chmod 0644 "$applications_root/chikota-widget.desktop"
cp "$applications_root/chikota-widget.desktop" "$autostart_root/chikota-widget.desktop"

echo "chikota widget installed. launch 'chikota desktop widget' from your applications menu."

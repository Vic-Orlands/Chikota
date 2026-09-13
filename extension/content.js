(() => {
  let reminder;
  let dismissTimer;
  document.addEventListener('copy', (event) => {
    if (!event.isTrusted) return;
    const active = document.activeElement;
    const selected =
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement
        ? active.value.slice(
            active.selectionStart || 0,
            active.selectionEnd || 0
          )
        : window.getSelection()?.toString();
    let url;
    try {
      url = new URL((selected || '').trim());
      if (!['http:', 'https:'].includes(url.protocol)) return;
    } catch {
      return;
    }
    reminder?.remove();
    clearTimeout(dismissTimer);
    reminder = document.createElement('div');
    const shadow = reminder.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 2147483647; width: min(420px, calc(100vw - 24px)); color-scheme: light dark; }
      .reminder { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: 1px solid light-dark(#e6e6e6, #3b3b3b); border-radius: 10px; background: light-dark(#fff, #171615); color: light-dark(#292929, #f1f0ee); box-shadow: 0 8px 30px #0002; font: 400 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; animation: enter 220ms ease-out; }
      button { font: inherit; color: inherit; border: 0; background: transparent; cursor: pointer; padding: 4px; border-radius: 4px; }
      .save { margin-left: auto; }
      button:focus-visible { outline: 1px solid currentColor; }
      @keyframes enter { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      @media (prefers-reduced-motion: reduce) { .reminder { animation: none; } }
    `;
    const box = document.createElement('div');
    box.className = 'reminder';
    box.setAttribute('role', 'status');
    const label = document.createElement('span');
    label.textContent = 'copied';
    const icon = document.createElement('span');
    icon.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="5" width="14" height="17" rx="2"/><rect x="8" y="2" width="8" height="6" rx="2" fill="currentColor" stroke="none"/></svg>';
    icon.setAttribute('aria-hidden', 'true');
    const save = document.createElement('button');
    save.className = 'save';
    save.textContent = 'save to chikota ↗';
    save.onclick = async () => {
      save.disabled = true;
      try {
        const result = await chrome.runtime.sendMessage({
          type: 'save-copied-link',
          url: url.href
        });
        if (!result?.ok) throw new Error('could not open chikota');
        reminder?.remove();
      } catch {
        save.disabled = false;
        save.textContent = 'try again ↗';
      }
    };
    const close = document.createElement('button');
    close.textContent = '×';
    close.setAttribute('aria-label', 'dismiss copied link reminder');
    close.onclick = () => reminder?.remove();
    box.append(icon, label, save, close);
    shadow.append(style, box);
    document.documentElement.append(reminder);
    dismissTimer = setTimeout(() => reminder?.remove(), 8000);
  });
})();

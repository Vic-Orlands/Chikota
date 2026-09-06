const input = document.querySelector('#url');
const status = document.querySelector('#status');
chrome.storage.local.get('chikotaUrl').then(({ chikotaUrl }) => {
  input.value = chikotaUrl || 'http://localhost:5173';
});
document.querySelector('form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const url = new URL(input.value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    await chrome.storage.local.set({ chikotaUrl: url.origin });
    status.textContent =
      'Address saved. Right-click a website to save your first link.';
  } catch {
    status.textContent = 'Enter a valid http or https address.';
  }
});

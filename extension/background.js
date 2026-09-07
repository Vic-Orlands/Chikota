const fallback = 'http://localhost:5173';
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: 'save-chikota',
    title: 'save to chikota',
    contexts: ['page', 'link', 'selection', 'image', 'video', 'audio']
  });
  chrome.contextMenus.create({
    id: 'open-chikota',
    title: 'open chikota',
    contexts: ['all']
  });
});
async function appUrl() {
  const { chikotaUrl = fallback } =
    await chrome.storage.local.get('chikotaUrl');
  const url = new URL(chikotaUrl);
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('invalid chikota address');
  return new URL('/', url);
}
async function openApp(source, title) {
  const url = await appUrl();
  if (source) {
    const target = new URL(source);
    if (!['http:', 'https:'].includes(target.protocol)) {
      await chrome.action.setBadgeText({ text: '!' });
      await chrome.action.setTitle({
        title: 'this browser page cannot be saved. open a website first.'
      });
      return;
    }
    url.searchParams.set('save', target.href);
    url.searchParams.set('title', title || target.hostname);
  }
  await chrome.tabs.create({ url: url.href });
  await chrome.action.setBadgeText({ text: '' });
}
function report(error) {
  console.error(error);
  void chrome.action.setBadgeText({ text: '!' });
  void chrome.action.setTitle({
    title: 'could not open chikota. check the address in extension options.'
  });
}
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'open-chikota') void openApp().catch(report);
  if (info.menuItemId === 'save-chikota')
    void openApp(
      info.linkUrl || info.pageUrl || tab?.url,
      info.linkUrl ? undefined : tab?.title
    ).catch(report);
});
chrome.action.onClicked.addListener((tab) => {
  void openApp(tab.url, tab.title).catch(report);
});

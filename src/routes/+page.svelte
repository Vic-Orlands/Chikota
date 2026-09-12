<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { DropdownMenu } from 'bits-ui';
  import { replaceState } from '$app/navigation';
  import { bookmarks } from '$lib/stores/bookmarks';
  import {
    categories,
    addCategory,
    deleteCategory,
    renameCategory
  } from '$lib/stores/categories';
  import { themeStore, type Theme } from '$lib/stores/theme.svelte';
  import { createFlagsStore } from '$lib/stores/flags.svelte';
  import {
    createRemindersStore,
    formatReminder,
    reminderInputValue,
    type ReminderStatus
  } from '$lib/stores/reminders.svelte';
  import { setLibraryContext } from '$lib/library-context.svelte';
  import {
    handleContextKeys,
    handleLibraryKeyboard
  } from '$lib/library-keyboard';
  import {
    bookmarkIdsInRect,
    collectBookmarkTargets,
    type DragTarget
  } from '$lib/drag-select';
  import { domain, safeUrl } from '$lib/links';
  import type { Bookmark } from '$lib/types';
  import { authClient } from '$lib/auth-client';
  import { toast } from 'svelte-sonner';
  import EmptyMono from '$lib/components/EmptyMono.svelte';
  import WelcomeGuide from '$lib/components/WelcomeGuide.svelte';
  import LandingPage from '$lib/components/LandingPage.svelte';
  import ContextMenu from '$lib/components/ContextMenu.svelte';
  import SiteFavicon from '$lib/components/SiteFavicon.svelte';
  import SlidePanel from '$lib/components/SlidePanel.svelte';
  import WidgetConnectBlock from '$lib/components/WidgetConnectBlock.svelte';
  import ReminderForm from '$lib/components/ReminderForm.svelte';
  import BookmarkDateGroup from '$lib/components/BookmarkDateGroup.svelte';
  import BookmarkForm from '$lib/components/BookmarkForm.svelte';
  import CollectionForm from '$lib/components/CollectionForm.svelte';
  import CollectionGrid from '$lib/components/CollectionGrid.svelte';
  import CommandPalette from '$lib/components/CommandPalette.svelte';
  import ConfirmDelete from '$lib/components/ConfirmDelete.svelte';
  import LibraryDialog, {
    type LibraryModal
  } from '$lib/components/LibraryDialog.svelte';
  import SelectionToolbar, {
    type ToolbarAction
  } from '$lib/components/SelectionToolbar.svelte';
  import SettingsPanel from '$lib/components/SettingsPanel.svelte';
  import { useSlidePanel } from '$lib/useSlidePanel.svelte';
  import { type MenuEntry, type MenuItem } from '$lib/menu';
  import ActionBell from '$lib/components/icons/ActionBell.svelte';
  import ActionEdit from '$lib/components/icons/ActionEdit.svelte';
  import ActionRead from '$lib/components/icons/ActionRead.svelte';
  import ActionSettings from '$lib/components/icons/ActionSettings.svelte';
  import BrowserExtension from '$lib/components/icons/BrowserExtension.svelte';
  import CollapseAll from '$lib/components/icons/CollapseAll.svelte';
  import DeleteTrash from '$lib/components/icons/DeleteTrash.svelte';
  import GuestUser from '$lib/components/icons/GuestUser.svelte';
  import GuideLauncher from '$lib/components/icons/GuideLauncher.svelte';
  import MacWidgetLauncher from '$lib/components/icons/MacWidgetLauncher.svelte';
  import UbuntuWidgetLauncher from '$lib/components/icons/UbuntuWidgetLauncher.svelte';
  import SearchGrid from '$lib/components/icons/SearchGrid.svelte';
  import SelectAll from '$lib/components/icons/SelectAll.svelte';
  import SelectList from '$lib/components/icons/SelectList.svelte';
  import {
    MixerVertical,
    Plus,
    Bookmark as BookmarkIcon,
    BookmarkFilled,
    Book,
    FileTray,
    Pin,
    CheckCircled,
    ArrowUpRight,
    ArrowRight,
    Cross2,
    Download,
    ChevronDown,
    LogOut,
    BellOff
  } from '$lib/components/icons/radix';

  type SettingsTab = 'appearance' | 'reminders' | 'about';
  type DesktopPlatform = 'mac' | 'linux' | null;

  let { data } = $props();
  let guestView = $state<'pending' | 'landing' | 'library'>('pending');
  let view = $derived(data.session ? 'library' : guestView);
  let section = $state('all');
  let openedTabWidth = $state(0);
  let bookmarksTabWidth = $state(0);
  let ready = $state(false);
  let guideOpen = $state(false);
  const guideKey = 'chikota-welcome-v1';
  function dismissGuide() {
    guideOpen = false;
    try {
      localStorage.setItem(guideKey, 'seen');
    } catch {}
  }
  function enterLibrary() {
    try {
      localStorage.setItem('chikota-entered', '1');
    } catch {}
    guestView = 'library';
    revealPlatformCallout();
    if (!ready) void initialize().then(() => reminders.check(ready));
  }
  let loadError = $state('');
  let saving = $state(false);
  let selected = $state<string[]>([]);
  let selectedCollections = $state<string[]>([]);
  let listToolsOpen = $state(false);
  let listToolsTrigger = $state<HTMLButtonElement>();
  let selectMode = $state(false);
  let bookmarkSelectionAnchor = $state<string | null>(null);
  let collectionSelectionAnchor = $state<string | null>(null);
  let modal = $state<LibraryModal>(null);
  let dialog = $state<HTMLDialogElement>();
  let readingColumn = $state<HTMLDivElement>();
  let searchInput = $state<HTMLInputElement>();
  let commandTrigger = $state<HTMLButtonElement>();
  let commandPosition = $state({ top: 0, left: 0, width: 0 });
  const extensionPanel = useSlidePanel();
  const widgetPanel = useSlidePanel();
  const linuxPanel = useSlidePanel();
  const remindersPanel = useSlidePanel();
  let detectedPlatform = $state<DesktopPlatform>(null);
  let platformCalloutOpen = $state(false);
  let platformCalloutTimer: number | undefined;
  let widgetToken = $state('');
  let widgetTokenBusy = $state(false);
  let widgetTokenError = $state('');
  let copiedTargets = $state<string[]>([]);
  const copyResetTimers: Record<string, number> = {};
  let editing = $state<Bookmark | null>(null);
  let url = $state('');
  let title = $state('');
  let bookmarkSummary = $state('');
  let collection = $state('');
  let collectionName = $state('');
  let editingCollectionId = $state<string | null>(null);
  let collectionDeleteConfirm = $state(false);
  let commandQuery = $state('');
  let settingsTab = $state<SettingsTab>('appearance');
  let reminderTarget = $state<Bookmark | null>(null);
  let reminderWhen = $state('');
  let reminderEmail = $state('');
  let reminderPopover = $state<{ x: number; y: number } | null>(null);
  let reminderPopoverPanel = $state<HTMLDivElement>();
  let formError = $state('');
  let context = $state<{ x: number; y: number; bookmark?: Bookmark } | null>(
    null
  );
  let contextPanel = $state<HTMLDivElement>();
  let menuTrigger: HTMLElement | null = null;
  let drag = $state<{
    x: number;
    y: number;
    endX: number;
    endY: number;
  } | null>(null);
  let dragBase: string[] = [];
  let dragTargets: DragTarget[] = [];
  let dragging = $state(false);
  let collectionsOpen = $state(true);
  let pinnedOpen = $state(true);
  let collapsedGroups = $state<string[]>([]);
  const flags = createFlagsStore({
    scopeKey: () => data.session?.user.id || 'local',
    signedIn: () => Boolean(data.session),
    persistRemote: (ids, key, value) =>
      Promise.all(
        ids.map((id) =>
          bookmarks.updateBookmark(id, {
            [key === 'pinned' ? 'isPinned' : 'isRead']: value
          })
        )
      ).then(() => undefined),
    persistOpened: (id, openedAt) => bookmarks.updateBookmark(id, { openedAt }),
    onError: (message) => toast.error(message),
    onChanged: () => closeContext()
  });
  const reminders = createRemindersStore({
    scopeKey: () => data.session?.user.id || 'local',
    getBookmarks: () => $bookmarks,
    signedIn: () => Boolean(data.session),
    updateBookmark: (id, values) => bookmarks.updateBookmark(id, values),
    onError: (message) => toast.error(message),
    onSuccess: (message) => toast.success(message)
  });
  let groups = $derived.by(() => {
    const grouped = new Map<string, Bookmark[]>();
    for (const bookmark of visible) {
      const date = bookmark.createdAt.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      grouped.set(date, [...(grouped.get(date) || []), bookmark]);
    }
    return Array.from(grouped, ([date, items]) => ({ date, items }));
  });
  function toggleGroup(date: string) {
    collapsedGroups = collapsedGroups.includes(date)
      ? collapsedGroups.filter((value) => value !== date)
      : [...collapsedGroups, date];
  }
  const themes: { id: Theme; name: string; description: string }[] = [
    { id: 'light', name: 'paper', description: 'white & graphite' },
    { id: 'forest', name: 'forest', description: 'pine & soft silver' },
    { id: 'ember', name: 'ember', description: 'obsidian & burnt orange' }
  ];
  let commandBookmarks = $derived(
    $bookmarks
      .filter((bookmark) =>
        `${bookmark.title} ${bookmark.url}`
          .toLowerCase()
          .includes(commandQuery.toLowerCase())
      )
      .slice(0, 6)
  );
  let userCollections = $derived(
    $categories.filter((category) => category.id !== 'all')
  );
  let bookmarkCountByCategory = $derived.by(() => {
    const counts = new Map<string, number>();
    for (const bookmark of $bookmarks) {
      if (!bookmark.categoryId) continue;
      counts.set(
        bookmark.categoryId,
        (counts.get(bookmark.categoryId) || 0) + 1
      );
    }
    return counts;
  });
  let visible = $derived(
    $bookmarks
      .filter((bookmark) => {
        const matchesSection =
          section === 'all' ||
          (section === 'opened'
            ? flags.openedWithinSevenDays(bookmark.id)
            : section === 'pinned'
              ? flags.flags[bookmark.id]?.pinned
              : section === 'read'
                ? flags.flags[bookmark.id]?.read
                : bookmark.categoryId === section);
        return matchesSection;
      })
      .toSorted((a, b) =>
        section === 'opened'
          ? Date.parse(flags.flags[b.id]?.openedAt || '') -
            Date.parse(flags.flags[a.id]?.openedAt || '')
          : +b.createdAt - +a.createdAt
      )
  );
  let pinned = $derived(
    $bookmarks.filter((bookmark) => flags.flags[bookmark.id]?.pinned)
  );
  let reminderBookmarks = $derived(
    $bookmarks
      .filter((bookmark) => bookmark.reminderAt)
      .toSorted(
        (a, b) =>
          +(a.reminderAt || new Date(0)) - +(b.reminderAt || new Date(0))
      )
  );
  let reminderStatusById = $derived.by(() => {
    const map = new Map<string, ReminderStatus>();
    for (const bookmark of $bookmarks) {
      map.set(bookmark.id, reminders.statusFor(bookmark));
    }
    return map;
  });
  let upcomingReminderCount = $derived(
    reminderBookmarks.filter(
      (bookmark) =>
        reminderStatusById.get(bookmark.id) === 'active' &&
        +(bookmark.reminderAt || new Date(0)) > reminders.currentTime
    ).length
  );
  let heading = $derived(
    section === 'all'
      ? 'bookmarks'
      : section === 'opened'
        ? 'opened'
        : section === 'pinned'
          ? 'pinned'
          : section === 'read'
            ? 'finished reading'
            : $categories.find((category) => category.id === section)?.name ||
              'collection'
  );
  let selectionPinned = $derived(
    selected.length > 0 && selected.every((id) => flags.flags[id]?.pinned)
  );
  let collectionToolbarActions = $derived.by((): ToolbarAction[] => [
    {
      id: 'delete',
      label: 'delete selected collections',
      text: 'delete',
      icon: DeleteTrash,
      run: () => void openModal('delete-collections')
    },
    {
      id: 'clear',
      label: 'clear collection selection',
      icon: Cross2,
      run: () => {
        selectedCollections = [];
        collectionSelectionAnchor = null;
      }
    }
  ]);
  let bookmarkToolbarActions = $derived.by((): ToolbarAction[] => [
    {
      id: 'select-all',
      label: 'select all bookmarks',
      title: 'select all',
      icon: SelectAll,
      run: () => (selected = visible.map((bookmark) => bookmark.id))
    },
    {
      id: 'pin',
      label: selectionPinned
        ? 'unpin selected bookmarks'
        : 'pin selected bookmarks',
      title: selectionPinned ? 'unpin' : 'pin',
      icon: Pin,
      run: () => {
        flags.setFlags(selected, 'pinned', !selectionPinned);
        selected = [];
        selectMode = false;
        bookmarkSelectionAnchor = null;
      }
    },
    {
      id: 'read',
      label: 'mark selected bookmarks as read',
      title: 'mark as read',
      icon: ActionRead,
      run: () => {
        flags.setFlags(selected, 'read', true);
        selected = [];
        selectMode = false;
        bookmarkSelectionAnchor = null;
      }
    },
    {
      id: 'delete',
      label: 'delete selected bookmarks',
      title: 'delete',
      icon: DeleteTrash,
      run: () => void openModal('delete')
    }
  ]);
  onMount(() => {
    const navigatorWithPlatform = navigator as Navigator & {
      userAgentData?: { platform?: string };
    };
    const clientPlatform =
      navigatorWithPlatform.userAgentData?.platform ||
      navigator.platform ||
      navigator.userAgent;
    const isMobileDevice = /android|iphone|ipad|ipod|mobile/i.test(
      navigator.userAgent
    );
    detectedPlatform = isMobileDevice
      ? null
      : /mac/i.test(clientPlatform)
        ? 'mac'
        : /linux|x11/i.test(clientPlatform)
          ? 'linux'
          : null;
    reminders.loadFromStorage();
    const incomingSave = Boolean(
      new URLSearchParams(location.search).get('save')
    );
    let shouldOpen = Boolean(data.session) || incomingSave;
    if (!shouldOpen) {
      try {
        shouldOpen = localStorage.getItem('chikota-entered') === '1';
        if (!shouldOpen) {
          const saved = localStorage.getItem('chikota-bookmarks');
          const parsed = saved ? JSON.parse(saved) : [];
          shouldOpen = Array.isArray(parsed) && parsed.length > 0;
        }
      } catch {
        shouldOpen = false;
      }
    }
    if (shouldOpen) {
      guestView = 'library';
      revealPlatformCallout();
      void initialize().then(() => reminders.check(ready));
    } else {
      guestView = 'landing';
    }
    try {
      guideOpen = localStorage.getItem(guideKey) !== 'seen';
    } catch {
      guideOpen = true;
    }
    const reminderTimer = window.setInterval(() => {
      reminders.tick();
      void reminders.check(ready);
    }, 15_000);
    const refresh = (event: StorageEvent) => {
      if (event.key === 'chikota-bookmarks' && !data.session)
        void bookmarks.init(false).catch((error) => toast.error(error.message));
      flags.applyStorageEvent(event);
      reminders.applyStorageEvent(event);
    };
    window.addEventListener('storage', refresh);
    return () => {
      window.clearInterval(reminderTimer);
      window.removeEventListener('storage', refresh);
      for (const timer of Object.values(copyResetTimers))
        window.clearTimeout(timer);
      if (platformCalloutTimer) window.clearTimeout(platformCalloutTimer);
      extensionPanel.destroy();
      widgetPanel.destroy();
      linuxPanel.destroy();
      remindersPanel.destroy();
    };
  });
  async function initialize() {
    try {
      await bookmarks.init(!!data.session);
      if (data.session) flags.hydrateFromBookmarks($bookmarks);
      else flags.hydrateFromStorage();
      ready = true;
      const params = new URLSearchParams(location.search);
      if (params.get('save')) {
        const incoming = safeUrl(params.get('save')!);
        if (!$bookmarks.some((bookmark) => bookmark.url === incoming)) {
          await bookmarks.addBookmark({
            id: crypto.randomUUID(),
            url: incoming,
            title: params.get('title') || new URL(incoming).hostname,
            summary: '',
            tags: [],
            categoryId: '',
            createdAt: new Date()
          });
          toast.success('saved to your reading list');
        } else toast.info('this link is already in your library');
        replaceState(location.pathname, {});
      }
    } catch (error) {
      loadError =
        error instanceof Error ? error.message : 'could not load your library.';
    }
  }
  function navigate(value: string) {
    section = value;
    selected = [];
    selectedCollections = [];
    selectMode = false;
    bookmarkSelectionAnchor = null;
    collectionSelectionAnchor = null;
  }
  async function openModal(
    value: NonNullable<LibraryModal>,
    bookmark: Bookmark | null = null
  ) {
    closeContext();
    closeRemindersPanel();
    editing = bookmark;
    formError = '';
    if (value === 'bookmark') {
      url = bookmark?.url || '';
      title = bookmark?.title || '';
      bookmarkSummary = bookmark?.summary || '';
      collection =
        (bookmark?.categoryId &&
        $categories.some((category) => category.id === bookmark.categoryId)
          ? bookmark.categoryId
          : '') ||
        ($categories.some((item) => item.id === section && item.id !== 'all')
          ? section
          : '');
    }
    if (value === 'collection') {
      collectionName = '';
      editingCollectionId = null;
      collectionDeleteConfirm = false;
    }
    if (value === 'settings') settingsTab = 'appearance';
    if (value === 'reminder' && bookmark) {
      reminderTarget = bookmark;
      reminderWhen = reminderInputValue(bookmark.reminderAt || undefined);
      reminderEmail = bookmark.reminderEmail || '';
    }
    if (value === 'command') {
      commandQuery = '';
      const triggerRect = commandTrigger?.getBoundingClientRect();
      const columnRect = readingColumn?.getBoundingClientRect();
      if (triggerRect && columnRect)
        commandPosition = {
          top: triggerRect.bottom + 10,
          left: columnRect.left + 10,
          width: columnRect.width - 20
        };
    }
    modal = value;
    await tick();
    dialog?.showModal();
    dialog?.querySelector<HTMLInputElement>('input')?.focus();
  }
  async function editCollection(id: string) {
    const existing = $categories.find((category) => category.id === id);
    if (!existing) return;
    editingCollectionId = id;
    collectionName = existing.name;
    collectionDeleteConfirm = false;
    await openModal('collection-edit');
  }
  function saveCollection(event: SubmitEvent) {
    event.preventDefault();
    const name = collectionName.trim();
    if (!name) return;
    const duplicate = $categories.some(
      (category) =>
        category.id !== editingCollectionId &&
        category.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      formError = 'a collection with this name already exists.';
      return;
    }
    if (editingCollectionId) {
      renameCategory(editingCollectionId, name);
      toast.success('collection renamed');
    } else {
      addCategory({ name, color: 'emerald', icon: 'Archive' });
      toast.success('collection created');
    }
    closeModal();
  }
  function removeCollection() {
    if (!editingCollectionId) return;
    if (!collectionDeleteConfirm) {
      collectionDeleteConfirm = true;
      return;
    }
    deleteCategory(editingCollectionId);
    if (section === editingCollectionId) navigate('all');
    toast.success('collection deleted');
    closeModal();
  }
  function openFromCommand(next: 'bookmark' | 'collection' | 'settings') {
    closeModal();
    setTimeout(() => void openModal(next), 0);
  }
  const commandActions: MenuItem[] = [
    {
      id: 'save',
      label: 'save a link',
      shortcut: 'n',
      icon: Plus,
      run: () => openFromCommand('bookmark')
    },
    {
      id: 'collection',
      label: 'new collection',
      icon: FileTray,
      run: () => openFromCommand('collection')
    },
    {
      id: 'settings',
      label: 'open settings',
      icon: ActionSettings,
      run: () => openFromCommand('settings')
    }
  ];
  function closeModal() {
    dialog?.close();
    modal = null;
  }
  function closeOtherSlidePanels(except: ReturnType<typeof useSlidePanel>) {
    if (except !== extensionPanel) extensionPanel.closePanel();
    if (except !== widgetPanel) widgetPanel.closePanel();
    if (except !== linuxPanel) linuxPanel.closePanel();
    if (except !== remindersPanel) remindersPanel.closePanel();
  }
  async function openExtensionPanel() {
    closeContext();
    closeReminderPopover();
    closeOtherSlidePanels(extensionPanel);
    if (modal) closeModal();
    await extensionPanel.openPanel();
  }
  function closeExtensionPanel() {
    extensionPanel.closePanel();
  }
  async function openWidgetPanel() {
    closeContext();
    closeReminderPopover();
    closeOtherSlidePanels(widgetPanel);
    dismissPlatformCallout();
    if (modal) closeModal();
    await widgetPanel.openPanel();
  }
  function closeWidgetPanel() {
    widgetPanel.closePanel();
  }
  async function openLinuxPanel() {
    closeContext();
    closeReminderPopover();
    closeOtherSlidePanels(linuxPanel);
    dismissPlatformCallout();
    if (modal) closeModal();
    await linuxPanel.openPanel();
  }
  function closeLinuxPanel() {
    linuxPanel.closePanel();
  }
  function dismissPlatformCallout() {
    platformCalloutOpen = false;
    if (platformCalloutTimer) {
      window.clearTimeout(platformCalloutTimer);
      platformCalloutTimer = undefined;
    }
  }
  function revealPlatformCallout() {
    if (!detectedPlatform) return;
    dismissPlatformCallout();
    platformCalloutTimer = window.setTimeout(() => {
      platformCalloutOpen = true;
      platformCalloutTimer = window.setTimeout(() => {
        platformCalloutOpen = false;
        platformCalloutTimer = undefined;
      }, 4500);
    }, 500);
  }
  async function openRemindersPanel() {
    closeContext();
    closeReminderPopover();
    closeOtherSlidePanels(remindersPanel);
    if (modal) closeModal();
    await remindersPanel.openPanel();
  }
  function closeRemindersPanel() {
    remindersPanel.closePanel();
  }
  async function createWidgetToken() {
    widgetTokenBusy = true;
    widgetTokenError = '';
    try {
      const response = await fetch('/api/widget/token', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'could not connect');
      widgetToken = result.token;
    } catch (error) {
      widgetTokenError =
        error instanceof Error ? error.message : 'could not connect';
    } finally {
      widgetTokenBusy = false;
    }
  }
  async function copyWidgetToken() {
    try {
      await navigator.clipboard.writeText(widgetToken);
      showCopied('widget-token');
      toast.success('connection code copied');
    } catch {
      toast.error(
        'clipboard is unavailable. select and copy the code instead.'
      );
    }
  }
  function showCopied(target: string) {
    const existingTimer = copyResetTimers[target];
    if (existingTimer) window.clearTimeout(existingTimer);
    if (!copiedTargets.includes(target))
      copiedTargets = [...copiedTargets, target];
    copyResetTimers[target] = window.setTimeout(() => {
      copiedTargets = copiedTargets.filter((value) => value !== target);
      delete copyResetTimers[target];
    }, 2000);
  }
  async function saveBookmark(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    formError = '';
    try {
      const normalized = safeUrl(url);
      if (
        $bookmarks.some(
          (bookmark) =>
            bookmark.url === normalized && bookmark.id !== editing?.id
        )
      )
        throw new Error('this link is already in your library.');
      const values = {
        url: normalized,
        title: title.trim() || domain(normalized),
        summary: bookmarkSummary.trim(),
        categoryId: collection,
        tags: editing?.tags || []
      };
      if (editing) await bookmarks.updateBookmark(editing.id, values);
      else
        await bookmarks.addBookmark({
          id: crypto.randomUUID(),
          ...values,
          createdAt: new Date()
        });
      closeModal();
      toast.success(editing ? 'bookmark updated' : 'saved to your library');
    } catch (error) {
      formError =
        error instanceof Error ? error.message : 'could not save bookmark';
    } finally {
      saving = false;
    }
  }
  async function showReminderPopover(event: MouseEvent, bookmark: Bookmark) {
    event.stopPropagation();
    closeContext();
    const trigger = event.currentTarget as HTMLElement;
    const rect = trigger.getBoundingClientRect();
    reminderTarget = bookmark;
    reminderWhen = reminderInputValue(bookmark.reminderAt || undefined);
    reminderEmail = bookmark.reminderEmail || '';
    formError = '';
    reminderPopover = {
      x: Math.max(10, Math.min(rect.right - 280, window.innerWidth - 290)),
      y: rect.bottom + 8
    };
    await tick();
    const panelRect = reminderPopoverPanel?.getBoundingClientRect();
    if (panelRect) {
      reminderPopover = {
        x: Math.max(
          10,
          Math.min(
            rect.right - panelRect.width,
            window.innerWidth - panelRect.width - 10
          )
        ),
        y:
          rect.bottom + panelRect.height + 8 <= window.innerHeight
            ? rect.bottom + 8
            : Math.max(10, rect.top - panelRect.height - 8)
      };
    }
    reminderPopoverPanel?.querySelector<HTMLInputElement>('input')?.focus();
  }
  function closeReminderPopover() {
    reminderPopover = null;
  }
  async function saveReminder(event: SubmitEvent) {
    event.preventDefault();
    if (!reminderTarget) return;
    saving = true;
    formError = '';
    try {
      await reminders.save(reminderTarget, reminderWhen, reminderEmail);
      if (reminderPopover) closeReminderPopover();
      else closeModal();
    } catch (error) {
      formError =
        error instanceof Error ? error.message : 'could not set reminder';
    } finally {
      saving = false;
    }
  }
  async function toggleAllReminders() {
    saving = true;
    try {
      await reminders.toggleEnabled();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'could not update reminders'
      );
    } finally {
      saving = false;
    }
  }
  function toggleSelect(id: string) {
    selectedCollections = [];
    collectionSelectionAnchor = null;
    bookmarkSelectionAnchor = id;
    selectMode = true;
    selected = selected.includes(id)
      ? selected.filter((value) => value !== id)
      : [...selected, id];
  }
  function selectBookmark(id: string) {
    selectedCollections = [];
    collectionSelectionAnchor = null;
    bookmarkSelectionAnchor = id;
    selected = selected.length === 1 && selected[0] === id ? [] : [id];
    selectMode = selected.length > 0;
  }
  function selectBookmarkRange(
    event: MouseEvent,
    id: string,
    orderedIds: string[]
  ) {
    if (!event.shiftKey) return false;
    event.preventDefault();
    event.stopPropagation();
    const currentIndex = orderedIds.indexOf(id);
    const anchorIndex = bookmarkSelectionAnchor
      ? orderedIds.indexOf(bookmarkSelectionAnchor)
      : currentIndex;
    const start = Math.min(
      anchorIndex < 0 ? currentIndex : anchorIndex,
      currentIndex
    );
    const end = Math.max(
      anchorIndex < 0 ? currentIndex : anchorIndex,
      currentIndex
    );
    const range = orderedIds.slice(start, end + 1);
    const shouldSelect = !selected.includes(id);
    selectedCollections = [];
    collectionSelectionAnchor = null;
    selected = shouldSelect
      ? [...new Set([...selected, ...range])]
      : selected.filter((value) => !range.includes(value));
    if (!bookmarkSelectionAnchor) bookmarkSelectionAnchor = id;
    selectMode = true;
    return true;
  }
  function selectCollectionRange(event: MouseEvent, id: string) {
    if (!event.shiftKey) return false;
    event.preventDefault();
    event.stopPropagation();
    const orderedIds = userCollections.map((item) => item.id);
    const currentIndex = orderedIds.indexOf(id);
    const anchorIndex = collectionSelectionAnchor
      ? orderedIds.indexOf(collectionSelectionAnchor)
      : currentIndex;
    const start = Math.min(
      anchorIndex < 0 ? currentIndex : anchorIndex,
      currentIndex
    );
    const end = Math.max(
      anchorIndex < 0 ? currentIndex : anchorIndex,
      currentIndex
    );
    selected = [];
    selectMode = false;
    bookmarkSelectionAnchor = null;
    selectedCollections = [
      ...new Set([...selectedCollections, ...orderedIds.slice(start, end + 1)])
    ];
    collectionSelectionAnchor = id;
    return true;
  }
  function selectCollection(event: MouseEvent, id: string) {
    if (selectCollectionRange(event, id)) return;
    navigate(section === id ? 'all' : id);
  }
  async function removeSelected() {
    saving = true;
    try {
      await bookmarks.deleteBookmarks(selected);
      selected = [];
      selectMode = false;
      bookmarkSelectionAnchor = null;
      closeModal();
      toast.success('bookmarks deleted');
    } catch (error) {
      formError =
        error instanceof Error ? error.message : 'could not delete bookmarks';
    } finally {
      saving = false;
    }
  }
  async function removeSelectedCollections() {
    saving = true;
    formError = '';
    const ids = [...selectedCollections];
    try {
      const affected = $bookmarks.filter((bookmark) =>
        ids.includes(bookmark.categoryId)
      );
      for (const bookmark of affected)
        await bookmarks.updateBookmark(bookmark.id, { categoryId: '' });
      for (const id of ids) deleteCategory(id);
      if (ids.includes(section)) section = 'all';
      selectedCollections = [];
      collectionSelectionAnchor = null;
      closeModal();
      toast.success(
        `${ids.length} ${ids.length === 1 ? 'collection' : 'collections'} deleted`
      );
    } catch (error) {
      formError =
        error instanceof Error ? error.message : 'could not delete collections';
    } finally {
      saving = false;
    }
  }
  async function copyLink(bookmark: Bookmark) {
    try {
      await navigator.clipboard.writeText(bookmark.url);
      showCopied(`bookmark:${bookmark.id}`);
      toast.success('link copied');
    } catch {
      toast.error(
        'clipboard is unavailable. open the bookmark to copy its address.'
      );
    }
    closeContext();
  }
  async function toggleWidgetBookmark(bookmark: Bookmark) {
    try {
      await bookmarks.updateBookmark(bookmark.id, {
        widgetEnabled: !bookmark.widgetEnabled
      });
      toast.success(
        bookmark.widgetEnabled
          ? 'removed from mac widget'
          : 'added to mac widget'
      );
    } catch {
      toast.error('could not update the mac widget');
    }
    closeContext();
  }
  async function showContext(event: MouseEvent, bookmark?: Bookmark) {
    if (
      (event.target as HTMLElement).closest(
        'input,textarea,dialog,[role="dialog"]'
      )
    )
      return;
    event.preventDefault();
    menuTrigger = event.target instanceof HTMLElement ? event.target : null;
    context = {
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 198)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 290)),
      bookmark
    };
    await tick();
    contextPanel?.querySelector<HTMLButtonElement>('button')?.focus();
  }
  function closeContext() {
    if (context) menuTrigger?.focus();
    context = null;
  }
  let contextEntries = $derived.by((): MenuEntry[] => {
    const bookmark = context?.bookmark;
    if (bookmark) {
      return [
        {
          id: 'open',
          label: 'open bookmark',
          shortcut: 'o',
          icon: ArrowUpRight,
          run: () => {
            flags.recordOpen(bookmark.id);
            window.open(bookmark.url, '_blank', 'noopener,noreferrer');
            closeContext();
          }
        },
        {
          id: 'edit',
          label: 'edit bookmark',
          shortcut: 'e',
          icon: ActionEdit,
          run: () => openModal('bookmark', bookmark)
        },
        {
          id: 'reminder',
          label: () => (bookmark.reminderAt ? 'edit reminder' : 'set reminder'),
          shortcut: 'r',
          icon: ActionBell,
          run: () => openModal('reminder', bookmark)
        },
        {
          id: 'pin',
          label: () =>
            flags.flags[bookmark.id]?.pinned
              ? 'unpin bookmark'
              : 'pin bookmark',
          shortcut: 'p',
          icon: Pin,
          run: () => flags.toggleFlag(bookmark.id, 'pinned')
        },
        {
          id: 'read',
          label: () =>
            flags.flags[bookmark.id]?.read ? 'mark as unread' : 'mark as read',
          shortcut: 'm',
          icon: ActionRead,
          run: () => flags.toggleFlag(bookmark.id, 'read')
        },
        {
          id: 'widget',
          label: () =>
            bookmark.widgetEnabled
              ? 'remove from mac widget'
              : 'add to mac widget',
          shortcut: 'w',
          icon: GuideLauncher,
          visible: () => Boolean(data.session),
          run: () => void toggleWidgetBookmark(bookmark)
        },
        { id: 'bookmark-sep', separator: true },
        {
          id: 'delete',
          label: 'delete bookmark',
          shortcut: 'd',
          icon: DeleteTrash,
          danger: true,
          run: () => {
            selected = [bookmark.id];
            void openModal('delete');
          }
        }
      ];
    }
    return [
      {
        id: 'open-library',
        label: 'open chikota',
        icon: BookmarkIcon,
        run: () => {
          navigate('all');
          closeContext();
        }
      },
      {
        id: 'save',
        label: 'save a link',
        icon: Plus,
        run: () => openModal('bookmark')
      },
      {
        id: 'collection',
        label: 'new collection',
        icon: FileTray,
        run: () => openModal('collection')
      },
      { id: 'canvas-sep', separator: true },
      {
        id: 'settings',
        label: 'appearance & settings',
        icon: ActionSettings,
        run: () => openModal('settings')
      }
    ];
  });
  function contextKeys(event: KeyboardEvent) {
    handleContextKeys(event, contextPanel, closeContext);
  }
  function startDrag(event: PointerEvent) {
    if (
      event.button !== 0 ||
      event.pointerType === 'touch' ||
      (event.target as HTMLElement).closest('button,a,input,select')
    )
      return;
    event.preventDefault();
    dragBase =
      event.metaKey || event.ctrlKey || event.shiftKey ? [...selected] : [];
    dragTargets = collectBookmarkTargets();
    drag = {
      x: event.clientX,
      y: event.clientY,
      endX: event.clientX,
      endY: event.clientY
    };
    dragging = false;
  }
  function closeListToolsOutside(event: PointerEvent) {
    if (
      listToolsOpen &&
      !(event.target as HTMLElement).closest('.list-options')
    )
      listToolsOpen = false;
  }
  function moveDrag(event: PointerEvent) {
    if (!drag) return;
    if (
      Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5 &&
      !dragging
    )
      return;
    dragging = true;
    drag = { ...drag, endX: event.clientX, endY: event.clientY };
    selected = [
      ...new Set([...dragBase, ...bookmarkIdsInRect(dragTargets, drag)])
    ];
  }
  function keyboard(event: KeyboardEvent) {
    handleLibraryKeyboard(event, {
      view: () => view,
      modal: () => modal,
      hasContext: () => Boolean(context),
      listToolsOpen: () => listToolsOpen,
      closeListTools: () => {
        listToolsOpen = false;
      },
      focusListTools: () => listToolsTrigger?.focus(),
      openCommand: () => void openModal('command'),
      openBookmark: () => void openModal('bookmark'),
      clearSelection: () => {
        selected = [];
        selectedCollections = [];
        selectMode = false;
        bookmarkSelectionAnchor = null;
        collectionSelectionAnchor = null;
      },
      selectAllVisible: () => {
        selected = visible.map((bookmark) => bookmark.id);
      }
    });
  }
  function exportLibrary() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            bookmarks: $bookmarks,
            categories: $categories,
            flags: flags.flags
          },
          null,
          2
        )
      ],
      { type: 'application/json' }
    );
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'chikota-library.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }
  async function addExamples() {
    saving = true;
    try {
      const examples = [
        [
          'https://svelte.dev/blog',
          'notes from the svelte team',
          'ideas, releases, and a better way to build for the web.'
        ],
        [
          'https://www.radix-ui.com/colors',
          'a thoughtful approach to color',
          'beautiful, accessible color scales for digital interfaces.'
        ],
        [
          'https://www.are.na/',
          'a space for connecting ideas',
          'collect references and follow your curiosity.'
        ],
        [
          'https://developer.mozilla.org/en-US/docs/Web/CSS',
          'the language of the web',
          'a reference worth keeping close while you build.'
        ],
        [
          'https://www.nngroup.com/articles/',
          'small details. better experiences.',
          'research and practical ideas for thoughtful products.'
        ],
        [
          'https://www.gutenberg.org/',
          'a whole world of reading',
          'discover a classic. make a little time for a good book.'
        ]
      ];
      for (const [exampleUrl, exampleTitle, exampleSummary] of examples) {
        if ($bookmarks.some((bookmark) => bookmark.url === exampleUrl))
          continue;
        await bookmarks.addBookmark({
          id: crypto.randomUUID(),
          url: exampleUrl,
          title: exampleTitle,
          summary: exampleSummary,
          tags: [],
          categoryId: '',
          createdAt: new Date()
        });
      }
      toast.success('example bookmarks added — keep or delete any of them');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'could not add examples'
      );
    } finally {
      saving = false;
    }
  }
  setLibraryContext({
    get flags() {
      return flags.flags;
    },
    get selected() {
      return selected;
    },
    get selectMode() {
      return selectMode;
    },
    get copiedTargets() {
      return copiedTargets;
    },
    get contextBookmarkId() {
      return context?.bookmark?.id;
    },
    get dragging() {
      return dragging;
    },
    get visibleIds() {
      return visible.map((bookmark) => bookmark.id);
    },
    get reminderStatusById() {
      return reminderStatusById;
    },
    formatReminder,
    toggleFlag: (id, key) => flags.toggleFlag(id, key),
    recordOpen: (id) => flags.recordOpen(id),
    toggleSelect,
    selectBookmark,
    selectBookmarkRange,
    showContext,
    showReminderPopover,
    copyLink,
    clearDragging: () => {
      dragging = false;
    }
  });
</script>

<svelte:head
  >{#if view === 'library'}<title>chikota — your reading room</title
    >{/if}</svelte:head
>
<svelte:window
  onkeydown={keyboard}
  oncontextmenu={(event) => {
    if (view !== 'library') return;
    showContext(event);
  }}
  onpointerdown={(event) => {
    if (view !== 'library') return;
    closeListToolsOutside(event);
  }}
  onpointermove={moveDrag}
  onpointerup={() => {
    drag = null;
  }}
  onpointercancel={() => {
    drag = null;
  }}
/>

{#if view === 'pending'}
  <p class="sr-only">loading chikota</p>
{:else if view === 'landing'}
  <LandingPage onenter={enterLibrary} />
{:else if view === 'library'}
  <div class="reading-column" bind:this={readingColumn}>
    <header class="reading-header">
      <a class="wordmark" href="/" aria-label="chikota home"><h1>chikota</h1></a
      >
      <div class="header-actions">
        <button
          data-tour="search"
          bind:this={commandTrigger}
          class="icon-button search-trigger"
          aria-label="search bookmarks"
          title="search bookmarks"
          onclick={() => openModal('command')}><SearchGrid /></button
        >
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            data-tour="account"
            class={[
              'icon-button notification-trigger',
              data.session ? 'account-trigger-session' : 'account-trigger-guest'
            ]}
            aria-label="account menu"
            title="account menu"
            >{#if data.session}{#if data.session.user.image}<img
                  class="account-avatar"
                  src={data.session.user.image}
                  alt=""
                />{:else}<div class="account-avatar account-avatar-fallback">
                  {data.session.user.name?.slice(0, 1).toUpperCase() || 'U'}
                </div>{/if}{:else}<GuestUser
              />{/if}{#if upcomingReminderCount}<span
                >{upcomingReminderCount}</span
              >{/if}</DropdownMenu.Trigger
          >
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              class="list-options-menu"
              align="end"
              sideOffset={8}
            >
              <DropdownMenu.Item
                class="list-options-item"
                onSelect={() => openModal('settings')}
                ><ActionSettings size={14} />settings</DropdownMenu.Item
              >
              <DropdownMenu.Item
                class="list-options-item"
                onSelect={openRemindersPanel}
                ><ActionBell size={14} />reminders{#if upcomingReminderCount}
                  · {upcomingReminderCount}{/if}</DropdownMenu.Item
              >
              <DropdownMenu.Item
                class="list-options-item"
                onSelect={() => void openExtensionPanel()}
                ><BrowserExtension size={14} />browser extension</DropdownMenu.Item
              >
              {#if data.session}<DropdownMenu.Item
                  class="list-options-item"
                  onSelect={async () => {
                    await authClient.signOut();
                    location.reload();
                  }}><LogOut size={14} />sign out</DropdownMenu.Item
                >{:else}<DropdownMenu.Item
                  class="list-options-item"
                  onSelect={() =>
                    authClient.signIn.social({ provider: 'google' })}
                  ><GuestUser size={14} />sign in</DropdownMenu.Item
                >{/if}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        <button
          class="icon-button guide-launcher"
          aria-label="start welcome guide"
          title="welcome guide"
          onclick={() => (guideOpen = true)}><GuideLauncher /></button
        >
      </div>
    </header>
    <main>
      <CollectionGrid
        collections={userCollections}
        counts={bookmarkCountByCategory}
        {section}
        selectedIds={selectedCollections}
        open={collectionsOpen}
        onToggle={() => (collectionsOpen = !collectionsOpen)}
        onCreate={() => void openModal('collection')}
        onSelect={selectCollection}
        onEdit={(id) => void editCollection(id)}
      />
      {#if section !== 'opened'}<section
          class="pinned-section ruled-section"
          aria-labelledby="pinned-heading"
        >
          <div class="section-toolbar py-2!">
            <button
              class="section-toggle"
              aria-expanded={pinnedOpen}
              aria-controls="pinned-content"
              onclick={() => (pinnedOpen = !pinnedOpen)}
              ><Pin size={15} />
              <h2 id="pinned-heading">pinned</h2>
              <span class="count">{pinned.length}</span><ChevronDown
                size={14}
                class={pinnedOpen ? 'chevron expanded' : 'chevron'}
              /></button
            >
          </div>
          <div
            id="pinned-content"
            class="collapse-grid"
            class:open={pinnedOpen}
            inert={!pinnedOpen ? true : undefined}
            aria-hidden={!pinnedOpen}
          >
            <div class="collapse-inner">
              {#if pinned.length}<div class="pin-grid">
                  {#each pinned as bookmark (bookmark.id)}<a
                      class="pin-card"
                      class:selected={selected.includes(bookmark.id)}
                      href={bookmark.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onclick={(event) => {
                        event.preventDefault();
                        if (
                          !selectBookmarkRange(
                            event,
                            bookmark.id,
                            pinned.map((item) => item.id)
                          )
                        )
                          selectBookmark(bookmark.id);
                      }}
                      ><span class="site-letter"
                        ><SiteFavicon url={bookmark.url} size={18} /></span
                      >
                      <div>
                        <strong>{bookmark.title}</strong><small
                          >{domain(bookmark.url)}</small
                        >
                      </div></a
                    >{/each}
                </div>
              {:else}<div class="section-empty">
                  <EmptyMono />
                  <strong>no pinned bookmarks yet.</strong>
                  <p>keep your important bookmarks pinned for quick access.</p>
                </div>{/if}
            </div>
          </div>
        </section>{/if}
      <section class="library-section ruled-section" aria-label="bookmarks">
        <div class="section-toolbar library-toolbar py-2!">
          <div class="library-title">
            <BookmarkIcon size={15} />
            <h2>{heading}</h2>
            <span class="count">{visible.length}</span>
          </div>
          <div class="library-actions">
            <button
              class="plain-button"
              data-tour="save"
              disabled={!ready}
              onclick={() => openModal('bookmark')}><Plus size={15} /></button
            >
            <div class="list-options">
              <button
                bind:this={listToolsTrigger}
                data-tour="mixer"
                class="icon-button list-options-trigger"
                aria-label="bookmark actions"
                title="bookmark actions"
                aria-expanded={listToolsOpen}
                aria-controls="bookmark-action-rail"
                onclick={() => (listToolsOpen = !listToolsOpen)}
                ><MixerVertical size={15} /></button
              >
              <div
                id="bookmark-action-rail"
                class="list-options-rail"
                class:open={listToolsOpen}
                aria-hidden={!listToolsOpen}
                inert={!listToolsOpen ? true : undefined}
              >
                <button
                  class="plain-button"
                  class:control-active={selectMode}
                  aria-pressed={selectMode}
                  onclick={() => {
                    selectMode = !selectMode;
                    if (!selectMode) selected = [];
                  }}><SelectList size={14} />select</button
                >
                <button
                  class="plain-button"
                  disabled={!visible.length}
                  onclick={() => {
                    selected = visible.map((bookmark) => bookmark.id);
                    selectMode = true;
                  }}><SelectAll size={14} />select all</button
                >
                <button
                  class="plain-button"
                  disabled={!groups.length}
                  onclick={() => {
                    collapsedGroups = groups.every((group) =>
                      collapsedGroups.includes(group.date)
                    )
                      ? []
                      : groups.map((group) => group.date);
                  }}
                  ><CollapseAll size={14} />{groups.length &&
                  groups.every((group) => collapsedGroups.includes(group.date))
                    ? 'expand all'
                    : 'collapse all'}</button
                >
              </div>
            </div>
          </div>
        </div>
        {#if loadError}<div class="error-panel" role="alert">
            {loadError}<button
              onclick={() => {
                loadError = '';
                void initialize();
              }}>try again</button
            >
          </div>
        {:else if !ready}<div class="section-empty" role="status">
            loading bookmarks…
          </div>
        {:else if visible.length}
          {#each groups as group (group.date)}
            <BookmarkDateGroup
              date={group.date}
              items={group.items}
              collapsed={collapsedGroups.includes(group.date)}
              onToggle={() => toggleGroup(group.date)}
              onStartDrag={startDrag}
            />
          {/each}
        {:else}<div class="section-empty bookmarks-empty">
            <EmptyMono />
            <strong>no bookmarks here yet.</strong>
            <p>
              {section === 'opened'
                ? 'bookmarks you open will stay here for 7 days.'
                : 'save a link to start your collection.'}
            </p>
            {#if section === 'all'}<button
                class="plain-button"
                disabled={saving}
                onclick={addExamples}
                >{saving
                  ? 'adding links…'
                  : 'explore a few handpicked links'}<ArrowRight
                  size={14}
                /></button
              >{/if}
          </div>{/if}
      </section>
    </main>
  </div>

  <div class="library-fade-overlay" aria-hidden="true"></div>

  {#if !selectedCollections.length && !selected.length}<nav
      class="library-tabs floating-library-tabs"
      aria-label="library"
    >
      <span
        class:opened={section === 'opened'}
        class="tab-indicator bg-(--accent-soft)!"
        style:width={`${(section === 'opened' ? openedTabWidth : bookmarksTabWidth) + 2}px`}
        style:transform={`translateX(${section === 'opened' ? 0 : openedTabWidth}px)`}
        aria-hidden="true"
      ></span>
      <button
        bind:clientWidth={openedTabWidth}
        class:active={section === 'opened'}
        aria-label="opened in the last 7 days"
        aria-pressed={section === 'opened'}
        onclick={() => navigate('opened')}><Book size={14} />opened</button
      >
      <button
        bind:clientWidth={bookmarksTabWidth}
        class:active={section !== 'opened'}
        aria-pressed={section !== 'opened'}
        onclick={() => navigate('all')}
        >{#if section !== 'opened'}<BookmarkFilled
            size={14}
          />{:else}<BookmarkIcon size={14} />{/if}bookmarks</button
      >
    </nav>{/if}

  <div class="platform-launchers" aria-label="chikota desktop tools">
    <span class="platform-launcher-wrap">
      {#if detectedPlatform === 'linux' && platformCalloutOpen}<span
          class="platform-callout linux-callout"
          role="status"
        >
          <span class="callout-dot small" aria-hidden="true"></span>
          <span class="callout-dot large" aria-hidden="true"></span>
          <button
            type="button"
            class="callout-message"
            onclick={() => void openLinuxPanel()}
            >on linux? <span>bring chikota to your desktop.</span></button
          >
        </span>{/if}
      <button
        type="button"
        class="platform-launcher linux-launcher"
        aria-label="install the linux desktop widget"
        aria-haspopup="dialog"
        aria-controls="linux-widget-panel"
        aria-expanded={linuxPanel.open}
        title="linux desktop widget"
        onclick={() => void openLinuxPanel()}
      >
        <UbuntuWidgetLauncher />
      </button>
    </span>
    <span class="platform-launcher-wrap">
      {#if detectedPlatform === 'mac' && platformCalloutOpen}<span
          class="platform-callout mac-callout"
          role="status"
        >
          <span class="callout-dot small" aria-hidden="true"></span>
          <span class="callout-dot large" aria-hidden="true"></span>
          <button
            type="button"
            class="callout-message"
            onclick={() => void openWidgetPanel()}
            >on a mac? <span>bring chikota to your desktop.</span></button
          >
        </span>{/if}
      <button
        type="button"
        class="platform-launcher mac-launcher"
        aria-label="install the mac desktop widget"
        aria-haspopup="dialog"
        aria-controls="widget-panel"
        aria-expanded={widgetPanel.open}
        title="mac desktop widget"
        onclick={() => void openWidgetPanel()}
      >
        <MacWidgetLauncher />
      </button>
    </span>
  </div>

  {#if extensionPanel.mounted}<SlidePanel
      id="extension-panel"
      labelledBy="extension-panel-title"
      title="browser extension"
      icon={BrowserExtension}
      open={extensionPanel.open}
      closeLabel="close browser extension panel"
      bind:element={extensionPanel.element}
      onclose={closeExtensionPanel}
    >
      <h2 id="extension-panel-title">keep it in one click.</h2>
      <p class="dialog-description">
        a small extension for the things you find along the way.
      </p>
      <div class="extension-demo">
        <span>right-click on a website or link</span>
        <div><BookmarkIcon />save to chikota</div>
        <div><ArrowUpRight />open chikota</div>
      </div>
      <ol class="setup-steps">
        <li>download and unzip the extension.</li>
        <li>
          open chrome or edge’s extensions page, enable developer mode, then
          choose <strong>load unpacked</strong>.
        </li>
        <li>
          select the unzipped folder. in extension options, set your chikota
          address to <strong
            >{typeof location !== 'undefined'
              ? location.origin
              : 'your app URL'}</strong
          >.
        </li>
      </ol>
      <p class="settings-note">
        works on ordinary websites in chrome and edge. browser-protected pages
        and native apps do not expose these menus to a web extension.
      </p>
      <a
        class="primary-button download-extension"
        href="/chikota-extension.zip"
        download><Download />download extension</a
      >
    </SlidePanel>{/if}

  {#if widgetPanel.mounted}<SlidePanel
      id="widget-panel"
      class="desktop-widget-panel widget-panel"
      labelledBy="widget-panel-title"
      title="mac desktop widget"
      icon={GuideLauncher}
      open={widgetPanel.open}
      closeLabel="close mac desktop widget panel"
      bind:element={widgetPanel.element}
      onclose={closeWidgetPanel}
    >
      <h2 id="widget-panel-title">keep it close to home.</h2>
      <p class="dialog-description">
        reminders, pinned links, and recent opens stay available from your
        desktop, including while offline.
      </p>
      <ol class="widget-setup-steps">
        <li>
          run the <strong>Chikota</strong> macOS app from the included Xcode project.
        </li>
        <li>
          create a connection code below, then paste it and this site’s address
          into the Mac app and choose <strong>connect</strong>.
        </li>
        <li>
          control-click the Mac desktop, choose <strong>Edit Widgets</strong>,
          search for <strong>chikota</strong>, and add the widget.
        </li>
      </ol>
      <p class="widget-setup-note">
        The connection code links your account; macOS installs the widget with
        the companion app.
      </p>
      <WidgetConnectBlock
        signedIn={Boolean(data.session)}
        token={widgetToken}
        busy={widgetTokenBusy}
        error={widgetTokenError}
        copied={copiedTargets.includes('widget-token')}
        platform="mac"
        oncreate={() => void createWidgetToken()}
        oncopy={() => void copyWidgetToken()}
        onsignin={() => authClient.signIn.social({ provider: 'google' })}
      />
    </SlidePanel>{/if}

  {#if linuxPanel.mounted}<SlidePanel
      id="linux-widget-panel"
      class="desktop-widget-panel widget-panel"
      labelledBy="linux-widget-panel-title"
      title="linux desktop widget"
      icon={UbuntuWidgetLauncher}
      open={linuxPanel.open}
      closeLabel="close linux desktop widget panel"
      bind:element={linuxPanel.element}
      onclose={closeLinuxPanel}
    >
      <h2 id="linux-widget-panel-title">keep it close on linux.</h2>
      <p class="dialog-description">
        a lightweight desktop companion for pinned links, reminders, and recent
        opens—with an offline cache for when the network disappears.
      </p>
      <ol class="widget-setup-steps">
        <li>download and unzip the Linux widget.</li>
        <li>
          install Python 3 and Tkinter, then run
          <strong>./install.sh</strong> from the extracted folder.
        </li>
        <li>
          launch <strong>Chikota Desktop Widget</strong>, then paste this site’s
          address and a connection code created below.
        </li>
      </ol>
      <a
        class="primary-button download-extension"
        href="/chikota-linux-widget.zip"
        download><Download />download linux widget</a
      >
      <WidgetConnectBlock
        signedIn={Boolean(data.session)}
        token={widgetToken}
        busy={widgetTokenBusy}
        error={widgetTokenError}
        copied={copiedTargets.includes('widget-token')}
        platform="linux"
        oncreate={() => void createWidgetToken()}
        oncopy={() => void copyWidgetToken()}
        onsignin={() => authClient.signIn.social({ provider: 'google' })}
      />
    </SlidePanel>{/if}

  {#if remindersPanel.mounted}<SlidePanel
      class="reminders-panel"
      labelledBy="reminders-panel-title"
      title="reminders"
      icon={ActionBell}
      open={remindersPanel.open}
      closeLabel="close reminders panel"
      bind:element={remindersPanel.element}
      onclose={closeRemindersPanel}
    >
      <h2 id="reminders-panel-title">reminders</h2>
      <p class="dialog-description">
        upcoming, completed, and canceled reminders in one place.
      </p>
      {#if reminderBookmarks.length}<div
          class="reminder-table"
          role="table"
          aria-label="bookmark reminders"
        >
          <div class="reminder-table-head" role="row">
            <span role="columnheader">bookmark</span>
            <span role="columnheader">scheduled</span>
            <span role="columnheader">delivery</span>
            <span role="columnheader">status</span>
            <span role="columnheader" class="sr-only">actions</span>
          </div>
          {#each reminderBookmarks as bookmark (bookmark.id)}{@const status =
              reminderStatusById.get(bookmark.id)}
            <div
              class:done={status === 'done'}
              class:canceled={status === 'canceled'}
              class="reminder-table-row"
              role="row"
            >
              <div class="reminder-bookmark-cell" role="cell">
                <span class="reminder-favicon"
                  ><SiteFavicon url={bookmark.url} size={16} /></span
                >
                <span
                  ><strong title={bookmark.title}>{bookmark.title}</strong
                  ><small title={domain(bookmark.url)}
                    >{domain(bookmark.url)}</small
                  ></span
                >
              </div>
              <span
                class="reminder-table-cell"
                role="cell"
                title={formatReminder(bookmark.reminderAt!)}
                >{formatReminder(bookmark.reminderAt!)}</span
              >
              <span class="reminder-table-cell" role="cell">
                {bookmark.reminderEmail ? 'email' : 'browser + sound'}
              </span>
              <span class="reminder-table-cell reminder-status" role="cell"
                >{status}</span
              >
              <span class="reminder-table-action" role="cell">
                {#if status === 'active'}<button
                    class="icon-button small"
                    aria-label={`cancel reminder for ${bookmark.title}`}
                    title="cancel reminder"
                    onclick={() => reminders.cancel(bookmark)}
                    ><BellOff size={14} /></button
                  >{/if}
              </span>
            </div>{/each}
        </div>
      {:else}<div class="notification-empty">
          <ActionBell />
          <strong>no reminders yet.</strong>
          <p>use the bell on a bookmark to bring it back later.</p>
        </div>{/if}
    </SlidePanel>{/if}

  {#if selectedCollections.length}
    <SelectionToolbar
      count={selectedCollections.length}
      label="collection selection actions"
      actions={collectionToolbarActions}
    >
      {#snippet leading()}
        <span><CheckCircled />{selectedCollections.length} selected</span>
      {/snippet}
    </SelectionToolbar>
  {:else if selected.length}
    <SelectionToolbar
      class="bookmark-selection-toolbar"
      count={selected.length}
      label="selection actions"
      actions={bookmarkToolbarActions}
    >
      {#snippet leading()}
        <button
          aria-label="clear selection"
          title="clear selection"
          onclick={() => {
            selected = [];
            selectMode = false;
            bookmarkSelectionAnchor = null;
          }}><Cross2 /></button
        ><span>{selected.length} selected</span>
      {/snippet}
    </SelectionToolbar>
  {/if}
  {#if drag && dragging}<div
      class="selection-marquee"
      style:left={`${Math.min(drag.x, drag.endX)}px`}
      style:top={`${Math.min(drag.y, drag.endY)}px`}
      style:width={`${Math.abs(drag.x - drag.endX)}px`}
      style:height={`${Math.abs(drag.y - drag.endY)}px`}
    ></div>{/if}
  {#if reminderPopover && reminderTarget}
    <button
      class="context-backdrop"
      aria-label="close reminder"
      onclick={closeReminderPopover}
      tabindex="-1"
    ></button>
    <div
      bind:this={reminderPopoverPanel}
      class="reminder-popover"
      role="dialog"
      tabindex="-1"
      aria-label={`set reminder for ${reminderTarget.title}`}
      style:left={`${reminderPopover.x}px`}
      style:top={`${reminderPopover.y}px`}
      onkeydown={(event) => {
        if (event.key === 'Escape') closeReminderPopover();
      }}
    >
      <div class="reminder-popover-title">
        <ActionBell size={16} /><strong>set reminder</strong><button
          type="button"
          class="icon-button small"
          aria-label="close reminder"
          onclick={closeReminderPopover}><Cross2 size={14} /></button
        >
      </div>
      <p>{reminderTarget.title}</p>
      <ReminderForm
        variant="popover"
        bind:when={reminderWhen}
        bind:email={reminderEmail}
        min={reminderInputValue(new Date())}
        error={formError}
        {saving}
        showCancelReminder={Boolean(
          reminderTarget.reminderAt &&
          reminderStatusById.get(reminderTarget.id) === 'active'
        )}
        onsubmit={saveReminder}
        oncancelReminder={() => {
          void reminders.cancel(reminderTarget!);
          closeReminderPopover();
        }}
      />
    </div>
  {/if}
  {#if context}
    <ContextMenu
      entries={contextEntries}
      x={context.x}
      y={context.y}
      bind:panel={contextPanel}
      onclose={closeContext}
      onkeydown={contextKeys}
    />
  {/if}

  <LibraryDialog
    bind:dialog
    {modal}
    {commandPosition}
    {saving}
    onclose={() => (modal = null)}
  >
    {#snippet commandPane()}
      <CommandPalette
        bind:query={commandQuery}
        bind:searchInput
        actions={commandActions}
        bookmarks={commandBookmarks}
        onOpenBookmark={(bookmark) => {
          flags.recordOpen(bookmark.id);
          closeModal();
        }}
      />
    {/snippet}
    {#snippet bookmarkPane()}
      <BookmarkForm
        bind:url
        bind:title
        bind:note={bookmarkSummary}
        bind:collection
        collections={userCollections}
        editing={Boolean(editing)}
        error={formError}
        {saving}
        onsubmit={saveBookmark}
        oncancel={closeModal}
      />
    {/snippet}
    {#snippet collectionPane()}
      <CollectionForm
        bind:name={collectionName}
        editing={Boolean(editingCollectionId)}
        confirmDelete={collectionDeleteConfirm}
        error={formError}
        onsubmit={saveCollection}
        oncancel={closeModal}
        ondelete={removeCollection}
      />
    {/snippet}
    {#snippet reminderPane()}
      {#if reminderTarget}
        <div class="dialog-symbol">
          <ActionBell size={22} />
        </div>
        <h2 id="dialog-title">bring it back at the right time.</h2>
        <p class="dialog-description reminder-description">
          set a reminder for <strong>{reminderTarget.title}</strong>.
        </p>
        <ReminderForm
          bind:when={reminderWhen}
          bind:email={reminderEmail}
          min={reminderInputValue(new Date())}
          error={formError}
          {saving}
          showCancelReminder={Boolean(
            reminderTarget.reminderAt &&
            reminderStatusById.get(reminderTarget.id) === 'active'
          )}
          onsubmit={saveReminder}
          oncancel={closeModal}
          oncancelReminder={() => {
            void reminders.cancel(reminderTarget!);
            closeModal();
          }}
        />
      {/if}
    {/snippet}
    {#snippet settingsPane()}
      <SettingsPanel
        bind:tab={settingsTab}
        {themes}
        currentTheme={themeStore.current}
        signedIn={Boolean(data.session)}
        remindersEnabled={reminders.enabled}
        {upcomingReminderCount}
        {reminderBookmarks}
        {reminderStatusById}
        {saving}
        onTheme={(theme) => themeStore.set(theme)}
        onExport={exportLibrary}
        onOpenExtension={() => {
          closeModal();
          void openExtensionPanel();
        }}
        onSignOut={async () => {
          await authClient.signOut();
          location.reload();
        }}
        onToggleReminders={() => void toggleAllReminders()}
        onCancelAllReminders={() => void reminders.cancelAll()}
        onViewReminders={() => {
          closeModal();
          void openRemindersPanel();
        }}
      />
    {/snippet}
    {#snippet deletePane()}
      <ConfirmDelete
        title="let these links go?"
        description={`delete ${selected.length} selected ${
          selected.length === 1 ? 'bookmark' : 'bookmarks'
        } from your library. this cannot be undone.`}
        error={formError}
        {saving}
        keepLabel="keep bookmarks"
        deleteLabel="delete bookmarks"
        onkeep={closeModal}
        ondelete={() => void removeSelected()}
      />
    {/snippet}
    {#snippet deleteCollectionsPane()}
      <ConfirmDelete
        title="remove these collections?"
        description={`delete ${selectedCollections.length} selected ${
          selectedCollections.length === 1 ? 'collection' : 'collections'
        }. their bookmarks will remain in your library.`}
        error={formError}
        {saving}
        keepLabel="keep collections"
        deleteLabel="delete collections"
        onkeep={closeModal}
        ondelete={() => void removeSelectedCollections()}
      />
    {/snippet}
  </LibraryDialog>

  <WelcomeGuide
    open={guideOpen}
    suspended={modal !== null}
    ondismiss={dismissGuide}
  />
{/if}

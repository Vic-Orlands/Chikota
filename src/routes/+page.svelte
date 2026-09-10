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
  import type { Bookmark } from '$lib/types';
  import { authClient } from '$lib/auth-client';
  import { toast } from 'svelte-sonner';
  import EmptyMono from '$lib/components/EmptyMono.svelte';
  import WelcomeGuide from '$lib/components/WelcomeGuide.svelte';
  import LandingPage from '$lib/components/LandingPage.svelte';
  import CopyIconSwap from '$lib/components/CopyIconSwap.svelte';
  import ActionBell from '$lib/components/icons/ActionBell.svelte';
  import ActionEdit from '$lib/components/icons/ActionEdit.svelte';
  import ActionRead from '$lib/components/icons/ActionRead.svelte';
  import ActionSettings from '$lib/components/icons/ActionSettings.svelte';
  import BrowserExtension from '$lib/components/icons/BrowserExtension.svelte';
  import CollapseAll from '$lib/components/icons/CollapseAll.svelte';
  import DeleteTrash from '$lib/components/icons/DeleteTrash.svelte';
  import EllipsisVertical from '$lib/components/icons/EllipsisVertical.svelte';
  import GuestUser from '$lib/components/icons/GuestUser.svelte';
  import GuideLauncher from '$lib/components/icons/GuideLauncher.svelte';
  import KeyboardDown from '$lib/components/icons/KeyboardDown.svelte';
  import MacWidgetLauncher from '$lib/components/icons/MacWidgetLauncher.svelte';
  import ReminderDone from '$lib/components/icons/ReminderDone.svelte';
  import SearchGrid from '$lib/components/icons/SearchGrid.svelte';
  import SaveCloud from '$lib/components/icons/SaveCloud.svelte';
  import SelectAll from '$lib/components/icons/SelectAll.svelte';
  import SelectList from '$lib/components/icons/SelectList.svelte';
  import {
    MixerVertical,
    Plus,
    Bookmark as BookmarkIcon,
    BookmarkFilled,
    Book,
    FileTray,
    FileTrayStacked,
    Pin,
    Check,
    CheckCircled,
    ArrowUpRight,
    ArrowRight,
    Cross2,
    MoreVertical,
    Download,
    Globe,
    ChevronDown,
    LogOut,
    BellOff,
    Clock,
    Calendar,
    Mail,
    Info
  } from '$lib/components/icons/radix';

  type ReminderState = {
    status: 'active' | 'done' | 'canceled';
    emailId?: string;
    updatedAt: string;
  };
  type SettingsTab = 'appearance' | 'reminders' | 'about';

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
    if (!ready) void initialize().then(checkReminders);
  }
  let loadError = $state('');
  let saving = $state(false);
  let selected = $state<string[]>([]);
  let selectedCollections = $state<string[]>([]);
  let listToolsOpen = $state(false);
  let listToolsTrigger = $state<HTMLButtonElement>();
  let selectionPinned = $derived(
    selected.length > 0 && selected.every((id) => flags[id]?.pinned)
  );
  let selectMode = $state(false);
  let bookmarkSelectionAnchor = $state<string | null>(null);
  let collectionSelectionAnchor = $state<string | null>(null);
  let flags = $state<
    Record<string, { pinned?: boolean; read?: boolean; openedAt?: string }>
  >({});
  let modal = $state<
    | 'bookmark'
    | 'collection'
    | 'collection-edit'
    | 'command'
    | 'settings'
    | 'delete'
    | 'delete-collections'
    | 'reminder'
    | null
  >(null);
  let dialog = $state<HTMLDialogElement>();
  let searchInput = $state<HTMLInputElement>();
  let commandTrigger = $state<HTMLButtonElement>();
  let commandPosition = $state({ top: 0, left: 0, width: 0 });
  let extensionPanelMounted = $state(false);
  let extensionPanelOpen = $state(false);
  let extensionPanel = $state<HTMLElement>();
  let extensionPanelCloseTimer: number | undefined;
  let remindersPanelMounted = $state(false);
  let remindersPanelOpen = $state(false);
  let remindersPanel = $state<HTMLElement>();
  let remindersPanelCloseTimer: number | undefined;
  let widgetToken = $state('');
  let widgetTokenBusy = $state(false);
  let widgetTokenError = $state('');
  let copiedTargets = $state<string[]>([]);
  const copyResetTimers: Record<string, number> = {};
  let editing = $state<Bookmark | null>(null);
  let url = $state('');
  let title = $state('');
  let summary = $state('');
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
  let remindersEnabled = $state(true);
  let reminderStates = $state<Record<string, ReminderState>>({});
  let currentTime = $state(Date.now());
  let checkingReminders = false;
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
  let dragging = $state(false);
  let collectionsOpen = $state(true);
  let pinnedOpen = $state(true);
  let collapsedGroups = $state<string[]>([]);
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
  const flagKey = () => `chikota-flags-${data.session?.user.id || 'local'}`;
  const reminderKey = () =>
    `chikota-reminder-state-${data.session?.user.id || 'local'}`;
  const reminderEnabledKey = () =>
    `chikota-reminders-enabled-${data.session?.user.id || 'local'}`;
  const openedWithinSevenDays = (id: string) => {
    const openedAt = Date.parse(flags[id]?.openedAt || '');
    const elapsed = Date.now() - openedAt;
    return Number.isFinite(openedAt) && elapsed >= 0 && elapsed <= 604_800_000;
  };
  let commandBookmarks = $derived(
    $bookmarks
      .filter((bookmark) =>
        `${bookmark.title} ${bookmark.url}`
          .toLowerCase()
          .includes(commandQuery.toLowerCase())
      )
      .slice(0, 6)
  );
  let visible = $derived(
    $bookmarks
      .filter((b) => {
        const matchesSection =
          section === 'all' ||
          (section === 'opened'
            ? openedWithinSevenDays(b.id)
            : section === 'pinned'
              ? flags[b.id]?.pinned
              : section === 'read'
                ? flags[b.id]?.read
                : b.categoryId === section);
        return matchesSection;
      })
      .toSorted((a, b) =>
        section === 'opened'
          ? Date.parse(flags[b.id]?.openedAt || '') -
            Date.parse(flags[a.id]?.openedAt || '')
          : +b.createdAt - +a.createdAt
      )
  );
  let pinned = $derived($bookmarks.filter((b) => flags[b.id]?.pinned));
  let reminderBookmarks = $derived(
    $bookmarks
      .filter((bookmark) => bookmark.reminderAt)
      .toSorted(
        (a, b) =>
          +(a.reminderAt || new Date(0)) - +(b.reminderAt || new Date(0))
      )
  );
  let upcomingReminderCount = $derived(
    reminderBookmarks.filter(
      (bookmark) =>
        reminderStatus(bookmark) === 'active' &&
        +(bookmark.reminderAt || new Date(0)) > currentTime
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
            : $categories.find((c) => c.id === section)?.name || 'collection'
  );
  onMount(() => {
    try {
      reminderStates = JSON.parse(localStorage.getItem(reminderKey()) || '{}');
      remindersEnabled = localStorage.getItem(reminderEnabledKey()) !== 'false';
    } catch {
      reminderStates = {};
    }
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
      void initialize().then(checkReminders);
    } else {
      guestView = 'landing';
    }
    try {
      guideOpen = localStorage.getItem(guideKey) !== 'seen';
    } catch {
      guideOpen = true;
    }
    const reminderTimer = window.setInterval(() => {
      currentTime = Date.now();
      void checkReminders();
    }, 15_000);
    const refresh = (event: StorageEvent) => {
      if (event.key === 'chikota-bookmarks' && !data.session)
        void bookmarks.init(false).catch((e) => toast.error(e.message));
      if (event.key === flagKey()) {
        try {
          flags = JSON.parse(event.newValue || '{}');
        } catch {
          flags = {};
        }
      }
      if (event.key === reminderKey()) {
        try {
          reminderStates = JSON.parse(event.newValue || '{}');
        } catch {
          reminderStates = {};
        }
      }
      if (event.key === reminderEnabledKey())
        remindersEnabled = event.newValue !== 'false';
    };
    window.addEventListener('storage', refresh);
    return () => {
      window.clearInterval(reminderTimer);
      window.removeEventListener('storage', refresh);
      for (const timer of Object.values(copyResetTimers))
        window.clearTimeout(timer);
    };
  });
  async function initialize() {
    try {
      await bookmarks.init(!!data.session);
      const localFlags = JSON.parse(localStorage.getItem(flagKey()) || '{}');
      flags = data.session
        ? Object.fromEntries(
            $bookmarks.map((bookmark) => [
              bookmark.id,
              {
                pinned: bookmark.isPinned,
                read: bookmark.isRead,
                openedAt: bookmark.openedAt?.toISOString()
              }
            ])
          )
        : localFlags;
      ready = true;
      const params = new URLSearchParams(location.search);
      if (params.get('save')) {
        const incoming = safeUrl(params.get('save')!);
        if (!$bookmarks.some((b) => b.url === incoming)) {
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
    } catch (e) {
      loadError =
        e instanceof Error ? e.message : 'could not load your library.';
    }
  }
  function safeUrl(value: string) {
    const parsed = new URL(
      /^https?:\/\//i.test(value.trim())
        ? value.trim()
        : `https://${value.trim()}`
    );
    if (
      !['https:', 'http:'].includes(parsed.protocol) ||
      (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost')
    )
      throw new Error('enter a valid http or https website address.');
    return parsed.href;
  }
  function domain(value: string) {
    try {
      return new URL(value).hostname.replace(/^www\./, '');
    } catch {
      return value;
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
    value: NonNullable<typeof modal>,
    bookmark: Bookmark | null = null
  ) {
    closeContext();
    closeRemindersPanel();
    editing = bookmark;
    formError = '';
    if (value === 'bookmark') {
      url = bookmark?.url || '';
      title = bookmark?.title || '';
      summary = bookmark?.summary || '';
      collection =
        (bookmark?.categoryId &&
        $categories.some((category) => category.id === bookmark.categoryId)
          ? bookmark.categoryId
          : '') ||
        ($categories.some((c) => c.id === section && c.id !== 'all')
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
      const columnRect = document
        .querySelector<HTMLElement>('.reading-column')
        ?.getBoundingClientRect();
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
  function closeModal() {
    dialog?.close();
    modal = null;
  }
  async function openExtensionPanel(target: 'extension' | 'widget' = 'extension') {
    closeContext();
    closeReminderPopover();
    closeRemindersPanel();
    if (modal) closeModal();
    if (extensionPanelCloseTimer) window.clearTimeout(extensionPanelCloseTimer);
    extensionPanelMounted = true;
    await tick();
    requestAnimationFrame(() => {
      extensionPanelOpen = true;
      if (target === 'widget') {
        const widgetSection = document.getElementById('widget-connect');
        if (extensionPanel && widgetSection) {
          extensionPanel.scrollTo({
            top: widgetSection.offsetTop - 16,
            behavior: 'smooth'
          });
          widgetSection.focus({ preventScroll: true });
        }
      } else {
        extensionPanel?.focus({ preventScroll: true });
      }
    });
  }
  function closeExtensionPanel() {
    extensionPanelOpen = false;
    if (extensionPanelCloseTimer) window.clearTimeout(extensionPanelCloseTimer);
    extensionPanelCloseTimer = window.setTimeout(() => {
      extensionPanelMounted = false;
      extensionPanelCloseTimer = undefined;
    }, 350);
  }
  async function openRemindersPanel() {
    closeContext();
    closeReminderPopover();
    closeExtensionPanel();
    if (modal) closeModal();
    if (remindersPanelCloseTimer)
      window.clearTimeout(remindersPanelCloseTimer);
    remindersPanelMounted = true;
    await tick();
    requestAnimationFrame(() => {
      remindersPanelOpen = true;
      remindersPanel?.focus({ preventScroll: true });
    });
  }
  function closeRemindersPanel() {
    remindersPanelOpen = false;
    if (remindersPanelCloseTimer)
      window.clearTimeout(remindersPanelCloseTimer);
    remindersPanelCloseTimer = window.setTimeout(() => {
      remindersPanelMounted = false;
      remindersPanelCloseTimer = undefined;
    }, 350);
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
      toast.success('mac connection code copied');
    } catch {
      toast.error('clipboard is unavailable. select and copy the code instead.');
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
      if ($bookmarks.some((b) => b.url === normalized && b.id !== editing?.id))
        throw new Error('this link is already in your library.');
      const values = {
        url: normalized,
        title: title.trim() || domain(normalized),
        summary: summary.trim(),
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
    } catch (e) {
      formError = e instanceof Error ? e.message : 'could not save bookmark';
    } finally {
      saving = false;
    }
  }
  function toggleFlag(id: string, key: 'pinned' | 'read') {
    setFlags([id], key, !flags[id]?.[key]);
  }
  function setFlags(ids: string[], key: 'pinned' | 'read', value: boolean) {
    const next = { ...flags };
    for (const id of ids) next[id] = { ...next[id], [key]: value };
    try {
      localStorage.setItem(flagKey(), JSON.stringify(next));
      flags = next;
      if (data.session)
        void Promise.all(
          ids.map((id) =>
            bookmarks.updateBookmark(id, {
              [key === 'pinned' ? 'isPinned' : 'isRead']: value
            })
          )
        ).catch(() => toast.error('could not sync this change'));
    } catch {
      toast.error('could not save this change');
    }
    closeContext();
  }
  function recordOpen(id: string) {
    const next = {
      ...flags,
      [id]: { ...flags[id], openedAt: new Date().toISOString() }
    };
    try {
      localStorage.setItem(flagKey(), JSON.stringify(next));
      flags = next;
      if (data.session)
        void bookmarks
          .updateBookmark(id, { openedAt: new Date(next[id].openedAt!) })
          .catch(() => toast.error('could not sync opened status'));
    } catch {
      toast.error('could not update recently opened bookmarks');
    }
  }
  function reminderStatus(bookmark: Bookmark) {
    const saved = reminderStates[bookmark.id]?.status;
    if (saved === 'canceled') return 'canceled';
    if (saved === 'done' || +(bookmark.reminderAt || 0) <= currentTime)
      return 'done';
    return 'active';
  }
  function formatReminder(value: Date) {
    return value.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
  function reminderInputValue(value = new Date(Date.now() + 86_400_000)) {
    const local = new Date(
      value.getTime() - value.getTimezoneOffset() * 60_000
    );
    return local.toISOString().slice(0, 16);
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
  function persistReminderStates(next: Record<string, ReminderState>) {
    localStorage.setItem(reminderKey(), JSON.stringify(next));
    reminderStates = next;
  }
  async function scheduleEmailReminder(
    bookmark: Bookmark,
    when: Date,
    email: string
  ) {
    const response = await fetch('/api/send-reminder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        title: bookmark.title,
        url: bookmark.url,
        reminderAt: when.toISOString()
      })
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || 'could not schedule email');
    return result.id as string;
  }
  async function cancelScheduledEmail(id?: string) {
    if (!id) return;
    const response = await fetch('/api/send-reminder', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (!response.ok && response.status !== 404)
      throw new Error('could not cancel the scheduled email');
  }
  async function saveReminder(event: SubmitEvent) {
    event.preventDefault();
    if (!reminderTarget) return;
    saving = true;
    formError = '';
    try {
      const when = new Date(reminderWhen);
      if (Number.isNaN(+when) || +when <= Date.now())
        throw new Error('choose a time in the future.');
      const email = reminderEmail.trim();
      if (email && !data.session)
        throw new Error(
          'sign in from the account button to use email reminders.'
        );
      if (!email) {
        if (!('Notification' in window))
          throw new Error('browser notifications are not supported here.');
        const permission =
          Notification.permission === 'default'
            ? await Notification.requestPermission()
            : Notification.permission;
        if (permission !== 'granted')
          throw new Error('allow browser notifications to use this reminder.');
      }
      await cancelScheduledEmail(reminderStates[reminderTarget.id]?.emailId);
      const emailId =
        email && remindersEnabled
          ? await scheduleEmailReminder(reminderTarget, when, email)
          : undefined;
      await bookmarks.updateBookmark(reminderTarget.id, {
        reminderAt: when,
        reminderEmail: email
      });
      persistReminderStates({
        ...reminderStates,
        [reminderTarget.id]: {
          status: 'active',
          emailId,
          updatedAt: new Date().toISOString()
        }
      });
      if (reminderPopover) closeReminderPopover();
      else closeModal();
      toast.success(`reminder set for ${formatReminder(when)}`);
    } catch (error) {
      formError =
        error instanceof Error ? error.message : 'could not set reminder';
    } finally {
      saving = false;
    }
  }
  async function cancelReminder(bookmark: Bookmark, announce = true) {
    try {
      await cancelScheduledEmail(reminderStates[bookmark.id]?.emailId);
      persistReminderStates({
        ...reminderStates,
        [bookmark.id]: {
          status: 'canceled',
          updatedAt: new Date().toISOString()
        }
      });
      if (announce) toast.success('reminder canceled');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'could not cancel reminder'
      );
    }
  }
  async function cancelAllReminders() {
    const active = reminderBookmarks.filter(
      (bookmark) => reminderStatus(bookmark) === 'active'
    );
    for (const bookmark of active) await cancelReminder(bookmark, false);
    toast.success(
      `${active.length} ${active.length === 1 ? 'reminder' : 'reminders'} canceled`
    );
  }
  async function toggleAllReminders() {
    saving = true;
    const nextEnabled = !remindersEnabled;
    try {
      const nextStates = { ...reminderStates };
      for (const bookmark of reminderBookmarks) {
        if (reminderStatus(bookmark) !== 'active' || !bookmark.reminderEmail)
          continue;
        const state = nextStates[bookmark.id];
        if (
          nextEnabled &&
          bookmark.reminderAt &&
          +bookmark.reminderAt > Date.now()
        ) {
          const emailId = await scheduleEmailReminder(
            bookmark,
            bookmark.reminderAt,
            bookmark.reminderEmail
          );
          nextStates[bookmark.id] = { ...state, emailId };
        } else {
          await cancelScheduledEmail(state?.emailId);
          nextStates[bookmark.id] = { ...state, emailId: undefined };
        }
      }
      localStorage.setItem(reminderEnabledKey(), String(nextEnabled));
      remindersEnabled = nextEnabled;
      persistReminderStates(nextStates);
      toast.success(nextEnabled ? 'reminders enabled' : 'reminders paused');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'could not update reminders'
      );
    } finally {
      saving = false;
    }
  }
  function playReminderSound() {
    try {
      const audio = new AudioContext();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.setValueAtTime(660, audio.currentTime);
      gain.gain.setValueAtTime(0.0001, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, audio.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.5);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.5);
    } catch {}
  }
  async function checkReminders() {
    if (!remindersEnabled || checkingReminders || !ready) return;
    checkingReminders = true;
    try {
      const nextStates = { ...reminderStates };
      let changed = false;
      for (const bookmark of reminderBookmarks) {
        const storedStatus = reminderStates[bookmark.id]?.status;
        if (
          storedStatus === 'done' ||
          storedStatus === 'canceled' ||
          !bookmark.reminderAt ||
          +bookmark.reminderAt > Date.now()
        )
          continue;
        if (
          !bookmark.reminderEmail &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          const notification = new Notification('chikọta reminder', {
            body: bookmark.title,
            icon: `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(bookmark.url)}&sz=64`
          });
          notification.onclick = () =>
            window.open(bookmark.url, '_blank', 'noopener,noreferrer');
          playReminderSound();
        }
        nextStates[bookmark.id] = {
          ...nextStates[bookmark.id],
          status: 'done',
          updatedAt: new Date().toISOString()
        };
        changed = true;
      }
      if (changed) persistReminderStates(nextStates);
    } finally {
      checkingReminders = false;
    }
  }
  function toggleSelect(id: string) {
    selectedCollections = [];
    collectionSelectionAnchor = null;
    bookmarkSelectionAnchor = id;
    selectMode = true;
    selected = selected.includes(id)
      ? selected.filter((v) => v !== id)
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
    const orderedIds = $categories
      .filter((category) => category.id !== 'all')
      .map((category) => category.id);
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
  async function removeSelected() {
    saving = true;
    try {
      await bookmarks.deleteBookmarks(selected);
      selected = [];
      selectMode = false;
      bookmarkSelectionAnchor = null;
      closeModal();
      toast.success('bookmarks deleted');
    } catch (e) {
      formError = e instanceof Error ? e.message : 'could not delete bookmarks';
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
    } catch (e) {
      formError =
        e instanceof Error ? e.message : 'could not delete collections';
    } finally {
      saving = false;
    }
  }
  async function copyLink(b: Bookmark) {
    try {
      await navigator.clipboard.writeText(b.url);
      showCopied(`bookmark:${b.id}`);
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
        bookmark.widgetEnabled ? 'removed from mac widget' : 'added to mac widget'
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
  function contextKeys(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeContext();
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const buttons = Array.from(
        contextPanel!.querySelectorAll<HTMLButtonElement>('button')
      );
      const index = buttons.indexOf(
        document.activeElement as HTMLButtonElement
      );
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? buttons.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) %
              buttons.length;
      buttons[next]?.focus();
    }
    if (event.key === 'Tab') closeContext();
    if (!event.metaKey && !event.ctrlKey && !event.altKey) {
      const shortcut = event.key.toLowerCase();
      const target = contextPanel?.querySelector<HTMLButtonElement>(
        `button[data-shortcut="${shortcut}"]`
      );
      if (target) {
        event.preventDefault();
        target.click();
      }
    }
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
    const left = Math.min(drag.x, drag.endX),
      right = Math.max(drag.x, drag.endX),
      top = Math.min(drag.y, drag.endY),
      bottom = Math.max(drag.y, drag.endY);
    const hits = Array.from(
      document.querySelectorAll<HTMLElement>('[data-bookmark]')
    )
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.left < right && r.right > left && r.top < bottom && r.bottom > top
        );
      })
      .map((el) => el.dataset.bookmark!);
    selected = [...new Set([...dragBase, ...hits])];
  }
  function keyboard(event: KeyboardEvent) {
    if (view !== 'library') return;
    if (
      event.defaultPrevented ||
      (event.target as HTMLElement).closest('[role="menu"]')
    )
      return;
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      if (modal !== 'command') void openModal('command');
      return;
    }
    if (
      (event.target as HTMLElement).closest('input,textarea,select,dialog') ||
      context
    )
      return;
    if (event.key === 'Escape') {
      if (listToolsOpen) {
        event.preventDefault();
        listToolsOpen = false;
        listToolsTrigger?.focus();
        return;
      }
      selected = [];
      selectedCollections = [];
      selectMode = false;
      bookmarkSelectionAnchor = null;
      collectionSelectionAnchor = null;
    }
    if (event.key === 'n') void openModal('bookmark');
    if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
      event.preventDefault();
      selected = visible.map((b) => b.id);
    }
  }
  function exportLibrary() {
    const blob = new Blob(
      [
        JSON.stringify(
          { bookmarks: $bookmarks, categories: $categories, flags },
          null,
          2
        )
      ],
      { type: 'application/json' }
    );
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = 'chikota-library.json';
    a.click();
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
      for (const [url, title, summary] of examples) {
        if ($bookmarks.some((b) => b.url === url)) continue;
        await bookmarks.addBookmark({
          id: crypto.randomUUID(),
          url,
          title,
          summary,
          tags: [],
          categoryId: '',
          createdAt: new Date()
        });
      }
      toast.success('example bookmarks added — keep or delete any of them');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'could not add examples');
    } finally {
      saving = false;
    }
  }
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
  <div class="reading-column">
    <header class="reading-header">
      <a class="wordmark" href="/" aria-label="chikota home"><h1>chikota</h1></a
      >
      <nav class="library-tabs" aria-label="library">
        <span
          class:opened={section === 'opened'}
          class="tab-indicator"
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
      </nav>
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
              data.session
                ? 'h-auto! w-auto! rounded-none! bg-transparent! hover:bg-transparent!'
                : 'size-7.5! rounded-[5px]! bg-secondary! text-foreground! hover:bg-secondary!'
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
      <section
        data-tour="collections"
        class="collection-section ruled-section"
        aria-labelledby="collections-heading"
      >
        <div class="section-toolbar">
          <button
            class="section-toggle"
            aria-expanded={collectionsOpen}
            aria-controls="collection-content"
            onclick={() => (collectionsOpen = !collectionsOpen)}
            >{#if $categories.filter((c) => c.id !== 'all').length}<FileTrayStacked
                size={14}
              />{:else}<FileTray size={14} />{/if}
            <h2 id="collections-heading">collections</h2>
            <span class="count"
              >{$categories.filter((c) => c.id !== 'all').length}</span
            ><ChevronDown
              size={14}
              class={collectionsOpen ? 'chevron expanded' : 'chevron'}
            /></button
          >
          <button class="plain-button" onclick={() => openModal('collection')}
            ><Plus size={15} /></button
          >
        </div>
        <div
          id="collection-content"
          class="collapse-grid"
          class:open={collectionsOpen}
          inert={!collectionsOpen ? true : undefined}
          aria-hidden={!collectionsOpen}
        >
          <div class="collapse-inner">
            {#if $categories.filter((c) => c.id !== 'all').length}
              <div class="collection-grid">
                {#each $categories.filter((c) => c.id !== 'all') as c}<div
                    class="collection-card"
                    class:active={section === c.id}
                    class:selected={selectedCollections.includes(c.id)}
                  >
                    <button
                      class="collection-main"
                      aria-pressed={selectedCollections.includes(c.id)}
                      onclick={(event) => {
                        if (selectCollectionRange(event, c.id)) return;
                        navigate(section === c.id ? 'all' : c.id);
                      }}
                      ><FileTrayStacked size={15} /><span
                        ><strong>{c.name}</strong><small
                          >{$bookmarks.filter((b) => b.categoryId === c.id)
                            .length}
                          links</small
                        ></span
                      ></button
                    ><button
                      class="collection-menu icon-button"
                      aria-label={`edit ${c.name}`}
                      onclick={() => editCollection(c.id)}
                      ><MoreVertical size={15} /></button
                    >
                  </div>{/each}
              </div>
            {:else}<div class="section-empty collection-empty">
                <EmptyMono />
                <FileTray size={18} class="text-muted-foreground" />
                <strong>no collections yet.</strong>
                <p>group bookmarks by creating a collection.</p>
              </div>{/if}
          </div>
        </div>
      </section>
      {#if section !== 'opened'}<section
          class="pinned-section ruled-section"
          aria-labelledby="pinned-heading"
        >
          <div class="section-toolbar">
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
                  {#each pinned as b}<a
                      class="pin-card"
                      class:selected={selected.includes(b.id)}
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onclick={(event) => {
                        event.preventDefault();
                        if (
                          !selectBookmarkRange(
                            event,
                            b.id,
                            pinned.map((bookmark) => bookmark.id)
                          )
                        )
                          selectBookmark(b.id);
                      }}
                      ><span class="site-letter"
                        >{domain(b.url).slice(0, 1).toUpperCase()}<img
                          src={`https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(b.url)}&sz=32`}
                          alt=""
                          onerror={(event) => event.currentTarget.remove()}
                        /></span
                      >
                      <div>
                        <strong>{b.title}</strong><small>{domain(b.url)}</small>
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
        <div class="section-toolbar library-toolbar">
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
                    selected = visible.map((b) => b.id);
                    selectMode = true;
                  }}><SelectAll size={14} />select all</button
                >
                <button
                  class="plain-button"
                  disabled={!groups.length}
                  onclick={() => {
                    collapsedGroups = groups.every((g) =>
                      collapsedGroups.includes(g.date)
                    )
                      ? []
                      : groups.map((g) => g.date);
                  }}
                  ><CollapseAll size={14} />{groups.length &&
                  groups.every((g) => collapsedGroups.includes(g.date))
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
          {#each groups as group}
            <div
              class="date-group"
              class:collapsed={collapsedGroups.includes(group.date)}
            >
              <button
                class="date-heading"
                aria-expanded={!collapsedGroups.includes(group.date)}
                onclick={() => toggleGroup(group.date)}
                ><span>{group.date}</span><span class="count"
                  >{group.items.length}</span
                ><ChevronDown
                  size={14}
                  class={!collapsedGroups.includes(group.date)
                    ? 'chevron expanded'
                    : 'chevron'}
                /></button
              >
              <div class="collapse-grid open">
                <div class="collapse-inner">
                  {#if collapsedGroups.includes(group.date)}
                    <button
                      type="button"
                      class="flex w-full flex-col gap-1.5 px-0 pt-0 pb-2"
                      aria-label={`expand ${group.items.length} bookmarks from ${group.date}`}
                      onclick={() => toggleGroup(group.date)}
                    >
                      {#each { length: Math.min(group.items.length, 5) }, i}
                        <span
                          class={[
                            'block h-0 w-full border-b border-dotted border-border',
                            i === 0 && 'opacity-90',
                            i === 1 && 'opacity-70',
                            i === 2 && 'opacity-50',
                            i === 3 && 'opacity-35',
                            i === 4 && 'opacity-20'
                          ]}
                        ></span>
                      {/each}
                      <span
                        class="text-center text-[10px] leading-none text-muted-foreground"
                        >{group.items.length}
                        {group.items.length === 1 ? 'link' : 'links'}</span
                      >
                    </button>
                  {:else}
                    <div
                      class="bookmark-items"
                      role="listbox"
                      tabindex="-1"
                      aria-multiselectable="true"
                      aria-label={`bookmarks saved ${group.date}; drag across rows to select`}
                      onpointerdown={startDrag}
                    >
                      {#each group.items as b (b.id)}
                        <div
                          data-bookmark={b.id}
                          class="bookmark-row"
                          role="option"
                          tabindex="0"
                          aria-selected={selected.includes(b.id)}
                          class:selected={selected.includes(b.id)}
                          class:is-read={flags[b.id]?.read}
                          class:context-active={context?.bookmark?.id === b.id}
                          onclick={(event) => {
                            if (dragging) {
                              event.preventDefault();
                              dragging = false;
                              return;
                            }
                            if (
                              (event.target as HTMLElement).closest(
                                'button,input'
                              )
                            )
                              return;
                            event.preventDefault();
                            if (
                              !selectBookmarkRange(
                                event,
                                b.id,
                                visible.map((bookmark) => bookmark.id)
                              )
                            )
                              selectBookmark(b.id);
                          }}
                          onkeydown={(event) => {
                            if (
                              event.target !== event.currentTarget ||
                              !['Enter', ' '].includes(event.key)
                            )
                              return;
                            event.preventDefault();
                            selectBookmark(b.id);
                          }}
                          oncontextmenu={(e) => {
                            e.stopPropagation();
                            void showContext(e, b);
                          }}
                          aria-label={b.title}
                        >
                          <div class="bookmark-leading">
                            <span
                              class="site-letter"
                              class:show-check={selectMode ||
                                selected.includes(b.id)}
                              ><Globe size={18} /><img
                                src={`https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(b.url)}&sz=32`}
                                alt=""
                                onerror={(event) =>
                                  event.currentTarget.remove()}
                              /></span
                            ><input
                              class="row-check"
                              class:check-visible={selectMode ||
                                selected.includes(b.id)}
                              type="checkbox"
                              checked={selected.includes(b.id)}
                              onclick={(event) => {
                                if (
                                  !selectBookmarkRange(
                                    event,
                                    b.id,
                                    visible.map((bookmark) => bookmark.id)
                                  )
                                )
                                  event.stopPropagation();
                              }}
                              onchange={() => toggleSelect(b.id)}
                              aria-label={`select ${b.title}`}
                            />
                          </div>
                          <div class="bookmark-content">
                            <a
                              class="bookmark-title"
                              href={b.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              >{b.title}<ArrowUpRight size={14} /></a
                            >
                            <div class="bookmark-meta">
                              <span>{domain(b.url)}</span>
                            </div>
                          </div>
                          <div class="row-actions">
                            <button
                              class="icon-button"
                              class:reminder-active={reminderStatus(b) ===
                                'active' && !!b.reminderAt}
                              aria-label={`remind me about ${b.title}`}
                              title={b.reminderAt
                                ? formatReminder(b.reminderAt)
                                : 'set reminder'}
                              onclick={(event) =>
                                void showReminderPopover(event, b)}
                              ><ActionBell size={14} /></button
                            >
                            <button
                              class="icon-button"
                              class:pinned={flags[b.id]?.pinned}
                              aria-label={flags[b.id]?.pinned
                                ? `unpin ${b.title}`
                                : `pin ${b.title}`}
                              title={flags[b.id]?.pinned ? 'unpin' : 'pin'}
                              onclick={(event) => {
                                event.stopPropagation();
                                toggleFlag(b.id, 'pinned');
                              }}><Pin size={14} /></button
                            ><button
                              class="icon-button"
                              aria-label={copiedTargets.includes(
                                `bookmark:${b.id}`
                              )
                                ? `link copied for ${b.title}`
                                : `copy link for ${b.title}`}
                              title="copy link"
                              onclick={(event) => {
                                event.stopPropagation();
                                void copyLink(b);
                              }}><CopyIconSwap
                                copied={copiedTargets.includes(
                                  `bookmark:${b.id}`
                                )}
                                size={14}
                              /></button
                            >
                            <button
                              class="icon-button"
                              title="more options"
                              aria-label={`more options for ${b.title}`}
                              onclick={(e) => showContext(e, b)}
                              ><EllipsisVertical size={16} /></button
                            >
                          </div>
                          {#if b.reminderAt && reminderStatus(b) === 'done'}<span
                              class="reminder-done-marker"
                              title="reminder completed"
                              aria-label="reminder completed"
                              ><ReminderDone size={16} /></span
                            >{/if}
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
            </div>
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

  <button
    type="button"
    class="fixed right-5 bottom-5 z-40 grid size-8 place-items-center bg-transparent p-0 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    aria-label="install the mac desktop widget"
    aria-haspopup="dialog"
    aria-controls="extension-panel"
    aria-expanded={extensionPanelOpen}
    title="mac desktop widget"
    onclick={() => void openExtensionPanel('widget')}
  >
    <MacWidgetLauncher />
  </button>

  {#if extensionPanelMounted}<div
      bind:this={extensionPanel}
      id="extension-panel"
      class="extension-panel t-panel-slide"
      data-open={extensionPanelOpen}
      role="dialog"
      aria-modal="false"
      aria-labelledby="extension-panel-title"
      tabindex="-1"
      onkeydown={(event) => {
        if (event.key === 'Escape') closeExtensionPanel();
      }}
    >
      <div class="extension-panel-heading">
        <BrowserExtension size={18} /><span>browser extension</span><button
          class="icon-button small"
          aria-label="close browser extension panel"
          onclick={closeExtensionPanel}><Cross2 size={14} /></button
        >
      </div>
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
      <section
        id="widget-connect"
        class="widget-connect"
        tabindex="-1"
        aria-labelledby="widget-connect-title"
      >
        <div class="widget-connect-heading">
          <GuideLauncher size={16} /><strong id="widget-connect-title"
            >mac desktop widget</strong
          >
        </div>
        <p>
          reminders, pinned links, and recent opens stay available from your
          desktop, including while offline.
        </p>
        <ol class="widget-setup-steps">
          <li>
            run the <strong>Chikota</strong> macOS app from the included Xcode
            project.
          </li>
          <li>
            create a connection code below, then paste it and this site’s
            address into the Mac app and choose <strong>connect</strong>.
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
        {#if data.session}
          {#if widgetToken}<button
              class="widget-token"
              aria-label={copiedTargets.includes('widget-token')
                ? 'mac connection code copied'
                : 'copy mac connection code'}
              onclick={copyWidgetToken}><code>{widgetToken}</code><CopyIconSwap
                copied={copiedTargets.includes('widget-token')}
                size={14}
              /></button
            ><small>shown once. paste this code into the mac app.</small
            >{:else}<button
              class="secondary-button"
              disabled={widgetTokenBusy}
              onclick={createWidgetToken}
              >{widgetTokenBusy
                ? 'creating…'
                : 'create mac connection code'}</button
            >{/if}
          <p class="form-error" role="alert">{widgetTokenError}</p>
        {:else}<button
            class="secondary-button"
            onclick={() => authClient.signIn.social({ provider: 'google' })}
            >sign in to connect the widget</button
          >
        {/if}
      </section>
    </div>{/if}

  {#if remindersPanelMounted}<div
      bind:this={remindersPanel}
      class="extension-panel reminders-panel t-panel-slide"
      data-open={remindersPanelOpen}
      role="dialog"
      aria-modal="false"
      aria-labelledby="reminders-panel-title"
      tabindex="-1"
      onkeydown={(event) => {
        if (event.key === 'Escape') closeRemindersPanel();
      }}
    >
      <div class="extension-panel-heading">
        <ActionBell size={18} /><span>reminders</span><button
          class="icon-button small"
          aria-label="close reminders panel"
          onclick={closeRemindersPanel}><Cross2 size={14} /></button
        >
      </div>
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
          {#each reminderBookmarks as bookmark}{@const status =
              reminderStatus(bookmark)}
            <div
              class:done={status === 'done'}
              class:canceled={status === 'canceled'}
              class="reminder-table-row"
              role="row"
            >
              <div class="reminder-bookmark-cell" role="cell">
                <span class="reminder-favicon"
                  >{domain(bookmark.url).slice(0, 1).toUpperCase()}<img
                    src={`https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(bookmark.url)}&sz=32`}
                    alt=""
                    onerror={(event) => event.currentTarget.remove()}
                  /></span
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
                    onclick={() => cancelReminder(bookmark)}
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
    </div>{/if}

  {#if selectedCollections.length}<div
      class="selection-toolbar"
      role="region"
      aria-label="collection selection actions"
    >
      <span><CheckCircled />{selectedCollections.length} selected</span><button
        onclick={() => openModal('delete-collections')}
        ><DeleteTrash />delete</button
      ><button
        aria-label="clear collection selection"
        onclick={() => {
          selectedCollections = [];
          collectionSelectionAnchor = null;
        }}><Cross2 /></button
      >
    </div>{:else if selected.length}<div
      class="selection-toolbar bookmark-selection-toolbar"
      role="region"
      aria-label="selection actions"
    >
      <button
        aria-label="clear selection"
        title="clear selection"
        onclick={() => {
          selected = [];
          selectMode = false;
          bookmarkSelectionAnchor = null;
        }}><Cross2 /></button
      ><span>{selected.length} selected</span><button
        aria-label="select all bookmarks"
        title="select all"
        onclick={() => (selected = visible.map((b) => b.id))}
        ><SelectAll /></button
      ><button
        aria-label={selectionPinned
          ? 'unpin selected bookmarks'
          : 'pin selected bookmarks'}
        title={selectionPinned ? 'unpin' : 'pin'}
        onclick={() => {
          setFlags(selected, 'pinned', !selectionPinned);
          selected = [];
          selectMode = false;
          bookmarkSelectionAnchor = null;
        }}><Pin /></button
      ><button
        aria-label="mark selected bookmarks as read"
        title="mark as read"
        onclick={() => {
          setFlags(selected, 'read', true);
          selected = [];
          selectMode = false;
          bookmarkSelectionAnchor = null;
        }}><ActionRead /></button
      ><button
        aria-label="delete selected bookmarks"
        title="delete"
        onclick={() => openModal('delete')}><DeleteTrash /></button
      >
    </div>{/if}
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
      <form class="reminder-popover-form" onsubmit={saveReminder}>
        <label
          >date and time<input
            type="datetime-local"
            bind:value={reminderWhen}
            min={reminderInputValue(new Date())}
            required
          /></label
        ><label
          >email <span>optional</span><input
            type="email"
            bind:value={reminderEmail}
            placeholder="browser notification"
            autocomplete="email"
          /></label
        >
        <p class="form-error" role="alert">{formError}</p>
        <div class="reminder-popover-actions">
          {#if reminderTarget.reminderAt && reminderStatus(reminderTarget) === 'active'}<button
              type="button"
              class="plain-button danger-text"
              onclick={() => {
                void cancelReminder(reminderTarget!);
                closeReminderPopover();
              }}>cancel reminder</button
            >{/if}<button class="primary-button" disabled={saving}
            >{saving ? 'saving…' : 'set reminder'}<SaveCloud
              size={14}
            /></button
          >
        </div>
      </form>
    </div>
  {/if}
  {#if context}
    <button
      class="context-backdrop"
      aria-label="close context menu"
      onclick={closeContext}
      oncontextmenu={(e) => {
        e.preventDefault();
        closeContext();
      }}
      tabindex="-1"
    ></button>
    <div
      bind:this={contextPanel}
      class="context-menu"
      role="menu"
      tabindex="-1"
      onkeydown={contextKeys}
      style:left={`${context.x}px`}
      style:top={`${context.y}px`}
    >
      {#if context.bookmark}{@const b = context.bookmark}<button
          role="menuitem"
          data-shortcut="o"
          onclick={() => {
            recordOpen(b.id);
            window.open(b.url, '_blank', 'noopener,noreferrer');
            closeContext();
          }}
          ><ArrowUpRight /><span>open bookmark</span><kbd><KeyboardDown />O</kbd
          ></button
        ><button
          role="menuitem"
          data-shortcut="e"
          onclick={() => openModal('bookmark', b)}
          ><ActionEdit /><span>edit bookmark</span><kbd><KeyboardDown />E</kbd
          ></button
        ><button
          role="menuitem"
          data-shortcut="r"
          onclick={() => openModal('reminder', b)}
          ><ActionBell /><span
            >{b.reminderAt ? 'edit reminder' : 'set reminder'}</span
          ><kbd><KeyboardDown />R</kbd></button
        ><button
          role="menuitem"
          data-shortcut="p"
          onclick={() => toggleFlag(b.id, 'pinned')}
          ><Pin /><span
            >{flags[b.id]?.pinned ? 'unpin bookmark' : 'pin bookmark'}</span
          ><kbd><KeyboardDown />P</kbd></button
        ><button
          role="menuitem"
          data-shortcut="m"
          onclick={() => toggleFlag(b.id, 'read')}
          ><ActionRead /><span
            >{flags[b.id]?.read ? 'mark as unread' : 'mark as read'}</span
          ><kbd><KeyboardDown />M</kbd></button
        >{#if data.session}<button
            role="menuitem"
            data-shortcut="w"
            onclick={() => void toggleWidgetBookmark(b)}
            ><GuideLauncher /><span>{b.widgetEnabled
              ? 'remove from mac widget'
              : 'add to mac widget'}</span><kbd><KeyboardDown />W</kbd></button
          >{/if}
        <hr />
        <button
          role="menuitem"
          class="danger-text"
          data-shortcut="d"
          onclick={() => {
            selected = [b.id];
            void openModal('delete');
          }}
          ><DeleteTrash /><span>delete bookmark</span><kbd
            ><KeyboardDown />D</kbd
          ></button
        >{:else}<button
          role="menuitem"
          onclick={() => {
            navigate('all');
            closeContext();
          }}><BookmarkIcon />open chikota</button
        ><button role="menuitem" onclick={() => openModal('bookmark')}
          ><Plus />save a link</button
        ><button role="menuitem" onclick={() => openModal('collection')}
          ><FileTray />new collection</button
        >
        <hr />
        <button role="menuitem" onclick={() => openModal('settings')}
          ><ActionSettings />appearance & settings</button
        >{/if}
    </div>
  {/if}

  <dialog
    bind:this={dialog}
    class="app-dialog"
    class:command-positioned={modal === 'command'}
    class:settings-dialog={modal === 'settings'}
    style:top={modal === 'command' ? `${commandPosition.top}px` : undefined}
    style:left={modal === 'command' ? `${commandPosition.left}px` : undefined}
    style:width={modal === 'command' ? `${commandPosition.width}px` : undefined}
    aria-labelledby="dialog-title"
    onclose={() => (modal = null)}
    onclick={(e) => {
      if (e.target === dialog && !saving) closeModal();
    }}
    oncancel={(e) => {
      if (saving) e.preventDefault();
    }}
  >
    {#if modal}<div class="dialog-inner">
        {#if modal !== 'command'}<button
            class="dialog-close icon-button"
            aria-label="close dialog"
            disabled={saving}
            onclick={closeModal}><Cross2 /></button
          >{/if}
        {#if modal === 'command'}<div class="command-dialog">
            <h2 id="dialog-title" class="sr-only">command menu</h2>
            <div class="command-input">
              <SearchGrid size={17} /><input
                bind:this={searchInput}
                bind:value={commandQuery}
                aria-label="command menu"
                placeholder="search bookmarks or run a command…"
              /><kbd>esc</kbd>
            </div>
            <div class="command-results">
              <p>actions</p>
              <button onclick={() => openFromCommand('bookmark')}
                ><Plus />save a link<span class="single-shortcut"
                  ><KeyboardDown />N</span
                ></button
              ><button onclick={() => openFromCommand('collection')}
                ><FileTray />new collection</button
              ><button onclick={() => openFromCommand('settings')}
                ><ActionSettings />open settings</button
              >
              {#if commandBookmarks.length}
                <p>bookmarks</p>
                {#each commandBookmarks as bookmark}<a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onclick={() => {
                      recordOpen(bookmark.id);
                      closeModal();
                    }}
                    ><span class="command-favicon"
                      >{domain(bookmark.url).slice(0, 1).toUpperCase()}</span
                    ><span
                      ><strong>{bookmark.title}</strong><small
                        >{bookmark.url}</small
                      ></span
                    ><ArrowUpRight size={13} /></a
                  >{/each}
              {/if}
            </div>
          </div>
        {:else if modal === 'bookmark'}<div class="dialog-symbol">
            <BookmarkIcon size={22} />
          </div>
          <h2 id="dialog-title">
            {editing ? 'a little fine-tuning.' : 'a good find, kept.'}
          </h2>
          <p class="dialog-description">
            {editing
              ? 'update the details that help you find it again.'
              : 'save a link now. come back when you have a moment.'}
          </p>
          <form class="bookmark-form" onsubmit={saveBookmark}>
            <label
              ><input
                bind:value={url}
                placeholder="url"
                required
                aria-describedby="form-error"
              /></label
            ><label
              ><input
                bind:value={title}
                placeholder="title (optional)"
                maxlength="300"
              /></label
            ><label
              ><textarea
                bind:value={summary}
                placeholder="note (optional)"
                rows="2"
                maxlength="2000"></textarea></label
            >
            <label
              ><select bind:value={collection}
                ><option value="">no collection</option
                >{#each $categories.filter((c) => c.id !== 'all') as c}<option
                    value={c.id}>{c.name}</option
                  >{/each}</select
              ></label
            >
            <p class="form-error" id="form-error" role="alert">{formError}</p>
            <div class="dialog-actions">
              <button
                type="button"
                class="secondary-button"
                disabled={saving}
                onclick={closeModal}>cancel</button
              ><button class="primary-button" disabled={saving}
                >{saving
                  ? 'saving…'
                  : editing
                    ? 'save changes'
                    : 'save bookmark'}<SaveCloud /></button
              >
            </div>
          </form>
        {:else if modal === 'collection' || modal === 'collection-edit'}<div
            class="dialog-symbol"
          >
            <FileTray size={22} />
          </div>
          <h2 id="dialog-title">
            {editingCollectionId
              ? 'rename collection.'
              : 'a place for an interest.'}
          </h2>
          <p class="dialog-description">
            {editingCollectionId
              ? 'change its name or remove it from chikota.'
              : 'keep related links together in a collection.'}
          </p>
          <form class="collection-form" onsubmit={saveCollection}>
            <label
              ><input
                bind:value={collectionName}
                placeholder="collection name"
                required
                maxlength="60"
              /></label
            >
            <p class="form-error" role="alert">{formError}</p>
            <div class="dialog-actions">
              {#if editingCollectionId}<button
                  type="button"
                  class="secondary-button delete-collection"
                  class:danger-text={collectionDeleteConfirm}
                  onclick={removeCollection}
                  >{collectionDeleteConfirm
                    ? 'confirm delete'
                    : 'delete'}</button
                >{/if}
              <button
                type="button"
                class="secondary-button"
                onclick={closeModal}>cancel</button
              ><button class="primary-button"
                >{editingCollectionId
                  ? 'save name'
                  : 'create collection'}<SaveCloud /></button
              >
            </div>
          </form>
        {:else if modal === 'reminder' && reminderTarget}<div
            class="dialog-symbol"
          >
            <ActionBell size={22} />
          </div>
          <h2 id="dialog-title">bring it back at the right time.</h2>
          <p class="dialog-description reminder-description">
            set a reminder for <strong>{reminderTarget.title}</strong>.
          </p>
          <form onsubmit={saveReminder}>
            <label
              >date and time<input
                type="datetime-local"
                bind:value={reminderWhen}
                min={reminderInputValue(new Date())}
                required
              /></label
            ><label
              >email <span>optional</span><input
                type="email"
                bind:value={reminderEmail}
                placeholder="leave empty for a browser notification"
                autocomplete="email"
              /></label
            >
            <div class="delivery-note">
              {#if reminderEmail.trim()}<Mail />scheduled email only{:else}<ActionBell
                />browser notification with a soft sound{/if}
            </div>
            <p class="form-error" role="alert">{formError}</p>
            <div class="dialog-actions">
              {#if reminderTarget.reminderAt && reminderStatus(reminderTarget) === 'active'}<button
                  type="button"
                  class="secondary-button delete-collection"
                  onclick={() => {
                    void cancelReminder(reminderTarget!);
                    closeModal();
                  }}>cancel reminder</button
                >{/if}
              <button
                type="button"
                class="secondary-button"
                disabled={saving}
                onclick={closeModal}>close</button
              ><button class="primary-button" disabled={saving}
                >{saving ? 'saving…' : 'set reminder'}<SaveCloud /></button
              >
            </div>
          </form>
        {:else if modal === 'settings'}<div class="settings-shell">
            <nav class="settings-tabs" aria-label="settings sections">
              <button
                class:active={settingsTab === 'appearance'}
                aria-pressed={settingsTab === 'appearance'}
                onclick={() => (settingsTab = 'appearance')}
                ><ActionSettings />appearance</button
              ><button
                class:active={settingsTab === 'reminders'}
                aria-pressed={settingsTab === 'reminders'}
                onclick={() => (settingsTab = 'reminders')}
                ><ActionBell />reminders</button
              ><button
                class:active={settingsTab === 'about'}
                aria-pressed={settingsTab === 'about'}
                onclick={() => (settingsTab = 'about')}><Info />about</button
              >
            </nav>
            <section class="settings-panel">
              {#if settingsTab === 'appearance'}<h2 id="dialog-title">
                  make it feel like you.
                </h2>
                <p class="dialog-description">
                  a different atmosphere. the same quiet space.
                </p>
                <div class="theme-options">
                  {#each themes as theme}<button
                      class:theme-selected={themeStore.current === theme.id}
                      aria-pressed={themeStore.current === theme.id}
                      onclick={() => themeStore.set(theme.id)}
                      ><span class="theme-preview" data-preview={theme.id}
                        ><span class="preview-sidebar"></span><span
                          class="preview-content"><i></i><i></i><i></i></span
                        >{#if themeStore.current === theme.id}<span
                            class="theme-check"><Check size={12} /></span
                          >{/if}</span
                      ><strong>{theme.name}</strong><small
                        >{theme.description}</small
                      ></button
                    >{/each}
                </div>
                <p class="settings-note">
                  {data.session
                    ? 'bookmarks sync to your account. collections, pins, and reading status are stored on this device.'
                    : 'your links are saved in this browser. export a copy to keep a backup.'}
                </p>
                <button class="settings-row" onclick={exportLibrary}
                  ><Download />export library<span
                    >json<ArrowUpRight size={13} /></span
                  ></button
                ><button
                  class="settings-row"
                  onclick={() => {
                    closeModal();
                    void openExtensionPanel();
                  }}
                  ><BrowserExtension />browser extension<span
                    >set up<ArrowUpRight size={13} /></span
                  ></button
                >{#if data.session}<button
                    class="settings-row"
                    onclick={async () => {
                      await authClient.signOut();
                      location.reload();
                    }}><LogOut />sign out</button
                  >{/if}
              {:else if settingsTab === 'reminders'}<h2 id="dialog-title">
                  reminder delivery
                </h2>
                <p class="dialog-description">
                  pause every reminder or clear the active queue.
                </p>
                <div class="reminder-setting">
                  <div>
                    <strong>all reminders</strong><small
                      >{remindersEnabled
                        ? `${upcomingReminderCount} upcoming`
                        : 'delivery is paused'}</small
                    >
                  </div>
                  <button
                    class:enabled={remindersEnabled}
                    class="settings-switch"
                    role="switch"
                    aria-checked={remindersEnabled}
                    aria-label="toggle all reminders"
                    disabled={saving}
                    onclick={toggleAllReminders}><span></span></button
                  >
                </div>
                <button
                  class="settings-row danger-text"
                  disabled={!reminderBookmarks.some(
                    (bookmark) => reminderStatus(bookmark) === 'active'
                  )}
                  onclick={cancelAllReminders}
                  ><BellOff />cancel all active reminders</button
                ><button
                  class="settings-row"
                  onclick={() => {
                    closeModal();
                    void openRemindersPanel();
                  }}
                  ><ActionBell />view notifications<span
                    >{reminderBookmarks.length}<ArrowUpRight size={13} /></span
                  ></button
                >
              {:else}<h2 id="dialog-title">chikọta <span>v1.0.0</span></h2>
                <p class="about-copy">
                  “chikọta” is igbo for “bring together”—a quiet, beautiful
                  place to gather the links you want to keep, read, and
                  rediscover.
                </p>
                <div class="about-mark"><BookmarkFilled /></div>
              {/if}
            </section>
          </div>
        {:else if modal === 'delete'}<div class="dialog-symbol">
            <DeleteTrash size={22} />
          </div>
          <h2 id="dialog-title">let these links go?</h2>
          <p class="dialog-description">
            delete {selected.length} selected {selected.length === 1
              ? 'bookmark'
              : 'bookmarks'} from your library. this cannot be undone.
          </p>
          <p class="form-error" role="alert">{formError}</p>
          <div class="dialog-actions">
            <button
              class="secondary-button"
              disabled={saving}
              onclick={closeModal}>keep bookmarks</button
            ><button
              class="primary-button destructive"
              disabled={saving}
              onclick={removeSelected}
              >{saving ? 'deleting…' : 'delete bookmarks'}</button
            >
          </div>
        {:else if modal === 'delete-collections'}<div class="dialog-symbol">
            <DeleteTrash size={22} />
          </div>
          <h2 id="dialog-title">remove these collections?</h2>
          <p class="dialog-description">
            delete {selectedCollections.length} selected {selectedCollections.length ===
            1
              ? 'collection'
              : 'collections'}. their bookmarks will remain in your library.
          </p>
          <p class="form-error" role="alert">{formError}</p>
          <div class="dialog-actions">
            <button
              class="secondary-button"
              disabled={saving}
              onclick={closeModal}>keep collections</button
            ><button
              class="primary-button destructive"
              disabled={saving}
              onclick={removeSelectedCollections}
              >{saving ? 'deleting…' : 'delete collections'}</button
            >
          </div>{/if}
      </div>{/if}
  </dialog>

  <WelcomeGuide
    open={guideOpen}
    suspended={modal !== null}
    ondismiss={dismissGuide}
  />
{/if}

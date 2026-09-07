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
  import {
    Search,
    MixerVertical,
    Plus,
    Bookmark as BookmarkIcon,
    BookmarkFilled,
    Reader,
    Archive,
    Pin,
    Check,
    CheckCircled,
    ArrowUpRight,
    ArrowRight,
    Cross2,
    MoreVertical,
    Settings,
    Download,
    Trash2,
    Pencil,
    Copy,
    Globe,
    ChevronDown,
    LogOut,
    User,
    Bell,
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
    | 'extension'
    | 'delete'
    | 'delete-collections'
    | 'reminder'
    | 'notifications'
    | null
  >(null);
  let dialog = $state<HTMLDialogElement>();
  let searchInput = $state<HTMLInputElement>();
  let commandTrigger = $state<HTMLButtonElement>();
  let commandPosition = $state({ top: 0, left: 0, width: 0 });
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
    };
  });
  async function initialize() {
    try {
      await bookmarks.init(!!data.session);
      flags = JSON.parse(localStorage.getItem(flagKey()) || '{}');
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
      closeModal();
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
    selectedCollections = [];
    collectionSelectionAnchor = null;
    selected = [...new Set([...selected, ...orderedIds.slice(start, end + 1)])];
    bookmarkSelectionAnchor = id;
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
      toast.success('link copied');
    } catch {
      toast.error(
        'clipboard is unavailable. open the bookmark to copy its address.'
      );
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
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 240)),
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
  >{#if view === 'library'}<title>chikota — your reading room</title>{/if}</svelte:head
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
    <a class="wordmark" href="/" aria-label="chikota home"><h1>chikota</h1></a>
    <nav class="library-tabs" aria-label="library">
      <span
        class:opened={section === 'opened'}
        class="tab-indicator"
        aria-hidden="true"
      ></span>
      <button
        class:active={section === 'opened'}
        aria-label="opened in the last 7 days"
        aria-pressed={section === 'opened'}
        onclick={() => navigate('opened')}
        ><span class:filled-reader={section === 'opened'} class="tab-reader"
          ><Reader size={12} /></span
        >opened</button
      >
      <button
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
        class="icon-button"
        aria-label="search bookmarks"
        title="search bookmarks"
        onclick={() => openModal('command')}><Search /></button
      >
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          data-tour="account"
          class="icon-button notification-trigger"
          aria-label="account menu"
          title="account menu"
          ><User />{#if upcomingReminderCount}<span
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
              ><Settings size={14} />settings</DropdownMenu.Item
            >
            <DropdownMenu.Item
              class="list-options-item"
              onSelect={() => openModal('notifications')}
              ><Bell size={14} />reminders{#if upcomingReminderCount}
                · {upcomingReminderCount}{/if}</DropdownMenu.Item
            >
            <DropdownMenu.Item
              class="list-options-item"
              onSelect={() => openModal('extension')}
              ><Globe size={14} />browser extension</DropdownMenu.Item
            >
            <DropdownMenu.Item
              class="list-options-item"
              onSelect={() => (guideOpen = true)}
              ><Info size={14} />welcome guide</DropdownMenu.Item
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
                ><User size={14} />sign in with google</DropdownMenu.Item
              >{/if}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
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
          ><Archive size={14} />
          <h2 id="collections-heading">collections</h2>
          <span class="count"
            >{$categories.filter((c) => c.id !== 'all').length}</span
          ><ChevronDown
            size={14}
            class={collectionsOpen ? 'chevron expanded' : 'chevron'}
          /></button
        >
        <button class="plain-button" onclick={() => openModal('collection')}
          ><Plus size={15} />new collection</button
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
                    ><Archive size={15} /><span
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
                      if (
                        selectBookmarkRange(
                          event,
                          b.id,
                          pinned.map((bookmark) => bookmark.id)
                        )
                      )
                        return;
                      recordOpen(b.id);
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
            onclick={() => openModal('bookmark')}
            ><Plus size={15} />save a link</button
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
                }}><Check size={13} />select</button
              >
              <button
                class="plain-button"
                disabled={!visible.length}
                onclick={() => {
                  selected = visible.map((b) => b.id);
                  selectMode = true;
                }}><CheckCircled size={13} />select all</button
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
                ><ChevronDown size={13} />{groups.length &&
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
            <div
              class="collapse-grid"
              class:open={!collapsedGroups.includes(group.date)}
              inert={collapsedGroups.includes(group.date) ? true : undefined}
              aria-hidden={collapsedGroups.includes(group.date)}
            >
              <div class="collapse-inner">
                <div
                  class="bookmark-items"
                  role="group"
                  aria-label={`bookmarks saved ${group.date}; drag across rows to select`}
                  onpointerdown={startDrag}
                >
                  {#each group.items as b (b.id)}
                    <article
                      data-bookmark={b.id}
                      class="bookmark-row"
                      class:selected={selected.includes(b.id)}
                      class:is-read={flags[b.id]?.read}
                      class:context-active={context?.bookmark?.id === b.id}
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
                          >{domain(b.url).slice(0, 1).toUpperCase()}<img
                            src={`https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(b.url)}&sz=32`}
                            alt=""
                            onerror={(event) => event.currentTarget.remove()}
                          /></span
                        ><input
                          class="row-check"
                          class:check-visible={selectMode ||
                            selected.includes(b.id)}
                          type="checkbox"
                          checked={selected.includes(b.id)}
                          onclick={(event) =>
                            selectBookmarkRange(
                              event,
                              b.id,
                              visible.map((bookmark) => bookmark.id)
                            )}
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
                          onclick={(event) => {
                            if (
                              selectBookmarkRange(
                                event,
                                b.id,
                                visible.map((bookmark) => bookmark.id)
                              )
                            )
                              return;
                            recordOpen(b.id);
                          }}>{b.title}<ArrowUpRight size={14} /></a
                        >
                        <div class="bookmark-meta">
                          <span>{b.url}</span>
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
                          onclick={(event) => {
                            event.stopPropagation();
                            void openModal('reminder', b);
                          }}><Bell size={14} /></button
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
                          aria-label={`copy link for ${b.title}`}
                          title="copy link"
                          onclick={(event) => {
                            event.stopPropagation();
                            void copyLink(b);
                          }}><Copy size={14} /></button
                        >
                        <button
                          class="icon-button"
                          title="more options"
                          aria-label={`more options for ${b.title}`}
                          onclick={(e) => showContext(e, b)}
                          ><MoreVertical size={16} /></button
                        >
                      </div>
                    </article>
                  {/each}
                </div>
              </div>
            </div>
          </div>
        {/each}
      {:else}<div class="section-empty bookmarks-empty">
          <strong>no bookmarks here yet.</strong>
          <p>
            {section === 'opened'
              ? 'bookmarks you open will stay here for 7 days.'
              : 'save a link to start your collection.'}
          </p>
          {#if section !== 'all'}<button
              class="plain-button"
              onclick={() => {
                navigate('all');
              }}>view bookmarks<ArrowRight size={14} /></button
            >{:else}<button
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

{#if selectedCollections.length}<div
    class="selection-toolbar"
    role="region"
    aria-label="collection selection actions"
  >
    <span><CheckCircled />{selectedCollections.length} selected</span><button
      onclick={() => openModal('delete-collections')}><Trash2 />delete</button
    ><button
      aria-label="clear collection selection"
      onclick={() => {
        selectedCollections = [];
        collectionSelectionAnchor = null;
      }}><Cross2 /></button
    >
  </div>{:else if selected.length}<div
    class="selection-toolbar"
    role="region"
    aria-label="selection actions"
  >
    <span><CheckCircled />{selected.length} selected</span><button
      onclick={() => (selected = visible.map((b) => b.id))}>select all</button
    ><button
      onclick={() => {
        setFlags(selected, 'pinned', !selectionPinned);
        selected = [];
        selectMode = false;
        bookmarkSelectionAnchor = null;
      }}><Pin />{selectionPinned ? 'unpin' : 'pin'}</button
    ><button
      onclick={() => {
        setFlags(selected, 'read', true);
        selected = [];
        selectMode = false;
        bookmarkSelectionAnchor = null;
      }}><CheckCircled />mark read</button
    ><button
      aria-label="delete selected bookmarks"
      onclick={() => openModal('delete')}><Trash2 /></button
    ><button
      aria-label="clear selection"
      onclick={() => {
        selected = [];
        selectMode = false;
        bookmarkSelectionAnchor = null;
      }}><Cross2 /></button
    >
  </div>{/if}
{#if drag && dragging}<div
    class="selection-marquee"
    style:left={`${Math.min(drag.x, drag.endX)}px`}
    style:top={`${Math.min(drag.y, drag.endY)}px`}
    style:width={`${Math.abs(drag.x - drag.endX)}px`}
    style:height={`${Math.abs(drag.y - drag.endY)}px`}
  ></div>{/if}
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
        onclick={() => {
          recordOpen(b.id);
          window.open(b.url, '_blank', 'noopener,noreferrer');
          closeContext();
        }}><ArrowUpRight />open bookmark</button
      ><button role="menuitem" onclick={() => openModal('bookmark', b)}
        ><Pencil />edit bookmark</button
      ><button role="menuitem" onclick={() => openModal('reminder', b)}
        ><Bell />{b.reminderAt ? 'edit reminder' : 'set reminder'}</button
      ><button role="menuitem" onclick={() => toggleFlag(b.id, 'pinned')}
        ><Pin />{flags[b.id]?.pinned
          ? 'unpin bookmark'
          : 'pin bookmark'}</button
      ><button role="menuitem" onclick={() => toggleFlag(b.id, 'read')}
        ><CheckCircled />{flags[b.id]?.read
          ? 'mark as unread'
          : 'mark as read'}</button
      >
      <hr />
      <button
        role="menuitem"
        class="danger-text"
        onclick={() => {
          selected = [b.id];
          void openModal('delete');
        }}><Trash2 />delete bookmark</button
      >{:else}<button
        role="menuitem"
        onclick={() => {
          navigate('all');
          closeContext();
        }}><BookmarkIcon />open chikota</button
      ><button role="menuitem" onclick={() => openModal('bookmark')}
        ><Plus />save a link</button
      ><button role="menuitem" onclick={() => openModal('collection')}
        ><Archive />new collection</button
      >
      <hr />
      <button role="menuitem" onclick={() => openModal('settings')}
        ><Settings />appearance & settings</button
      >{/if}
  </div>
{/if}

<dialog
  bind:this={dialog}
  class="app-dialog"
  class:command-positioned={modal === 'command'}
  class:settings-dialog={modal === 'settings'}
  class:notifications-dialog={modal === 'notifications'}
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
            <Search size={17} /><input
              bind:this={searchInput}
              bind:value={commandQuery}
              aria-label="command menu"
              placeholder="search bookmarks or run a command…"
            /><kbd>esc</kbd>
          </div>
          <div class="command-results">
            <p>actions</p>
            <button onclick={() => openFromCommand('bookmark')}
              ><Plus />save a link<span>n</span></button
            ><button onclick={() => openFromCommand('collection')}
              ><Archive />new collection</button
            ><button onclick={() => openFromCommand('settings')}
              ><Settings />open settings</button
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
            >website url<input
              bind:value={url}
              placeholder="https://…"
              required
              aria-describedby="form-error"
            /></label
          ><label
            >title <span>optional</span><input
              bind:value={title}
              placeholder="give this find a name"
              maxlength="300"
            /></label
          ><label
            >note <span>optional</span><textarea
              bind:value={summary}
              placeholder="what made this worth keeping?"
              rows="2"
              maxlength="2000"></textarea></label
          >
          <label
            >collection<select bind:value={collection}
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
                  : 'save bookmark'}<ArrowRight /></button
            >
          </div>
        </form>
      {:else if modal === 'collection' || modal === 'collection-edit'}<div
          class="dialog-symbol"
        >
          <Archive size={22} />
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
            >collection name<input
              bind:value={collectionName}
              placeholder="e.g. weekend reading"
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
                >{collectionDeleteConfirm ? 'confirm delete' : 'delete'}</button
              >{/if}
            <button type="button" class="secondary-button" onclick={closeModal}
              >cancel</button
            ><button class="primary-button"
              >{editingCollectionId
                ? 'save name'
                : 'create collection'}{#if !editingCollectionId}<Plus
                />{/if}</button
            >
          </div>
        </form>
      {:else if modal === 'reminder' && reminderTarget}<div
          class="dialog-symbol"
        >
          <Bell size={22} />
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
            {#if reminderEmail.trim()}<Mail />scheduled email only{:else}<Bell
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
              >{saving ? 'saving…' : 'set reminder'}<Bell /></button
            >
          </div>
        </form>
      {:else if modal === 'notifications'}<div class="dialog-symbol">
          <Bell size={22} />
        </div>
        <h2 id="dialog-title">reminders</h2>
        <p class="dialog-description">
          upcoming, completed, and canceled reminders in one place.
        </p>
        {#if reminderBookmarks.length}<div class="reminder-list">
            {#each reminderBookmarks as bookmark}{@const status =
                reminderStatus(bookmark)}
              <div
                class:done={status === 'done'}
                class:canceled={status === 'canceled'}
                class="reminder-item"
              >
                <span class="reminder-favicon"
                  >{domain(bookmark.url).slice(0, 1).toUpperCase()}<img
                    src={`https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(bookmark.url)}&sz=32`}
                    alt=""
                    onerror={(event) => event.currentTarget.remove()}
                  /></span
                >
                <div>
                  <strong>{bookmark.title}</strong><small
                    ><Clock />{formatReminder(bookmark.reminderAt!)}</small
                  ><small
                    >{#if bookmark.reminderEmail}<Mail />email{:else}<Bell
                      />browser + sound{/if}<span class="reminder-status"
                      >{status}</span
                    ></small
                  >
                </div>
                {#if status === 'active'}<button
                    class="icon-button"
                    aria-label={`cancel reminder for ${bookmark.title}`}
                    title="cancel reminder"
                    onclick={() => cancelReminder(bookmark)}><BellOff /></button
                  >{/if}
              </div>{/each}
          </div>
        {:else}<div class="notification-empty">
            <Bell />
            <strong>no reminders yet.</strong>
            <p>use the bell on a bookmark to bring it back later.</p>
          </div>{/if}
      {:else if modal === 'settings'}<div class="settings-shell">
          <nav class="settings-tabs" aria-label="settings sections">
            <button
              class:active={settingsTab === 'appearance'}
              aria-pressed={settingsTab === 'appearance'}
              onclick={() => (settingsTab = 'appearance')}
              ><Settings />appearance</button
            ><button
              class:active={settingsTab === 'reminders'}
              aria-pressed={settingsTab === 'reminders'}
              onclick={() => (settingsTab = 'reminders')}
              ><Bell />reminders</button
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
                  void openModal('extension');
                }}
                ><Globe />browser extension<span
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
                  void openModal('notifications');
                }}
                ><Bell />view notifications<span
                  >{reminderBookmarks.length}<ArrowUpRight size={13} /></span
                ></button
              >
            {:else}<h2 id="dialog-title">chikọta <span>v1.0.0</span></h2>
              <p class="about-copy">
                “chikọta” is igbo for “bring together”—a quiet, beautiful place
                to gather the links you want to keep, read, and rediscover.
              </p>
              <div class="about-mark"><BookmarkFilled /></div>
            {/if}
          </section>
        </div>
      {:else if modal === 'extension'}<div class="dialog-symbol">
          <Globe size={22} />
        </div>
        <h2 id="dialog-title">keep it in one click.</h2>
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
      {:else if modal === 'delete'}<div class="dialog-symbol">
          <Trash2 size={22} />
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
          <Trash2 size={22} />
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

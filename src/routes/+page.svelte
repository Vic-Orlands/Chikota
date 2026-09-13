<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { fly } from 'svelte/transition';
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
  import DateGroupOpen from '$lib/components/icons/DateGroupOpen.svelte';
  import EllipsisVertical from '$lib/components/icons/EllipsisVertical.svelte';
  import GuestUser from '$lib/components/icons/GuestUser.svelte';
  import CommandKey from '$lib/components/icons/CommandKey.svelte';
  import GuideCompass from '$lib/components/icons/GuideCompass.svelte';
  import MacWidgetLauncher from '$lib/components/icons/MacWidgetLauncher.svelte';
  import UbuntuWidgetLauncher from '$lib/components/icons/UbuntuWidgetLauncher.svelte';
  import ReminderDone from '$lib/components/icons/ReminderDone.svelte';
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
    FileTrayStacked,
    Pin,
    Check,
    CheckCircled,
    ExternalLink,
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
  type SettingsTab = 'appearance' | 'reminders' | 'shortcuts' | 'about';
  type DesktopPlatform = 'mac' | 'linux' | null;
  type DateDeckItem = {
    key: string;
    label: string;
    dates: string[];
    kind: 'day' | 'month' | 'year';
    count: number;
  };

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
    if (!ready) void initialize().then(checkReminders);
  }
  let loadError = $state('');
  let saving = $state(false);
  let selected = $state<string[]>([]);
  let selectedCollections = $state<string[]>([]);
  let selectionTooltip = $state({ label: '', x: 0, visible: false });
  let selectionTooltipWarm = $state(false);
  let selectionTooltipFrame: number | undefined;
  let selectionTooltipWarmFrame: number | undefined;
  let selectionTooltipResetTimer: number | undefined;
  let listToolsOpen = $state(false);
  let listToolsTrigger = $state<HTMLButtonElement>();
  let selectionPinned = $derived(
    selected.length > 0 && selected.every((id) => flags[id]?.pinned)
  );
  let selectMode = $state(false);
  let bookmarkSelectionAnchor = $state<string | null>(null);
  let collectionSelectionAnchor = $state<string | null>(null);
  let flags = $state<
    Record<
      string,
      { pinned?: boolean; pinnedAt?: number; read?: boolean; openedAt?: string }
    >
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
  let widgetPanelMounted = $state(false);
  let widgetPanelOpen = $state(false);
  let widgetPanel = $state<HTMLElement>();
  let widgetPanelCloseTimer: number | undefined;
  let linuxPanelMounted = $state(false);
  let linuxPanelOpen = $state(false);
  let linuxPanel = $state<HTMLElement>();
  let linuxPanelCloseTimer: number | undefined;
  let detectedPlatform = $state<DesktopPlatform>(null);
  let platformCalloutOpen = $state(false);
  let platformCalloutTimer: number | undefined;
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
  let collectionScroller = $state<HTMLElement>();
  let collectionOverflowStart = $state(false);
  let collectionOverflowEnd = $state(false);
  let pinnedAreaHeight = $state(0);
  let collapsedGroups = $state<string[]>([]);
  let stickyLibraryHeader = $state<HTMLElement>();
  let dateDeck = $state<DateDeckItem[]>([]);
  let freshDateDeckKeys = $state<string[]>([]);
  let dateDeckTop = $state(0);
  let dateDeckRight = $state(0);
  let dateDeckFrame: number | undefined;
  let dateDeckFreshFrame: number | undefined;
  let dateDeckObservers: IntersectionObserver[] = [];
  let crossedDateKeys = new Set<string>();
  const dateDeckRowHeight = 46;
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
    return Array.from(grouped, ([date, items]) => {
      const value = items[0].createdAt;
      const year = String(value.getFullYear());
      const month = value.toLocaleDateString('en-GB', { month: 'short' });
      return {
        date,
        items,
        month,
        year,
        monthKey: `${year}-${String(value.getMonth() + 1).padStart(2, '0')}`
      };
    });
  });
  function toggleGroup(date: string) {
    collapsedGroups = collapsedGroups.includes(date)
      ? collapsedGroups.filter((value) => value !== date)
      : [...collapsedGroups, date];
  }
  function compactDateDeck(crossedDates: string[]) {
    const crossed = crossedDates
      .map((date) => groups.find((group) => group.date === date))
      .filter((group) => group !== undefined);
    const active = crossed[crossed.length - 1];
    if (!active) return [];
    const buckets = new Map<
      string,
      { dates: string[]; count: number; lastIndex: number }
    >();
    const metadata = crossed.map((group, index) => {
      const kind: DateDeckItem['kind'] =
        group.year !== active.year
          ? 'year'
          : group.monthKey !== active.monthKey
            ? 'month'
            : 'day';
      const bucket =
        kind === 'year'
          ? `year-${group.year}`
          : kind === 'month'
            ? `month-${group.monthKey}`
            : `day-${group.date}`;
      const existing = buckets.get(bucket);
      buckets.set(bucket, {
        dates: [...(existing?.dates || []), group.date],
        count: (existing?.count || 0) + group.items.length,
        lastIndex: index
      });
      return { group, kind, bucket };
    });
    const compacted: DateDeckItem[] = [];
    for (const [index, entry] of metadata.entries()) {
      const bucket = buckets.get(entry.bucket)!;
      if (index !== bucket.lastIndex) continue;
      compacted.push({
        key: `day-${entry.group.date}`,
        kind: entry.kind,
        label:
          entry.kind === 'year'
            ? entry.group.year
            : entry.kind === 'month'
              ? `${entry.group.month} ${entry.group.year}`
              : entry.group.date,
        dates: bucket.dates,
        count: bucket.count
      });
    }
    return compacted;
  }
  function refreshDateDeck() {
    const crossedDates = groups
      .map((group) => group.date)
      .filter((date) => crossedDateKeys.has(date));
    const next = compactDateDeck(crossedDates);
    const currentSignature = dateDeck
      .map((item) => `${item.key}:${item.dates.join(',')}:${item.count}`)
      .join('|');
    const nextSignature = next
      .map((item) => `${item.key}:${item.dates.join(',')}:${item.count}`)
      .join('|');
    if (currentSignature === nextSignature) return;
    const currentKeys = new Set(dateDeck.map((item) => item.key));
    freshDateDeckKeys = next
      .filter((item) => !currentKeys.has(item.key))
      .map((item) => item.key);
    dateDeck = next;
    if (dateDeckFreshFrame) window.cancelAnimationFrame(dateDeckFreshFrame);
    dateDeckFreshFrame = window.requestAnimationFrame(() => {
      dateDeckFreshFrame = window.requestAnimationFrame(() => {
        freshDateDeckKeys = [];
        dateDeckFreshFrame = undefined;
      });
    });
  }
  function connectDateDeckObserver() {
    dateDeckFrame = undefined;
    if (dateDeckFreshFrame) window.cancelAnimationFrame(dateDeckFreshFrame);
    dateDeckFreshFrame = undefined;
    for (const observer of dateDeckObservers) observer.disconnect();
    dateDeckObservers = [];
    if (
      !stickyLibraryHeader ||
      view !== 'library' ||
      !window.matchMedia('(min-width: 1061px)').matches
    ) {
      crossedDateKeys = new Set();
      freshDateDeckKeys = [];
      dateDeck = [];
      return;
    }
    const boundary = Math.ceil(
      stickyLibraryHeader.getBoundingClientRect().bottom
    );
    const firstGroup = document.querySelector<HTMLElement>(
      '.date-group[data-date-key]'
    );
    dateDeckTop = boundary;
    dateDeckRight = firstGroup
      ? window.innerWidth - firstGroup.getBoundingClientRect().left + 12
      : 0;
    crossedDateKeys = new Set();
    document
      .querySelectorAll<HTMLElement>('.date-sentinel[data-date-key]')
      .forEach((element, groupIndex) => {
        const crossedThroughGroup = groups
          .slice(0, groupIndex + 1)
          .map((group) => group.date);
        const predictedDeck = compactDateDeck(crossedThroughGroup);
        const slotIndex = Math.max(predictedDeck.length - 1, 0);
        const slotBoundary = boundary + slotIndex * dateDeckRowHeight;
        if (
          element.getBoundingClientRect().top <= slotBoundary &&
          element.dataset.dateKey
        )
          crossedDateKeys.add(element.dataset.dateKey);
        const observer = new IntersectionObserver(
          ([entry]) => {
            const date = (entry.target as HTMLElement).dataset.dateKey;
            if (!date) return;
            if (
              !entry.isIntersecting &&
              entry.boundingClientRect.top <= slotBoundary
            )
              crossedDateKeys.add(date);
            else crossedDateKeys.delete(date);
            refreshDateDeck();
          },
          { rootMargin: `-${slotBoundary}px 0px 0px 0px`, threshold: 0 }
        );
        observer.observe(element);
        dateDeckObservers.push(observer);
      });
    refreshDateDeck();
  }
  function scheduleDateDeckObserver() {
    if (dateDeckFrame) return;
    dateDeckFrame = window.requestAnimationFrame(connectDateDeckObserver);
  }
  function syncCollectionOverflow() {
    if (!collectionScroller) return;
    collectionOverflowStart = collectionScroller.scrollLeft > 2;
    collectionOverflowEnd =
      collectionScroller.scrollLeft + collectionScroller.clientWidth <
      collectionScroller.scrollWidth - 2;
  }
  function syncPinnedArea() {
    if (stickyLibraryHeader)
      pinnedAreaHeight = stickyLibraryHeader.getBoundingClientRect().height;
  }
  async function openDateDeckItem(item: DateDeckItem) {
    collapsedGroups = collapsedGroups.filter(
      (date) => !item.dates.includes(date)
    );
    await tick();
    const target = Array.from(
      document.querySelectorAll<HTMLElement>('.date-group[data-date-key]')
    ).find((element) => element.dataset.dateKey === item.dates[0]);
    if (!target || !stickyLibraryHeader) return;
    window.scrollTo({
      top:
        window.scrollY +
        target.getBoundingClientRect().top -
        stickyLibraryHeader.getBoundingClientRect().bottom -
        8,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth'
    });
  }
  const dateGroupSignature = $derived(
    groups.map((group) => `${group.date}:${group.items.length}`).join('|')
  );
  $effect(() => {
    dateGroupSignature;
    collectionsOpen;
    if (view !== 'library') {
      dateDeck = [];
      return;
    }
    void tick().then(scheduleDateDeckObserver);
  });
  $effect(() => {
    $categories.length;
    collectionsOpen;
    collectionScroller;
    if (view === 'library')
      void tick().then(() => {
        syncCollectionOverflow();
        syncPinnedArea();
      });
  });
  $effect(() => {
    if (!stickyLibraryHeader) return;
    const observer = new ResizeObserver(syncPinnedArea);
    observer.observe(stickyLibraryHeader);
    return () => observer.disconnect();
  });
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
  let pinned = $derived(
    $bookmarks
      .filter((b) => flags[b.id]?.pinned)
      .sort(
        (a, b) => (flags[b.id]?.pinnedAt || 0) - (flags[a.id]?.pinnedAt || 0)
      )
  );
  function pinExit(_node: HTMLElement) {
    return {
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : 220,
      css: (t: number) =>
        `opacity:${t * t};transform:scale(${0.8 + t * 0.2});filter:blur(${(1 - t) * 3}px);mask-image:repeating-conic-gradient(from 45deg, #000 0deg ${t * 90}deg, transparent ${t * 90}deg 90deg);mask-size:20px 20px`
    };
  }
  function pinEntry() {
    return {
      x: -24,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : 240
    };
  }
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
    window.addEventListener('resize', scheduleDateDeckObserver);
    window.addEventListener('resize', syncCollectionOverflow);
    window.addEventListener('resize', syncPinnedArea);
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
      revealPlatformCallout();
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
      window.removeEventListener('resize', scheduleDateDeckObserver);
      window.removeEventListener('resize', syncCollectionOverflow);
      window.removeEventListener('resize', syncPinnedArea);
      for (const timer of Object.values(copyResetTimers))
        window.clearTimeout(timer);
      if (platformCalloutTimer) window.clearTimeout(platformCalloutTimer);
      if (selectionTooltipFrame)
        window.cancelAnimationFrame(selectionTooltipFrame);
      if (selectionTooltipWarmFrame)
        window.cancelAnimationFrame(selectionTooltipWarmFrame);
      if (selectionTooltipResetTimer)
        window.clearTimeout(selectionTooltipResetTimer);
      if (dateDeckFrame) window.cancelAnimationFrame(dateDeckFrame);
      if (dateDeckFreshFrame) window.cancelAnimationFrame(dateDeckFreshFrame);
      for (const observer of dateDeckObservers) observer.disconnect();
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
  function showSelectionTooltip(event: MouseEvent | FocusEvent, label: string) {
    const button = event.currentTarget as HTMLButtonElement;
    const toolbar = button.closest<HTMLElement>('.bookmark-selection-toolbar');
    if (!toolbar) return;
    const buttonRect = button.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();
    const nextTooltip = {
      label,
      x: buttonRect.left - toolbarRect.left + buttonRect.width / 2,
      visible: true
    };
    if (selectionTooltipResetTimer)
      window.clearTimeout(selectionTooltipResetTimer);
    if (selectionTooltipWarm) {
      selectionTooltip = nextTooltip;
      return;
    }
    if (selectionTooltipFrame)
      window.cancelAnimationFrame(selectionTooltipFrame);
    if (selectionTooltipWarmFrame) {
      window.cancelAnimationFrame(selectionTooltipWarmFrame);
      selectionTooltipWarmFrame = undefined;
    }
    selectionTooltip = { ...nextTooltip, visible: false };
    selectionTooltipFrame = window.requestAnimationFrame(() => {
      selectionTooltip = nextTooltip;
      selectionTooltipFrame = undefined;
      selectionTooltipWarmFrame = window.requestAnimationFrame(() => {
        selectionTooltipWarm = true;
        selectionTooltipWarmFrame = undefined;
      });
    });
  }
  function hideSelectionTooltip(event?: FocusEvent) {
    const toolbar = event?.currentTarget as HTMLElement | undefined;
    if (
      toolbar &&
      event?.relatedTarget instanceof Node &&
      toolbar.contains(event.relatedTarget)
    )
      return;
    if (selectionTooltipFrame)
      window.cancelAnimationFrame(selectionTooltipFrame);
    if (selectionTooltipWarmFrame) {
      window.cancelAnimationFrame(selectionTooltipWarmFrame);
      selectionTooltipWarmFrame = undefined;
    }
    selectionTooltipWarm = false;
    selectionTooltip = { ...selectionTooltip, visible: false };
    selectionTooltipResetTimer = window.setTimeout(() => {
      if (!selectionTooltip.visible) {
        selectionTooltip = { label: '', x: 0, visible: false };
      }
      selectionTooltipResetTimer = undefined;
    }, 180);
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
  async function openExtensionPanel() {
    closeContext();
    closeReminderPopover();
    closeRemindersPanel();
    closeWidgetPanel();
    closeLinuxPanel();
    if (modal) closeModal();
    if (extensionPanelCloseTimer) window.clearTimeout(extensionPanelCloseTimer);
    extensionPanelMounted = true;
    await tick();
    requestAnimationFrame(() => {
      extensionPanelOpen = true;
      extensionPanel?.focus({ preventScroll: true });
    });
  }
  function closeExtensionPanel() {
    extensionPanelOpen = false;
    if (extensionPanelCloseTimer) window.clearTimeout(extensionPanelCloseTimer);
    extensionPanelMounted = false;
    extensionPanelCloseTimer = undefined;
  }
  async function openWidgetPanel() {
    closeContext();
    closeReminderPopover();
    closeRemindersPanel();
    closeExtensionPanel();
    closeLinuxPanel();
    dismissPlatformCallout();
    if (modal) closeModal();
    if (widgetPanelCloseTimer) window.clearTimeout(widgetPanelCloseTimer);
    widgetPanelMounted = true;
    await tick();
    requestAnimationFrame(() => {
      widgetPanelOpen = true;
      widgetPanel?.focus({ preventScroll: true });
    });
  }
  function closeWidgetPanel() {
    widgetPanelOpen = false;
    if (widgetPanelCloseTimer) window.clearTimeout(widgetPanelCloseTimer);
    widgetPanelMounted = false;
    widgetPanelCloseTimer = undefined;
  }
  async function openLinuxPanel() {
    closeContext();
    closeReminderPopover();
    closeRemindersPanel();
    closeExtensionPanel();
    closeWidgetPanel();
    dismissPlatformCallout();
    if (modal) closeModal();
    if (linuxPanelCloseTimer) window.clearTimeout(linuxPanelCloseTimer);
    linuxPanelMounted = true;
    await tick();
    requestAnimationFrame(() => {
      linuxPanelOpen = true;
      linuxPanel?.focus({ preventScroll: true });
    });
  }
  function closeLinuxPanel() {
    linuxPanelOpen = false;
    if (linuxPanelCloseTimer) window.clearTimeout(linuxPanelCloseTimer);
    linuxPanelMounted = false;
    linuxPanelCloseTimer = undefined;
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
    closeExtensionPanel();
    closeWidgetPanel();
    closeLinuxPanel();
    if (modal) closeModal();
    if (remindersPanelCloseTimer) window.clearTimeout(remindersPanelCloseTimer);
    remindersPanelMounted = true;
    await tick();
    requestAnimationFrame(() => {
      remindersPanelOpen = true;
      remindersPanel?.focus({ preventScroll: true });
    });
  }
  function closeRemindersPanel() {
    remindersPanelOpen = false;
    if (remindersPanelCloseTimer) window.clearTimeout(remindersPanelCloseTimer);
    remindersPanelMounted = false;
    remindersPanelCloseTimer = undefined;
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
    for (const [index, id] of ids.entries())
      next[id] = {
        ...next[id],
        [key]: value,
        ...(key === 'pinned' && value ? { pinnedAt: Date.now() + index } : {})
      };
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
        bookmark.widgetEnabled
          ? 'removed from mac widget'
          : 'added to mac widget'
      );
    } catch {
      toast.error('could not update the mac widget');
    }
    closeContext();
  }
  async function showContext(event: MouseEvent, bookmark: Bookmark) {
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
    if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) {
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
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
      event.preventDefault();
      void openModal('bookmark');
    }
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
  <p
    class="sr-only absolute [width:1px] [height:1px] p-0 [margin:-1px] overflow-hidden [clip:rect(0,_0,_0,_0)] whitespace-nowrap border-0"
  >
    loading chikota
  </p>
{:else if view === 'landing'}
  <LandingPage onenter={enterLibrary} />
{:else if view === 'library'}
  <div
    class="reading-column [width:min(var(--reading-max),_calc(100%_-_40px))] [max-width:var(--reading-max)] [margin:0_auto] [min-height:100dvh] min-w-0 [border-inline:1px_solid_var(--border)] [&>main]:min-w-0 [&>main]:max-w-full max-[760px]:[width:calc(100%_-_28px)] max-[520px]:[width:calc(100%_-_20px)]"
  >
    <main class="pb-40 max-[520px]:pb-24">
      <div
        bind:this={stickyLibraryHeader}
        class="sticky-library-header sticky top-0 z-20 bg-background"
      >
        <header
          class="reading-header relative grid [grid-template-columns:1fr_auto] items-center [gap:18px] [padding:18px_10px] [min-height:72px] max-[760px]:[padding:24px_12px] max-[760px]:[gap:10px] max-[520px]:[grid-template-columns:1fr_1fr] max-[520px]:[gap:12px] max-[520px]:[padding:16px_10px_7px]"
        >
          <a
            class="wordmark flex items-center [gap:10px] [width:fit-content] [&_h1]:[font-size:32px] [&_h1]:font-normal [&_h1]:[letter-spacing:normal] [&_h1]:m-0 [&_svg]:[color:var(--foreground)] max-[520px]:[&_h1]:[font-size:30px]"
            href="/"
            aria-label="chikota home"><h1>chikota</h1></a
          >
          <div
            class="header-actions relative flex items-center justify-end [gap:var(--icon-icon-gap)] [&_.icon-button:focus-visible]:[outline:2px_solid_var(--accent-text)] [&_.icon-button:focus-visible]:[outline-offset:2px] max-[520px]:[grid-column:2] max-[520px]:[grid-row:1]"
          >
            <button
              data-tour="search"
              bind:this={commandTrigger}
              class="icon-button search-trigger inline-flex h-7.5 w-auto! items-center justify-center [gap:5px] border-0 bg-transparent! px-1.5 [color:var(--muted-foreground)] [border-radius:5px] [&_kbd]:[font-family:var(--font-sans)] [&_kbd]:[font-size:10px] [&_kbd]:[line-height:1] [&:hover]:[background:var(--secondary)] [&:hover]:[color:var(--foreground)] motion-safe:[transition:background-color_140ms_ease]"
              aria-label="search bookmarks, cmd+k"
              title="search bookmarks"
              onclick={() => openModal('command')}><SearchGrid /></button
            >
            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                data-tour="account"
                class={[
                  'icon-button notification-trigger inline-grid place-items-center [width:30px] [height:30px] p-0 border-0 bg-none [color:var(--muted-foreground)] [border-radius:5px] [&:hover]:[background:var(--secondary)] [&:hover]:[color:var(--foreground)] [&.small]:[width:24px] [&.small]:[height:24px] relative [&>span]:absolute [&>span]:[top:-3px] [&>span]:[right:-3px] [&>span]:[min-width:14px] [&>span]:[height:14px] [&>span]:grid [&>span]:place-items-center [&>span]:[padding:0_3px] [&>span]:[border-radius:7px] [&>span]:[background:var(--primary)] [&>span]:[color:var(--primary-foreground)] [&>span]:[font-size:8px] [&>span]:[font-variant-numeric:tabular-nums] motion-safe:[transition:background-color_140ms_ease]',
                  data.session
                    ? 'h-auto! w-auto! rounded-none! bg-transparent! hover:bg-transparent!'
                    : 'size-7.5! rounded-[5px]! bg-secondary! text-foreground! hover:bg-secondary!'
                ]}
                aria-label="account menu"
                title="account menu"
                >{#if data.session}{#if data.session.user.image}<img
                      class="account-avatar block [width:22px] [height:22px] rounded-full [object-fit:cover]"
                      src={data.session.user.image}
                      alt=""
                    />{:else}<div
                      class="account-avatar account-avatar-fallback block [width:22px] [height:22px] rounded-full [object-fit:cover] grid place-items-center [background:var(--secondary)] [font-size:10px] [font-weight:600]"
                    >
                      {data.session.user.name?.slice(0, 1).toUpperCase() || 'U'}
                    </div>{/if}{:else}<GuestUser
                  />{/if}{#if upcomingReminderCount}<span
                    >{upcomingReminderCount}</span
                  >{/if}</DropdownMenu.Trigger
              >
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  class="list-options-menu [z-index:51] [min-width:160px] [padding:3px] [border:1px_solid_var(--border)] [border-radius:8px] [background:var(--card)] [color:var(--foreground)] [box-shadow:var(--shadow)] [transform-origin:var(--bits-floating-transform-origin)] [will-change:transform,_opacity] [&[data-state=open]]:[animation:account-menu-in_180ms_cubic-bezier(0.22,_1,_0.36,_1)_both] [&[data-state=closed]]:[animation:account-menu-out_120ms_ease-out_both] motion-reduce:[&[data-state]]:[animation:none]"
                  align="end"
                  sideOffset={8}
                >
                  <DropdownMenu.Item
                    class="list-options-item flex items-center [gap:var(--icon-text-gap)] [min-height:30px] [padding:5px_8px] [border-radius:4px] [font-size:var(--body-font-size)] cursor-pointer outline-none [&[data-highlighted]]:[background:var(--secondary)] [&[data-state=checked]]:[background:var(--secondary)] [&[data-disabled]]:[opacity:0.5] [&[data-disabled]]:[cursor:default]"
                    onSelect={() => openModal('settings')}
                    ><ActionSettings size={14} />settings</DropdownMenu.Item
                  >
                  <DropdownMenu.Item
                    class="list-options-item flex items-center [gap:var(--icon-text-gap)] [min-height:30px] [padding:5px_8px] [border-radius:4px] [font-size:var(--body-font-size)] cursor-pointer outline-none [&[data-highlighted]]:[background:var(--secondary)] [&[data-state=checked]]:[background:var(--secondary)] [&[data-disabled]]:[opacity:0.5] [&[data-disabled]]:[cursor:default]"
                    onSelect={openRemindersPanel}
                    ><ActionBell
                      size={14}
                    />reminders{#if upcomingReminderCount}
                      · {upcomingReminderCount}{/if}</DropdownMenu.Item
                  >
                  <DropdownMenu.Item
                    class="list-options-item flex items-center [gap:var(--icon-text-gap)] [min-height:30px] [padding:5px_8px] [border-radius:4px] [font-size:var(--body-font-size)] cursor-pointer outline-none [&[data-highlighted]]:[background:var(--secondary)] [&[data-state=checked]]:[background:var(--secondary)] [&[data-disabled]]:[opacity:0.5] [&[data-disabled]]:[cursor:default]"
                    onSelect={() => void openExtensionPanel()}
                    ><BrowserExtension size={14} />browser extension</DropdownMenu.Item
                  >
                  <DropdownMenu.Item
                    class="list-options-item flex items-center [gap:var(--icon-text-gap)] [min-height:30px] [padding:5px_8px] [border-radius:4px] [font-size:var(--body-font-size)] cursor-pointer outline-none [&[data-highlighted]]:[background:var(--secondary)] [&[data-state=checked]]:[background:var(--secondary)] [&[data-disabled]]:[opacity:0.5] [&[data-disabled]]:[cursor:default]"
                    onSelect={() => (guideOpen = true)}
                    ><GuideCompass size={14} />welcome guide</DropdownMenu.Item
                  >
                  {#if data.session}<DropdownMenu.Item
                      class="list-options-item flex items-center [gap:var(--icon-text-gap)] [min-height:30px] [padding:5px_8px] [border-radius:4px] [font-size:var(--body-font-size)] cursor-pointer outline-none [&[data-highlighted]]:[background:var(--secondary)] [&[data-state=checked]]:[background:var(--secondary)] [&[data-disabled]]:[opacity:0.5] [&[data-disabled]]:[cursor:default]"
                      onSelect={async () => {
                        await authClient.signOut();
                        location.reload();
                      }}><LogOut size={14} />sign out</DropdownMenu.Item
                    >{:else}<DropdownMenu.Item
                      class="list-options-item flex items-center [gap:var(--icon-text-gap)] [min-height:30px] [padding:5px_8px] [border-radius:4px] [font-size:var(--body-font-size)] cursor-pointer outline-none [&[data-highlighted]]:[background:var(--secondary)] [&[data-state=checked]]:[background:var(--secondary)] [&[data-disabled]]:[opacity:0.5] [&[data-disabled]]:[cursor:default]"
                      onSelect={() =>
                        authClient.signIn.social({ provider: 'google' })}
                      ><GuestUser size={14} />sign in</DropdownMenu.Item
                    >{/if}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>
        <section
          data-tour="collections"
          class="collection-section ruled-section relative p-0 [&::before]:[content:''] [&::before]:absolute [&::before]:[height:1px] [&::before]:[background:color-mix(in_srgb,_var(--border)_58%,_transparent)] [&::before]:[top:0] [&::before]:[left:0] [&::before]:[right:0] [&::before]:pointer-events-none [&>.section-toolbar]:[min-height:38px] [&>.section-toolbar>.plain-button]:[width:auto] [&>.section-toolbar>.plain-button]:[height:auto] [&>.section-toolbar>.plain-button]:min-h-0 [&>.section-toolbar>.plain-button]:p-0 [&>.section-toolbar>.plain-button]:bg-none [&>.section-toolbar>.plain-button:hover]:bg-none max-[520px]:[padding-inline:0]"
          aria-labelledby="collections-heading"
        >
          <div
            class="section-toolbar py-2! flex items-center justify-between [gap:12px] [min-height:46px] [padding-inline:10px] max-[520px]:[gap:8px]"
          >
            <button
              class="section-toggle [&_svg]:block flex items-center [gap:var(--icon-text-gap)] border-0 p-0 bg-none [color:var(--muted-foreground)] max-[520px]:[gap:var(--icon-text-gap)] max-[520px]:[padding-left:0] max-[520px]:[&_h2]:[font-size:24px]"
              aria-expanded={collectionsOpen}
              aria-controls="collection-content"
              onclick={() => (collectionsOpen = !collectionsOpen)}
              >{#if $categories.filter((c) => c.id !== 'all').length}<FileTrayStacked
                  size={14}
                />{:else}<FileTray size={14} />{/if}
              <h2 id="collections-heading">collections</h2>
              <span
                class="count [font-size:10px] [font-variant-numeric:tabular-nums] [padding:3px_6px] [background:var(--secondary)] [color:var(--muted-foreground)] [border-radius:4px]"
                >{$categories.filter((c) => c.id !== 'all').length}</span
              ><ChevronDown
                size={14}
                class={collectionsOpen
                  ? 'chevron expanded [&.expanded]:[transform:rotate(180deg)] motion-safe:[transition:transform_200ms_ease-in-out] motion-reduce:transition-none'
                  : 'chevron [&.expanded]:[transform:rotate(180deg)] motion-safe:[transition:transform_200ms_ease-in-out] motion-reduce:transition-none'}
              /></button
            >
            <button
              class="plain-button [&_svg]:block inline-flex items-center [gap:var(--icon-text-gap)] [padding:5px_6px] border-0 [border-radius:5px] bg-transparent [color:var(--foreground)] [font-size:var(--body-font-size)] whitespace-nowrap [&:hover]:[background:var(--secondary)] [&.control-active]:[background:var(--secondary)] [&.control-active]:[color:var(--foreground)] max-[520px]:[padding:6px_4px] max-[520px]:[font-size:var(--body-font-size)]"
              onclick={() => openModal('collection')}><Plus size={15} /></button
            >
          </div>
          <div
            id="collection-content"
            class="collapse-grid grid [grid-template-rows:0fr] [grid-template-columns:minmax(0,_1fr)] min-w-0 max-w-full opacity-0 [&.open]:[grid-template-rows:1fr] [&.open]:opacity-100 motion-safe:[transition:grid-template-rows_200ms_cubic-bezier(0.645,_0.045,_0.355,_1),_opacity_150ms_ease-out] motion-reduce:transition-none"
            class:open={collectionsOpen}
            inert={!collectionsOpen ? true : undefined}
            aria-hidden={!collectionsOpen}
          >
            <div
              class="collapse-inner min-h-0 min-w-0 max-w-full overflow-hidden"
            >
              {#if $categories.filter((c) => c.id !== 'all').length}
                <div
                  class="collection-slider"
                  class:fade-start={collectionOverflowStart}
                  class:fade-end={collectionOverflowEnd}
                >
                  <div
                    bind:this={collectionScroller}
                    class="collection-grid"
                    role="region"
                    aria-label="collections"
                    onscroll={syncCollectionOverflow}
                  >
                    {#each $categories.filter((c) => c.id !== 'all') as c, index}<div
                        class="collection-card flex items-center min-w-0 border-0 [background:var(--sidebar)] [color:var(--muted-foreground)] text-left relative [&:hover_.collection-menu]:opacity-100 [&.active]:[background:var(--accent-soft)] [&:hover]:[background:var(--accent-soft)] [&.selected]:[background:var(--accent-soft)] [&.selected]:[box-shadow:inset_0_0_0_1px_var(--accent-text)] max-[760px]:p-0 max-[760px]:[&_strong]:[font-size:var(--body-font-size)] max-[520px]:p-0 motion-safe:[transition:background-color_140ms_ease]"
                        style={`--collection-column:${Math.floor(index / 10) * 5 + (index % 5) + 1};--collection-row:${Math.floor((index % 10) / 5) + 1};--collection-mobile-column:${Math.floor(index / 4) * 2 + (index % 2) + 1};--collection-mobile-row:${Math.floor((index % 4) / 2) + 1}`}
                        class:active={section === c.id}
                        class:selected={selectedCollections.includes(c.id)}
                      >
                        <button
                          class="collection-main [&_svg]:block flex items-start [gap:var(--icon-text-gap)] min-w-0 flex-1 border-0 bg-none text-inherit [padding:7px_12px] text-left [&>span]:min-w-0 [&_strong]:block [&_strong]:[color:var(--foreground)] [&_strong]:[font-size:var(--body-font-size)] [&_strong]:font-medium [&_strong]:overflow-hidden [&_strong]:whitespace-nowrap [&_strong]:text-ellipsis [&_small]:block [&_small]:[margin-top:2px] [&_small]:[font-size:var(--secondary-text-font-size)]"
                          aria-pressed={selectedCollections.includes(c.id)}
                          onclick={(event) => {
                            if (selectCollectionRange(event, c.id)) return;
                            navigate(section === c.id ? 'all' : c.id);
                          }}
                          ><span
                            ><strong>{c.name}</strong><small
                              >{$bookmarks.filter((b) => b.categoryId === c.id)
                                .length}
                              links</small
                            ></span
                          ></button
                        ><button
                          class="collection-menu icon-button inline-grid place-items-center [width:30px] [height:30px] p-0 border-0 bg-none [color:var(--muted-foreground)] [border-radius:5px] [&:hover]:[background:var(--secondary)] [&:hover]:[color:var(--foreground)] [&.small]:[width:24px] [&.small]:[height:24px] [width:24px] [height:28px] [margin-right:5px] opacity-0 [&:focus-visible]:opacity-100 motion-safe:[transition:background-color_140ms_ease]"
                          aria-label={`edit ${c.name}`}
                          onclick={() => editCollection(c.id)}
                          ><MoreVertical size={15} /></button
                        >
                      </div>{/each}
                  </div>
                </div>
              {:else}<div
                  class="section-empty collection-empty relative [isolation:isolate] flex flex-col items-center justify-center [min-height:92px] text-center border-0 [border-block:1px_solid_var(--border)] [border-radius:0] [background:var(--sidebar)] [padding:16px_12px] [&_strong]:[font-size:var(--section-label-font-size)] [&_strong]:font-medium [&_p]:[color:var(--muted-foreground)] [&_p]:[font-size:var(--secondary-text-font-size)] [&_p]:[line-height:1.6] [&_p]:[margin:10px_0_0]"
                >
                  <EmptyMono />
                  <FileTray size={18} class="text-muted-foreground" />
                  <strong>no collections yet.</strong>
                  <p>group bookmarks by creating a collection.</p>
                </div>{/if}
            </div>
          </div>
        </section>
        <div class="right-marker-fade" aria-hidden="true"></div>
      </div>
      {#if pinned.length}<aside
          class="pinned-rail"
          style:height={`${pinnedAreaHeight}px`}
          aria-label="pinned bookmarks"
        >
          <div class="pinned-rail-list">
            {#each pinned as b (b.id)}<div
                class="pinned-rail-item"
                in:fly={pinEntry()}
                out:pinExit
              >
                <a
                  class="pinned-rail-chip"
                  class:selected={selected.includes(b.id)}
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={b.title}
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
                  ><span class="pinned-rail-icon"
                    ><Globe size={14} /><img
                      src={`https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(b.url)}&sz=32`}
                      alt=""
                      onerror={(event) => event.currentTarget.remove()}
                    /></span
                  ><span>{b.title}</span></a
                ><button
                  class="pinned-rail-unpin"
                  aria-label={`unpin ${b.title}`}
                  title="unpin"
                  onclick={() => toggleFlag(b.id, 'pinned')}
                  ><Cross2 size={12} /></button
                >
              </div>{/each}
          </div>
        </aside>{/if}
      <section
        class="library-section ruled-section relative p-0 [&::before]:[content:''] [&::before]:absolute [&::before]:[height:1px] [&::before]:[background:color-mix(in_srgb,_var(--border)_58%,_transparent)] [&::before]:[top:0] [&::before]:[left:0] [&::before]:[right:0] [&::before]:pointer-events-none [&>.section-toolbar]:[min-height:38px] min-w-0 max-w-full max-[520px]:[padding-inline:0]"
        aria-label="bookmarks"
      >
        <div
          class="section-toolbar library-toolbar py-2! flex items-center justify-between [gap:12px] [min-height:46px] [padding-inline:10px] max-[520px]:[gap:8px] max-[520px]:flex-wrap max-[520px]:[padding-block:10px_0]"
        >
          <div
            class="library-title [&_svg]:block flex items-center [gap:var(--icon-text-gap)] [color:var(--muted-foreground)] [padding-left:0] max-[520px]:[&_h2]:[font-size:24px]"
          >
            <BookmarkIcon size={15} />
            <h2>{heading}</h2>
            <span
              class="count [font-size:10px] [font-variant-numeric:tabular-nums] [padding:3px_6px] [background:var(--secondary)] [color:var(--muted-foreground)] [border-radius:4px]"
              >{visible.length}</span
            >
          </div>
          <div
            class="library-actions flex [gap:var(--icon-icon-gap)] items-center [&>.plain-button]:[width:auto] [&>.plain-button]:[height:auto] [&>.plain-button]:min-h-0 [&>.plain-button]:p-0 [&>.plain-button]:bg-none [&>.list-options>.list-options-trigger]:[width:auto] [&>.list-options>.list-options-trigger]:[height:auto] [&>.list-options>.list-options-trigger]:min-h-0 [&>.list-options>.list-options-trigger]:p-0 [&>.list-options>.list-options-trigger]:bg-none [&>.plain-button:hover]:bg-none [&>.list-options>.list-options-trigger:hover]:bg-none max-[520px]:w-full max-[520px]:justify-end max-[520px]:[gap:10px]"
          >
            <button
              class="plain-button [&_svg]:block inline-flex items-center [gap:var(--icon-text-gap)] [padding:5px_6px] border-0 [border-radius:5px] bg-transparent [color:var(--foreground)] [font-size:var(--body-font-size)] whitespace-nowrap [&:hover]:[background:var(--secondary)] [&.control-active]:[background:var(--secondary)] [&.control-active]:[color:var(--foreground)] max-[520px]:[padding:6px_4px] max-[520px]:[font-size:var(--body-font-size)]"
              data-tour="save"
              disabled={!ready}
              onclick={() => openModal('bookmark')}><Plus size={15} /></button
            >
            <div
              class="list-options relative flex items-center"
              role="group"
              aria-label="bookmark view options"
              onpointerenter={(event) => {
                if (event.pointerType === 'mouse') listToolsOpen = true;
              }}
              onpointerleave={(event) => {
                if (event.pointerType === 'mouse') listToolsOpen = false;
              }}
              onfocusin={() => (listToolsOpen = true)}
              onfocusout={(event) => {
                if (
                  !(event.relatedTarget instanceof Node) ||
                  !event.currentTarget.contains(event.relatedTarget)
                )
                  listToolsOpen = false;
              }}
            >
              <button
                bind:this={listToolsTrigger}
                data-tour="mixer"
                class="icon-button list-options-trigger inline-grid place-items-center [width:30px] [height:30px] p-0 border-0 bg-none [color:var(--muted-foreground)] [border-radius:5px] [&:hover]:[background:var(--secondary)] [&:hover]:[color:var(--foreground)] [&.small]:[width:24px] [&.small]:[height:24px] [color:var(--foreground)] [&_svg]:[fill:currentColor] [&:focus-visible]:[outline:2px_solid_var(--accent-text)] [&:focus-visible]:[outline-offset:2px] [&[aria-expanded=true]]:bg-none [&[aria-expanded=true]]:[color:var(--foreground)] motion-safe:[transition:background-color_140ms_ease]"
                aria-label="bookmark actions"
                title="bookmark actions"
                aria-expanded={listToolsOpen}
                aria-controls="bookmark-action-rail"
                onclick={() => (listToolsOpen = true)}
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
                  class="plain-button [&_svg]:block inline-flex items-center [gap:var(--icon-text-gap)] [padding:5px_6px] border-0 [border-radius:5px] bg-transparent [color:var(--foreground)] [font-size:var(--body-font-size)] whitespace-nowrap [&:hover]:[background:var(--secondary)] [&.control-active]:[background:var(--secondary)] [&.control-active]:[color:var(--foreground)] max-[520px]:[padding:6px_4px] max-[520px]:[font-size:var(--body-font-size)]"
                  class:control-active={selectMode}
                  aria-pressed={selectMode}
                  onclick={() => {
                    selectMode = !selectMode;
                    if (!selectMode) selected = [];
                  }}><SelectList size={14} />select</button
                >
                <button
                  class="plain-button [&_svg]:block inline-flex items-center [gap:var(--icon-text-gap)] [padding:5px_6px] border-0 [border-radius:5px] bg-transparent [color:var(--foreground)] [font-size:var(--body-font-size)] whitespace-nowrap [&:hover]:[background:var(--secondary)] [&.control-active]:[background:var(--secondary)] [&.control-active]:[color:var(--foreground)] max-[520px]:[padding:6px_4px] max-[520px]:[font-size:var(--body-font-size)]"
                  disabled={!visible.length}
                  onclick={() => {
                    selected = visible.map((b) => b.id);
                    selectMode = true;
                  }}><SelectAll size={14} />select all</button
                >
                <button
                  class="plain-button [&_svg]:block inline-flex items-center [gap:var(--icon-text-gap)] [padding:5px_6px] border-0 [border-radius:5px] bg-transparent [color:var(--foreground)] [font-size:var(--body-font-size)] whitespace-nowrap [&:hover]:[background:var(--secondary)] [&.control-active]:[background:var(--secondary)] [&.control-active]:[color:var(--foreground)] max-[520px]:[padding:6px_4px] max-[520px]:[font-size:var(--body-font-size)]"
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
        {#if loadError}<div
            class="error-panel [margin:30px_0] [padding:20px] [border:1px_solid_#c56358] [font-size:var(--body-font-size)] [border-radius:8px] [&_button]:block [&_button]:underline [&_button]:[margin-top:12px]"
            role="alert"
          >
            {loadError}<button
              onclick={() => {
                loadError = '';
                void initialize();
              }}>try again</button
            >
          </div>
        {:else if !ready}<div
            class="section-empty relative [isolation:isolate] flex flex-col items-center justify-center [min-height:92px] text-center border-0 [border-block:1px_solid_var(--border)] [border-radius:0] [background:var(--sidebar)] [padding:16px_12px] [&_strong]:[font-size:var(--section-label-font-size)] [&_strong]:font-medium [&_p]:[color:var(--muted-foreground)] [&_p]:[font-size:var(--secondary-text-font-size)] [&_p]:[line-height:1.6] [&_p]:[margin:10px_0_0]"
            role="status"
          >
            loading bookmarks…
          </div>
        {:else if visible.length}
          {#each groups as group (group.date)}
            {@const collapsed = collapsedGroups.includes(group.date)}
            {@const stackedItem = dateDeck.find(
              (item) => item.key === `day-${group.date}`
            )}
            {@const stackIndex = stackedItem
              ? dateDeck.indexOf(stackedItem)
              : 0}
            {@const freshStackedItem = stackedItem
              ? freshDateDeckKeys.includes(stackedItem.key)
              : false}
            {@const headingCollapsed = (
              stackedItem?.dates || [group.date]
            ).every((date) => collapsedGroups.includes(date))}
            <div
              data-date-key={group.date}
              class="date-group relative min-w-0 [&.collapsed_.date-group-body]:[min-height:46px] [&>.collapse-grid]:relative [&>.collapse-grid]:[z-index:1] [&>.collapse-grid]:[clip-path:inset(0)] [&>.collapse-grid]:min-w-0 [&>.collapse-grid]:max-w-full max-[1060px]:[&.collapsed]:min-h-0 max-[1060px]:[&.collapsed_.date-group-body]:[min-height:38px] motion-safe:[&>.collapse-grid]:[transition:grid-template-rows_250ms_cubic-bezier(0.22,_1,_0.36,_1),_opacity_180ms_ease-in-out]"
              class:collapsed
            >
              <span
                data-date-key={group.date}
                class="date-sentinel pointer-events-none absolute left-0 top-0 size-px"
                aria-hidden="true"
              ></span>
              <button
                class={[
                  'date-heading [&_svg]:block flex items-center [gap:var(--icon-text-gap)] border-0 p-0 bg-none [color:var(--muted-foreground)] justify-end [min-height:46px] [width:max-content] [font-size:var(--body-font-size)] max-[1060px]:static max-[1060px]:justify-start max-[1060px]:[min-height:38px]',
                  stackedItem
                    ? 'fixed [z-index:19] [will-change:transform] motion-reduce:transition-none'
                    : 'absolute [right:calc(100%_+_12px)] [top:0]',
                  stackedItem && !freshStackedItem
                    ? 'motion-safe:[transition:transform_180ms_cubic-bezier(0.645,_0.045,_0.355,_1)]'
                    : 'transition-none'
                ]}
                style:top={stackedItem ? `${dateDeckTop}px` : undefined}
                style:right={stackedItem ? `${dateDeckRight}px` : undefined}
                style:transform={stackedItem
                  ? `translateY(${stackIndex * dateDeckRowHeight}px)`
                  : undefined}
                aria-expanded={!headingCollapsed}
                onclick={() =>
                  stackedItem
                    ? openDateDeckItem(stackedItem)
                    : toggleGroup(group.date)}
                ><span>{stackedItem?.label || group.date}</span><span
                  class="count [font-size:10px] [font-variant-numeric:tabular-nums] [padding:3px_6px] [background:var(--secondary)] [color:var(--muted-foreground)] [border-radius:4px]"
                  >{stackedItem?.count || group.items.length}</span
                ><span
                  class="t-icon-swap date-icon-swap relative inline-grid [grid-template:15px_/_15px] [width:15px] [height:15px] overflow-hidden shrink-0 place-items-center [isolation:isolate] [vertical-align:middle] [&_.t-icon]:[grid-area:1_/_1] [&_.t-icon]:grid [&_.t-icon]:place-items-center [&_.t-icon]:[width:15px] [&_.t-icon]:[height:15px] [&_.t-icon]:overflow-hidden [&_.t-icon]:[line-height:0] [&_.t-icon]:[transition:opacity_var(--icon-swap-dur)_var(--icon-swap-ease),_filter_var(--icon-swap-dur)_var(--icon-swap-ease),_transform_var(--icon-swap-dur)_var(--icon-swap-ease),_visibility_var(--icon-swap-dur)_var(--icon-swap-ease)] [&_.t-icon]:[will-change:opacity,_filter,_transform] [&[data-state=closed]_.t-icon[data-icon=closed]]:opacity-100 [&[data-state=closed]_.t-icon[data-icon=closed]]:[visibility:visible] [&[data-state=closed]_.t-icon[data-icon=closed]]:[filter:blur(0)] [&[data-state=closed]_.t-icon[data-icon=closed]]:[transform:scale(1)] [&[data-state=opened]_.t-icon[data-icon=opened]]:opacity-100 [&[data-state=opened]_.t-icon[data-icon=opened]]:[visibility:visible] [&[data-state=opened]_.t-icon[data-icon=opened]]:[filter:blur(0)] [&[data-state=opened]_.t-icon[data-icon=opened]]:[transform:scale(1)] [&[data-state=closed]_.t-icon[data-icon=opened]]:opacity-0 [&[data-state=closed]_.t-icon[data-icon=opened]]:[visibility:hidden] [&[data-state=closed]_.t-icon[data-icon=opened]]:pointer-events-none [&[data-state=closed]_.t-icon[data-icon=opened]]:[filter:blur(var(--icon-swap-blur))] [&[data-state=closed]_.t-icon[data-icon=opened]]:[transform:scale(var(--icon-swap-start-scale))] [&[data-state=opened]_.t-icon[data-icon=closed]]:opacity-0 [&[data-state=opened]_.t-icon[data-icon=closed]]:[visibility:hidden] [&[data-state=opened]_.t-icon[data-icon=closed]]:pointer-events-none [&[data-state=opened]_.t-icon[data-icon=closed]]:[filter:blur(var(--icon-swap-blur))] [&[data-state=opened]_.t-icon[data-icon=closed]]:[transform:scale(var(--icon-swap-start-scale))] [&[data-state=closed]_[data-icon=opened]_.date-icon-glyph]:[transform:rotate(90deg)] [&[data-state=opened]_[data-icon=closed]_.date-icon-glyph]:[transform:rotate(-90deg)] motion-reduce:[&_.t-icon]:[transition:none!important]"
                  data-state={headingCollapsed ? 'closed' : 'opened'}
                  aria-hidden="true"
                  ><span
                    class={[
                      't-icon',
                      headingCollapsed
                        ? 'opacity-100'
                        : 'pointer-events-none opacity-0'
                    ]}
                    data-icon="closed"
                    ><span
                      class="date-icon-glyph grid [transition:transform_var(--icon-swap-dur)_var(--icon-swap-ease)] [will-change:transform] motion-reduce:transition-none"
                      ><ChevronDown size={15} /></span
                    ></span
                  ><span
                    class={[
                      't-icon',
                      headingCollapsed
                        ? 'pointer-events-none opacity-0'
                        : 'opacity-100'
                    ]}
                    data-icon="opened"
                    ><span
                      class="date-icon-glyph grid [transition:transform_var(--icon-swap-dur)_var(--icon-swap-ease)] [will-change:transform] motion-reduce:transition-none"
                      ><DateGroupOpen size={15} /></span
                    ></span
                  ></span
                ></button
              >
              <div
                class="date-group-body relative min-w-0 w-full [&>.collapse-grid]:relative [&>.collapse-grid]:[z-index:1] [&>.collapse-grid:not(.open)]:[clip-path:inset(0)] [&>.collapse-grid]:min-w-0 [&>.collapse-grid]:max-w-full motion-safe:[&>.collapse-grid]:[transition:grid-template-rows_250ms_cubic-bezier(0.22,_1,_0.36,_1),_opacity_180ms_ease-in-out]"
              >
                <div
                  class="collapse-grid date-bookmarks-collapse grid [grid-template-rows:0fr] [grid-template-columns:minmax(0,_1fr)] min-w-0 max-w-full opacity-0 [&.open]:[grid-template-rows:1fr] [&.open]:opacity-100 [&.open_.collapse-inner]:overflow-visible motion-safe:[transition:grid-template-rows_200ms_cubic-bezier(0.645,_0.045,_0.355,_1),_opacity_150ms_ease-out] motion-reduce:transition-none"
                  class:open={!collapsed}
                  inert={collapsed ? true : undefined}
                  aria-hidden={collapsed}
                >
                  <div
                    class="collapse-inner min-h-0 min-w-0 max-w-full overflow-hidden"
                  >
                    <div
                      class="bookmark-items w-full max-w-full min-w-0 border-0 [border-radius:0] bg-transparent [user-select:none] overflow-visible"
                      role="listbox"
                      tabindex="-1"
                      aria-multiselectable="true"
                      aria-label={`bookmarks saved ${group.date}; drag across rows to select`}
                      onpointerdown={startDrag}
                    >
                      {#each group.items as b (b.id)}
                        {@const bookmarkReminderStatus = reminderStatus(b)}
                        <div
                          data-bookmark={b.id}
                          class="bookmark-row min-w-0 w-full max-w-full flex items-center [gap:12px] [min-height:64px] [padding:14px] relative [isolation:isolate] overflow-visible cursor-pointer [&+.bookmark-row]:[border-top:1px_solid_var(--border)] [&::before]:[content:''] [&::before]:absolute [&::before]:[z-index:0] [&::before]:[inset:0] [&::before]:bg-transparent [&::before]:pointer-events-none [&>*]:relative [&>*]:[z-index:1] [&:hover]:bg-transparent [&:hover::before]:[background:var(--row-hover)] [&.selected]:bg-transparent [&.selected]:[box-shadow:none] [&.selected::before]:[background:var(--accent-soft)] [&.context-active::before]:[background:color-mix(in_srgb,_var(--row-hover)_80%,_var(--foreground)_4%)] [&:focus-visible]:[outline:2px_solid_var(--accent-text)] [&:focus-visible]:[outline-offset:-2px] [&:hover_.row-actions_.icon-button]:opacity-100 max-[520px]:[gap:10px] max-[520px]:[padding:12px] motion-safe:[transition:background-color_140ms_ease]"
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
                                'a,button,input'
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
                          aria-label={b.title}
                        >
                          <div
                            class="bookmark-leading [width:30px] [height:30px] relative shrink-0 [&_.site-letter]:[width:30px] [&_.site-letter]:[height:30px] [&_.site-letter]:[border-radius:7px] [&_.site-letter]:[background:var(--secondary)] [&_.site-letter_img]:[inset:5px] [&_.site-letter_img]:[width:20px] [&_.site-letter_img]:[height:20px] [&_.site-letter:has(img)>svg]:[visibility:hidden]"
                          >
                            <span
                              class="site-letter [width:28px] [height:28px] border-0 [border-radius:4px] bg-transparent grid place-items-center [font-family:var(--font-sans)] [font-size:14px] [font-weight:600] [color:var(--foreground)] shrink-0 relative overflow-hidden [&_img]:absolute [&_img]:[inset:5px] [&_img]:[width:18px] [&_img]:[height:18px] [&_img]:object-contain [&.show-check]:opacity-0"
                              class:show-check={selectMode ||
                                selected.includes(b.id)}
                              ><Globe size={18} /><img
                                src={`https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(b.url)}&sz=32`}
                                alt=""
                                onerror={(event) =>
                                  event.currentTarget.remove()}
                              /></span
                            ><input
                              class="row-check opacity-0 cursor-pointer [appearance:none] absolute [inset:6px] m-0 [width:19px] [height:19px] [background:var(--card)] [border:1px_solid_var(--muted-foreground)] [border-radius:4px] [&:checked]:[background:var(--primary)] [&:checked]:[border-color:var(--primary)] [&:checked::after]:[content:''] [&:checked::after]:absolute [&:checked::after]:[width:8px] [&:checked::after]:[height:5px] [&:checked::after]:[border:solid_var(--primary-foreground)] [&:checked::after]:[border-width:0_0_2px_2px] [&:checked::after]:[transform:rotate(-45deg)] [&:checked::after]:[top:4px] [&:checked::after]:[left:4px] [&:focus-visible]:opacity-100 [&.check-visible]:opacity-100"
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
                          <div
                            class="bookmark-content min-w-0 overflow-hidden flex flex-col items-stretch [gap:3px] [flex:1_1_0%] max-[760px]:[gap:12px] max-[520px]:block"
                          >
                            <a
                              class="bookmark-title min-w-0 block w-full max-w-full overflow-hidden whitespace-nowrap text-ellipsis [font-size:14px] font-medium [line-height:1.4] [&_svg]:hidden [&:hover]:underline [&:hover]:[text-underline-offset:3px] [.is-read_&]:[color:var(--muted-foreground)] max-[520px]:max-w-full max-[520px]:[width:auto] max-[520px]:[font-size:14px]"
                              href={b.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onclick={(event) => {
                                event.stopPropagation();
                                recordOpen(b.id);
                              }}>{b.title}<ArrowUpRight size={14} /></a
                            >
                            <div
                              class="bookmark-meta w-full max-w-full min-w-0 [font-size:var(--secondary-text-font-size)] [line-height:1.4] [color:var(--muted-foreground)] overflow-hidden text-ellipsis whitespace-nowrap max-[520px]:[margin-top:3px] max-[520px]:[font-size:var(--secondary-text-font-size)]"
                            >
                              <span>{b.url}</span>
                            </div>
                          </div>
                          <div
                            class="row-actions static! flex items-center shrink-0 [gap:var(--icon-icon-gap)] [margin-left:auto] max-w-full [&_.icon-button]:[width:16px] [&_.icon-button]:[height:28px] [&_.icon-button]:opacity-0 [&_.icon-button:focus-visible]:opacity-100 [&_.icon-button:hover]:bg-transparent [&_.icon-button:hover]:[color:var(--foreground)] [&_.icon-button:focus-visible]:bg-transparent [&_.icon-button:focus-visible]:[color:var(--foreground)] [&_.icon-button.pinned]:[color:var(--foreground)] [&_.icon-button.pinned_svg]:[fill:currentColor] [&_.icon-button.reminder-active]:opacity-100 [&_.icon-button.reminder-active]:[color:var(--foreground)]"
                          >
                            <button
                              class={[
                                'icon-button inline-grid place-items-center [width:30px] [height:30px] p-0 border-0 bg-none [color:var(--muted-foreground)] [border-radius:5px] [&:hover]:[background:var(--secondary)] [&:hover]:[color:var(--foreground)] [&.small]:[width:24px] [&.small]:[height:24px] motion-safe:[transition:background-color_140ms_ease]',
                                bookmarkReminderStatus === 'active' &&
                                  b.reminderAt && [
                                    'reminder-active min-[781px]:absolute min-[781px]:top-1/2 min-[781px]:-translate-y-1/2',
                                    flags[b.id]?.pinned
                                      ? 'min-[781px]:[left:calc(100%_+_30px)]'
                                      : 'min-[781px]:[left:calc(100%_+_8px)]'
                                  ]
                              ]}
                              aria-label={`remind me about ${b.title}`}
                              title={b.reminderAt
                                ? formatReminder(b.reminderAt)
                                : 'set reminder'}
                              onclick={(event) =>
                                void showReminderPopover(event, b)}
                              ><ActionBell size={14} /></button
                            >
                            <button
                              class="icon-button inline-grid place-items-center [width:30px] [height:30px] p-0 border-0 bg-none [color:var(--muted-foreground)] [border-radius:5px] [&:hover]:[background:var(--secondary)] [&:hover]:[color:var(--foreground)] [&.small]:[width:24px] [&.small]:[height:24px] max-[780px]:[&.pinned]:opacity-100 motion-safe:[transition:background-color_140ms_ease]"
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
                              class="icon-button inline-grid place-items-center [width:30px] [height:30px] p-0 border-0 bg-none [color:var(--muted-foreground)] [border-radius:5px] [&:hover]:[background:var(--secondary)] [&:hover]:[color:var(--foreground)] [&.small]:[width:24px] [&.small]:[height:24px] motion-safe:[transition:background-color_140ms_ease]"
                              aria-label={copiedTargets.includes(
                                `bookmark:${b.id}`
                              )
                                ? `link copied for ${b.title}`
                                : `copy link for ${b.title}`}
                              title="copy link"
                              onclick={(event) => {
                                event.stopPropagation();
                                void copyLink(b);
                              }}
                              ><CopyIconSwap
                                copied={copiedTargets.includes(
                                  `bookmark:${b.id}`
                                )}
                                size={14}
                              /></button
                            >
                            <button
                              class="icon-button inline-grid place-items-center [width:30px] [height:30px] p-0 border-0 bg-none [color:var(--muted-foreground)] [border-radius:5px] [&:hover]:[background:var(--secondary)] [&:hover]:[color:var(--foreground)] [&.small]:[width:24px] [&.small]:[height:24px] motion-safe:[transition:background-color_140ms_ease]"
                              title="more options"
                              aria-label={`more options for ${b.title}`}
                              onclick={(e) => showContext(e, b)}
                              ><EllipsisVertical size={16} /></button
                            >
                          </div>
                          {#if flags[b.id]?.pinned}<span
                              class="absolute! [left:calc(100%_+_8px)] top-1/2 hidden! -translate-y-1/2 place-items-center text-foreground [&_svg]:fill-current min-[781px]:grid!"
                              aria-hidden="true"><Pin size={14} /></span
                            >{/if}
                          {#if b.reminderAt && bookmarkReminderStatus === 'done'}<span
                              class={[
                                'reminder-done-marker absolute! right-[14px] top-1/2 grid -translate-y-1/2 place-items-center text-muted-foreground min-[781px]:right-auto',
                                flags[b.id]?.pinned
                                  ? 'min-[781px]:[left:calc(100%_+_30px)]'
                                  : 'min-[781px]:[left:calc(100%_+_8px)]'
                              ]}
                              title="reminder completed"
                              aria-label="reminder completed"
                              ><ReminderDone size={16} /></span
                            >{/if}
                        </div>
                      {/each}
                    </div>
                  </div>
                </div>
                <div
                  class="date-summary absolute [inset:0] [min-height:46px] flex items-center justify-center opacity-0 pointer-events-none [transition:opacity_160ms_ease] [z-index:0] [&.visible]:opacity-100 [&.visible]:[pointer-events:auto] max-[1060px]:[min-height:38px] motion-reduce:transition-none"
                  class:visible={collapsed}
                  inert={!collapsed ? true : undefined}
                  aria-hidden={!collapsed}
                >
                  <button
                    type="button"
                    class="date-summary-trigger flex w-full flex-col [gap:6px] [padding:6px_0_8px] bg-none [border:none] cursor-pointer"
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
                      class="date-summary-count text-center leading-none text-muted-foreground [font-size:var(--body-font-size)]"
                      >{group.items.length}
                      {group.items.length === 1 ? 'link' : 'links'}</span
                    >
                  </button>
                </div>
              </div>
            </div>
          {/each}
        {:else}<div
            class="section-empty bookmarks-empty relative [isolation:isolate] flex flex-col items-center justify-center [min-height:92px] text-center border-0 [border-block:1px_solid_var(--border)] [border-radius:0] [background:var(--sidebar)] [padding:16px_12px] [&_strong]:[font-size:var(--section-label-font-size)] [&_strong]:font-medium [&_p]:[color:var(--muted-foreground)] [&_p]:[font-size:var(--secondary-text-font-size)] [&_p]:[line-height:1.6] [&_p]:[margin:10px_0_0] [margin-top:6px] [min-height:108px] [&_.plain-button]:[margin-top:12px] [&_.plain-button]:[font-size:var(--body-font-size)]"
          >
            <EmptyMono />
            <strong>no bookmarks here yet.</strong>
            <p>
              {section === 'opened'
                ? 'bookmarks you open will stay here for 7 days.'
                : 'save a link to start your collection.'}
            </p>
            {#if section === 'all'}<button
                class="plain-button [&_svg]:block inline-flex items-center [gap:var(--icon-text-gap)] [padding:5px_6px] border-0 [border-radius:5px] bg-transparent [color:var(--foreground)] [font-size:var(--body-font-size)] whitespace-nowrap [&:hover]:[background:var(--secondary)] [&.control-active]:[background:var(--secondary)] [&.control-active]:[color:var(--foreground)] max-[520px]:[padding:6px_4px] max-[520px]:[font-size:var(--body-font-size)]"
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

  <div
    class="fixed inset-x-0 bottom-0 z-20 mx-auto h-40 w-[min(var(--reading-max),calc(100%-40px))] bg-linear-to-t from-background via-background/80 to-transparent max-[760px]:w-[calc(100%-28px)] max-[520px]:h-24 max-[520px]:w-[calc(100%-20px)]"
    aria-hidden="true"
  ></div>

  {#if !selectedCollections.length && !selected.length}<nav
      class="library-tabs floating-library-tabs fixed grid [grid-template-columns:max-content_max-content] p-0 [border:1px_solid_var(--border)] [border-radius:22px] [background:var(--sidebar)] overflow-hidden [z-index:30] [left:50%] [bottom:30px] [min-height:42px] [transform:translateX(-50%)] [box-shadow:var(--shadow)] [&.floating-library-tabs_button]:[min-height:40px] [&.floating-library-tabs_button]:[font-size:var(--section-label-font-size)] [&_button]:relative [&_button]:[z-index:1] [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:[gap:var(--icon-text-gap)] [&_button]:min-w-0 [&_button]:[min-height:28px] [&_button]:[padding:4px_9px] [&_button]:bg-none [&_button]:border-0 [&_button]:[border-radius:21px] [&_button]:[font-size:11px] [&_button]:[line-height:1] [&_button]:[color:var(--muted-foreground)] [&_button]:whitespace-nowrap [&_button_svg]:block [&_button.active]:[color:var(--foreground)] [&_button.active_svg]:[fill:currentColor] max-[760px]:[&_button]:[padding:4px_9px] max-[520px]:[grid-template-columns:repeat(4,_max-content)] max-[520px]:[bottom:max(10px,_env(safe-area-inset-bottom))] motion-safe:[transform-origin:center_bottom] motion-safe:[animation:selection-dock-in_360ms_cubic-bezier(0.22,_1,_0.36,_1)_both] motion-safe:[will-change:transform,_opacity]"
      aria-label="library"
    >
      <span
        class:opened={section === 'opened'}
        class="tab-indicator bg-(--accent-soft)! absolute [z-index:0] [top:-1px] [bottom:-1px] [left:-1px] [border:1px_solid_var(--border)] [border-radius:22px] [background:var(--secondary)] [box-shadow:0_1px_5px_#0000000a] motion-safe:[transition:transform_180ms_cubic-bezier(0.645,_0.045,_0.355,_1),_width_180ms_cubic-bezier(0.645,_0.045,_0.355,_1)] motion-reduce:transition-none"
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
      <button
        type="button"
        class="hidden! text-[#e09a22]! max-[520px]:inline-flex!"
        aria-label="install the linux desktop widget"
        aria-haspopup="dialog"
        aria-controls="linux-widget-panel"
        aria-expanded={linuxPanelOpen}
        onclick={() => void openLinuxPanel()}
        ><UbuntuWidgetLauncher size={18} /><span>linux</span></button
      >
      <button
        type="button"
        class="hidden! text-[#0b84ff]! max-[520px]:inline-flex!"
        aria-label="install the mac desktop widget"
        aria-haspopup="dialog"
        aria-controls="widget-panel"
        aria-expanded={widgetPanelOpen}
        onclick={() => void openWidgetPanel()}
        ><MacWidgetLauncher size={18} /><span>mac</span></button
      >
    </nav>{/if}

  <div
    class="platform-launchers fixed [right:20px] [bottom:20px] [z-index:40] flex items-center [gap:8px] max-[520px]:hidden"
    aria-label="chikota desktop tools"
  >
    <span
      class="platform-launcher-wrap relative inline-flex [--platform-color:#e09a22]"
    >
      {#if detectedPlatform === 'linux' && platformCalloutOpen}<span
          class="platform-callout linux-callout absolute [right:0] [bottom:calc(100%_+_2px)] [z-index:2] [color:#fff] [font-family:var(--font-sans)] [font-size:var(--body-font-size)] [line-height:20px] [animation:callout-fade-in_180ms_ease-out_both] motion-reduce:[animation:none]"
          role="status"
        >
          <span
            class="callout-dot small absolute block rounded-full [background:var(--platform-color)] [transform:scale(0)] [animation:callout-dot-in_120ms_ease-out_both] [&.small]:[right:-5px] [&.small]:[bottom:-10px] [&.small]:[width:4px] [&.small]:[height:4px] [&.small]:[animation-delay:70ms] [&.large]:[right:-4px] [&.large]:[bottom:-4px] [&.large]:[width:12px] [&.large]:[height:12px] [&.large]:[animation-delay:20ms] motion-reduce:[animation:none]"
            aria-hidden="true"
          ></span>
          <span
            class="callout-dot large absolute block rounded-full [background:var(--platform-color)] [transform:scale(0)] [animation:callout-dot-in_120ms_ease-out_both] [&.small]:[right:-5px] [&.small]:[bottom:-10px] [&.small]:[width:4px] [&.small]:[height:4px] [&.small]:[animation-delay:70ms] [&.large]:[right:-4px] [&.large]:[bottom:-4px] [&.large]:[width:12px] [&.large]:[height:12px] [&.large]:[animation-delay:20ms] motion-reduce:[animation:none]"
            aria-hidden="true"
          ></span>
          <button
            type="button"
            class="callout-message block [width:max-content] [max-width:min(310px,_calc(100vw_-_32px))] [padding:6px_12px] border-0 [border-radius:999px] [background:var(--platform-color)] [color:#fff] cursor-pointer text-left [transform-origin:bottom_right] [animation:callout-pop_380ms_cubic-bezier(0.22,_1.35,_0.36,_1)_90ms_both] [&>span]:[border-bottom:1px_dashed_#ffffffb3] [&>span]:font-medium motion-reduce:[animation:none]"
            onclick={() => void openLinuxPanel()}
            >on linux? <span>bring chikota to your desktop.</span></button
          >
        </span>{/if}
      <button
        type="button"
        class="platform-launcher linux-launcher grid [width:40px] [height:40px] place-items-center p-0 border-0 rounded-full bg-transparent [transition:color_160ms_ease,_transform_180ms_var(--panel-ease)] [&_svg]:[width:28px] [&_svg]:[height:28px] [&_svg]:[scale:1] [&:hover]:[transform:translateY(-2px)_scale(1.06)] [&:focus-visible]:[outline:2px_solid_currentColor] [&:focus-visible]:[outline-offset:2px] [color:var(--platform-color)]"
        aria-label="install the linux desktop widget"
        aria-haspopup="dialog"
        aria-controls="linux-widget-panel"
        aria-expanded={linuxPanelOpen}
        title="linux desktop widget"
        onclick={() => void openLinuxPanel()}
      >
        <UbuntuWidgetLauncher />
      </button>
    </span>
    <span
      class="platform-launcher-wrap relative inline-flex [--platform-color:#0b84ff]"
    >
      {#if detectedPlatform === 'mac' && platformCalloutOpen}<span
          class="platform-callout mac-callout absolute [right:0] [bottom:calc(100%_+_2px)] [z-index:2] [color:#fff] [font-family:var(--font-sans)] [font-size:var(--body-font-size)] [line-height:20px] [animation:callout-fade-in_180ms_ease-out_both] motion-reduce:[animation:none]"
          role="status"
        >
          <span
            class="callout-dot small absolute block rounded-full [background:var(--platform-color)] [transform:scale(0)] [animation:callout-dot-in_120ms_ease-out_both] [&.small]:[right:-5px] [&.small]:[bottom:-10px] [&.small]:[width:4px] [&.small]:[height:4px] [&.small]:[animation-delay:70ms] [&.large]:[right:-4px] [&.large]:[bottom:-4px] [&.large]:[width:12px] [&.large]:[height:12px] [&.large]:[animation-delay:20ms] motion-reduce:[animation:none]"
            aria-hidden="true"
          ></span>
          <span
            class="callout-dot large absolute block rounded-full [background:var(--platform-color)] [transform:scale(0)] [animation:callout-dot-in_120ms_ease-out_both] [&.small]:[right:-5px] [&.small]:[bottom:-10px] [&.small]:[width:4px] [&.small]:[height:4px] [&.small]:[animation-delay:70ms] [&.large]:[right:-4px] [&.large]:[bottom:-4px] [&.large]:[width:12px] [&.large]:[height:12px] [&.large]:[animation-delay:20ms] motion-reduce:[animation:none]"
            aria-hidden="true"
          ></span>
          <button
            type="button"
            class="callout-message block [width:max-content] [max-width:min(310px,_calc(100vw_-_32px))] [padding:6px_12px] border-0 [border-radius:999px] [background:var(--platform-color)] [color:#fff] cursor-pointer text-left [transform-origin:bottom_right] [animation:callout-pop_380ms_cubic-bezier(0.22,_1.35,_0.36,_1)_90ms_both] [&>span]:[border-bottom:1px_dashed_#ffffffb3] [&>span]:font-medium motion-reduce:[animation:none]"
            onclick={() => void openWidgetPanel()}
            >on a mac? <span>bring chikota to your desktop.</span></button
          >
        </span>{/if}
      <button
        type="button"
        class="platform-launcher mac-launcher grid [width:40px] [height:40px] place-items-center p-0 border-0 rounded-full bg-transparent [transition:color_160ms_ease,_transform_180ms_var(--panel-ease)] [&_svg]:[width:28px] [&_svg]:[height:28px] [&_svg]:[scale:1] [&:hover]:[transform:translateY(-2px)_scale(1.06)] [&:focus-visible]:[outline:2px_solid_currentColor] [&:focus-visible]:[outline-offset:2px] [color:var(--platform-color)]"
        aria-label="install the mac desktop widget"
        aria-haspopup="dialog"
        aria-controls="widget-panel"
        aria-expanded={widgetPanelOpen}
        title="mac desktop widget"
        onclick={() => void openWidgetPanel()}
      >
        <MacWidgetLauncher />
      </button>
    </span>
  </div>

  {#if extensionPanelMounted}<div
      bind:this={extensionPanel}
      id="extension-panel"
      class="extension-panel t-panel-slide [transform:translateY(var(--panel-translate-y))] opacity-0 [filter:blur(var(--panel-blur))] pointer-events-none [transition:transform_var(--panel-close-dur)_var(--panel-ease),_opacity_var(--panel-close-dur)_var(--panel-ease),_filter_var(--panel-close-dur)_var(--panel-ease)] [will-change:transform,_opacity,_filter] [&[data-open=true]]:[transform:translateY(0)] [&[data-open=true]]:opacity-100 [&[data-open=true]]:[filter:blur(0)] [&[data-open=true]]:[pointer-events:auto] [&[data-open=true]]:[transition:transform_var(--panel-open-dur)_var(--panel-ease),_opacity_var(--panel-open-dur)_var(--panel-ease),_filter_var(--panel-open-dur)_var(--panel-ease)] [--panel-translate-y:calc(-100%_-_20px)] fixed [z-index:45] [top:0] [right:auto] [left:calc(75%_-_56px)] [width:480px] [max-width:calc(100vw_-_20px)] [max-height:100dvh] overflow-y-auto [scrollbar-width:none] [padding:16px] [border:1px_solid_var(--border)] [border-top:0] [border-radius:10px] [border-top-left-radius:0] [border-top-right-radius:0] [background:var(--card)] [color:var(--foreground)] [box-shadow:var(--shadow)] outline-none [font-family:var(--font-sans)] [font-size:var(--modal-body-font-size)] [&::-webkit-scrollbar]:hidden [&_h2]:m-0 [&_h2]:[font-size:32px] [&_h2]:[line-height:1.15] [&_.extension-demo]:[margin-bottom:18px] [&_.extension-demo]:[padding:12px] [&_.setup-steps]:[margin-block:0_16px] [&_.setup-steps]:[font-size:var(--modal-body-font-size)] [&_.settings-note]:[margin:0_0_16px] [&_.download-extension]:[min-height:32px] max-[1716px]:[right:0] max-[1716px]:[left:auto] max-[1716px]:[width:min(480px,_100vw)] motion-reduce:[transition:none!important]"
      data-open={extensionPanelOpen}
      role="dialog"
      aria-modal="false"
      aria-labelledby="extension-panel-title"
      tabindex="-1"
      onkeydown={(event) => {
        if (event.key === 'Escape') closeExtensionPanel();
      }}
    >
      <div
        class="extension-panel-heading flex items-center [gap:var(--icon-text-gap)] [margin-bottom:18px] [color:var(--muted-foreground)] [font-size:var(--modal-body-font-size)] [&_button]:[margin-left:auto]"
      >
        <BrowserExtension size={18} /><span>browser extension</span><button
          class="icon-button small inline-grid place-items-center [width:30px] [height:30px] p-0 border-0 bg-none [color:var(--muted-foreground)] [border-radius:5px] [&:hover]:[background:var(--secondary)] [&:hover]:[color:var(--foreground)] [&.small]:[width:24px] [&.small]:[height:24px] motion-safe:[transition:background-color_140ms_ease]"
          aria-label="close browser extension panel"
          onclick={closeExtensionPanel}><Cross2 size={14} /></button
        >
      </div>
      <h2 id="extension-panel-title">keep it in one click.</h2>
      <p
        class="dialog-description [margin:5px_0_18px] [font-size:var(--modal-body-font-size)] [line-height:1.7] [color:var(--muted-foreground)]"
      >
        a small extension for the things you find along the way.
      </p>
      <div
        class="extension-demo [background:var(--sidebar)] [border:1px_solid_var(--border)] [border-radius:10px] [padding:18px] [margin-bottom:24px] [&>span]:[font-size:var(--modal-body-font-size)] [&>span]:[color:var(--muted-foreground)] [&>span]:block [&>span]:[margin-bottom:12px] [&>div]:[font-size:var(--modal-body-font-size)] [&>div]:flex [&>div]:[gap:var(--icon-text-gap)] [&>div]:items-center [&>div]:[padding:10px] [&>div:nth-child(2)]:[background:var(--accent-soft)] [&>div:nth-child(2)]:[border-radius:5px] [&>div:nth-child(2)]:[color:var(--accent-text)]"
      >
        <span>right-click on a website or link</span>
        <div><BookmarkIcon />save to chikota</div>
        <div><ArrowUpRight />open chikota</div>
      </div>
      <ol
        class="setup-steps [font-size:var(--modal-body-font-size)] [line-height:1.8] [padding-left:18px] [list-style:decimal] [&_li]:[margin-bottom:10px] [&_li]:[padding-left:5px] [&_strong]:[overflow-wrap:anywhere] [&_strong]:[font-weight:550]"
      >
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
      <p
        class="settings-note [font-size:var(--modal-body-font-size)] [line-height:1.7] [color:var(--muted-foreground)] [margin:18px_0_12px]"
      >
        works on ordinary websites in chrome and edge. browser-protected pages
        and native apps do not expose these menus to a web extension.
      </p>
      <a
        class="primary-button download-extension inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_transparent] [border-radius:6px] [padding:7px_10px] [font-size:var(--body-font-size)] font-medium [min-height:30px] whitespace-nowrap [background:var(--primary)] [color:var(--primary-foreground)] [&:hover]:[filter:brightness(1.12)] w-full [margin-top:5px] motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)]"
        href="/chikota-extension.zip"
        download><Download />download extension</a
      >
    </div>{/if}

  {#if widgetPanelMounted}<div
      bind:this={widgetPanel}
      id="widget-panel"
      class="extension-panel desktop-widget-panel widget-panel t-panel-slide [transform:translateY(var(--panel-translate-y))] opacity-0 [filter:blur(var(--panel-blur))] pointer-events-none [transition:transform_var(--panel-close-dur)_var(--panel-ease),_opacity_var(--panel-close-dur)_var(--panel-ease),_filter_var(--panel-close-dur)_var(--panel-ease)] [will-change:transform,_opacity,_filter] [&[data-open=true]]:[transform:translateY(0)] [&[data-open=true]]:opacity-100 [&[data-open=true]]:[filter:blur(0)] [&[data-open=true]]:[pointer-events:auto] [&[data-open=true]]:[transition:transform_var(--panel-open-dur)_var(--panel-ease),_opacity_var(--panel-open-dur)_var(--panel-ease),_filter_var(--panel-open-dur)_var(--panel-ease)] [--panel-translate-y:calc(-100%_-_20px)] fixed [z-index:45] [top:0] [right:auto] [left:calc(75%_-_56px)] [width:480px] [max-width:calc(100vw_-_20px)] [max-height:100dvh] overflow-y-auto [scrollbar-width:none] [padding:16px] [border:1px_solid_var(--border)] [border-top:0] [border-radius:10px] [border-top-left-radius:0] [border-top-right-radius:0] [background:var(--card)] [color:var(--foreground)] [box-shadow:var(--shadow)] outline-none [font-family:var(--font-sans)] [font-size:var(--modal-body-font-size)] [&::-webkit-scrollbar]:hidden [--panel-translate-y:calc(100%_+_20px)] [top:auto] [bottom:0] [border-top:1px_solid_var(--border)] [border-bottom:0] [border-radius:10px_10px_0_0] [&_h2]:m-0 [&_h2]:[font-size:32px] [&_h2]:[line-height:1.15] [&_.extension-demo]:[margin-bottom:18px] [&_.extension-demo]:[padding:12px] [&_.setup-steps]:[margin-block:0_16px] [&_.setup-steps]:[font-size:var(--modal-body-font-size)] [&_.settings-note]:[margin:0_0_16px] [&_.download-extension]:[min-height:32px] [&>p]:[margin:8px_0_12px] [&>p]:[color:var(--muted-foreground)] [&>p]:[font-size:var(--modal-body-font-size)] [&>p]:[line-height:1.6] [&>.widget-setup-note]:[margin-top:0] [&>.widget-setup-note]:[padding:8px] [&>.widget-setup-note]:[border:1px_solid_var(--border)] [&>.widget-setup-note]:[color:var(--foreground)] [&>button]:w-full [&>small]:block [&>small]:[margin-top:7px] [&>small]:[color:var(--muted-foreground)] [&>small]:[font-size:var(--secondary-text-font-size)] max-[1716px]:[right:0] max-[1716px]:[left:auto] max-[1716px]:[width:min(480px,_100vw)] motion-reduce:[transition:none!important]"
      data-open={widgetPanelOpen}
      role="dialog"
      aria-modal="false"
      aria-labelledby="widget-panel-title"
      tabindex="-1"
      onkeydown={(event) => {
        if (event.key === 'Escape') closeWidgetPanel();
      }}
    >
      <div
        class="extension-panel-heading flex items-center [gap:var(--icon-text-gap)] [margin-bottom:18px] [color:var(--muted-foreground)] [font-size:var(--modal-body-font-size)] [&_button]:[margin-left:auto]"
      >
        <MacWidgetLauncher size={18} /><span>mac desktop widget</span><button
          class="icon-button small inline-grid place-items-center [width:30px] [height:30px] p-0 border-0 bg-none [color:var(--muted-foreground)] [border-radius:5px] [&:hover]:[background:var(--secondary)] [&:hover]:[color:var(--foreground)] [&.small]:[width:24px] [&.small]:[height:24px] motion-safe:[transition:background-color_140ms_ease]"
          aria-label="close mac desktop widget panel"
          onclick={closeWidgetPanel}><Cross2 size={14} /></button
        >
      </div>
      <h2 id="widget-panel-title">keep it close to home.</h2>
      <p
        class="dialog-description [margin:5px_0_18px] [font-size:var(--modal-body-font-size)] [line-height:1.7] [color:var(--muted-foreground)]"
      >
        reminders, pinned links, and recent opens stay available from your
        desktop, including while offline.
      </p>
      <ol
        class="widget-setup-steps [margin:0_0_12px] [padding-left:18px] [color:var(--muted-foreground)] [font-size:var(--modal-body-font-size)] [line-height:1.6] [&_li+li]:[margin-top:6px] [&_strong]:[color:var(--foreground)] [&_strong]:[font-weight:550]"
      >
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
      {#if data.session}
        {#if widgetToken}<button
            class="widget-token flex items-center [gap:8px] [padding:9px] [border:1px_solid_var(--border)] [border-radius:6px] [background:var(--sidebar)] [color:var(--foreground)] text-left [&_code]:min-w-0 [&_code]:overflow-hidden [&_code]:flex-1 [&_code]:[font-size:var(--modal-body-font-size)] [&_code]:text-ellipsis [&_code]:whitespace-nowrap"
            aria-label={copiedTargets.includes('widget-token')
              ? 'mac connection code copied'
              : 'copy mac connection code'}
            onclick={copyWidgetToken}
            ><code>{widgetToken}</code><CopyIconSwap
              copied={copiedTargets.includes('widget-token')}
              size={14}
            /></button
          ><small
            class="widget-token-note block [margin-top:7px] [color:var(--muted-foreground)] [font-size:var(--secondary-text-font-size)]"
            >shown once. paste this code into the mac app.</small
          >{:else}<button
            class="secondary-button widget-connect-action inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_transparent] [border-radius:6px] [padding:7px_10px] [font-size:var(--body-font-size)] font-medium [min-height:30px] whitespace-nowrap [background:var(--card)] [border-color:var(--border)] [&:hover]:[background:var(--secondary)] w-full motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)]"
            disabled={widgetTokenBusy}
            onclick={createWidgetToken}
            >{widgetTokenBusy
              ? 'creating…'
              : 'create mac connection code'}</button
          >{/if}
        <p
          class="form-error [color:#cf6356] [font-size:var(--modal-body-font-size)] [line-height:1.6] [&:empty]:hidden"
          role="alert"
        >
          {widgetTokenError}
        </p>
      {:else}<button
          class="secondary-button widget-connect-action inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_transparent] [border-radius:6px] [padding:7px_10px] [font-size:var(--body-font-size)] font-medium [min-height:30px] whitespace-nowrap [background:var(--card)] [border-color:var(--border)] [&:hover]:[background:var(--secondary)] w-full motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)]"
          onclick={() => authClient.signIn.social({ provider: 'google' })}
          >sign in to connect the widget</button
        >
      {/if}
    </div>{/if}

  {#if linuxPanelMounted}<div
      bind:this={linuxPanel}
      id="linux-widget-panel"
      class="extension-panel desktop-widget-panel widget-panel t-panel-slide [transform:translateY(var(--panel-translate-y))] opacity-0 [filter:blur(var(--panel-blur))] pointer-events-none [transition:transform_var(--panel-close-dur)_var(--panel-ease),_opacity_var(--panel-close-dur)_var(--panel-ease),_filter_var(--panel-close-dur)_var(--panel-ease)] [will-change:transform,_opacity,_filter] [&[data-open=true]]:[transform:translateY(0)] [&[data-open=true]]:opacity-100 [&[data-open=true]]:[filter:blur(0)] [&[data-open=true]]:[pointer-events:auto] [&[data-open=true]]:[transition:transform_var(--panel-open-dur)_var(--panel-ease),_opacity_var(--panel-open-dur)_var(--panel-ease),_filter_var(--panel-open-dur)_var(--panel-ease)] [--panel-translate-y:calc(-100%_-_20px)] fixed [z-index:45] [top:0] [right:auto] [left:calc(75%_-_56px)] [width:480px] [max-width:calc(100vw_-_20px)] [max-height:100dvh] overflow-y-auto [scrollbar-width:none] [padding:16px] [border:1px_solid_var(--border)] [border-top:0] [border-radius:10px] [border-top-left-radius:0] [border-top-right-radius:0] [background:var(--card)] [color:var(--foreground)] [box-shadow:var(--shadow)] outline-none [font-family:var(--font-sans)] [font-size:var(--modal-body-font-size)] [&::-webkit-scrollbar]:hidden [--panel-translate-y:calc(100%_+_20px)] [top:auto] [bottom:0] [border-top:1px_solid_var(--border)] [border-bottom:0] [border-radius:10px_10px_0_0] [&_h2]:m-0 [&_h2]:[font-size:32px] [&_h2]:[line-height:1.15] [&_.extension-demo]:[margin-bottom:18px] [&_.extension-demo]:[padding:12px] [&_.setup-steps]:[margin-block:0_16px] [&_.setup-steps]:[font-size:var(--modal-body-font-size)] [&_.settings-note]:[margin:0_0_16px] [&_.download-extension]:[min-height:32px] [&>p]:[margin:8px_0_12px] [&>p]:[color:var(--muted-foreground)] [&>p]:[font-size:var(--modal-body-font-size)] [&>p]:[line-height:1.6] [&>.widget-setup-note]:[margin-top:0] [&>.widget-setup-note]:[padding:8px] [&>.widget-setup-note]:[border:1px_solid_var(--border)] [&>.widget-setup-note]:[color:var(--foreground)] [&>button]:w-full [&>small]:block [&>small]:[margin-top:7px] [&>small]:[color:var(--muted-foreground)] [&>small]:[font-size:var(--secondary-text-font-size)] max-[1716px]:[right:0] max-[1716px]:[left:auto] max-[1716px]:[width:min(480px,_100vw)] motion-reduce:[transition:none!important]"
      data-open={linuxPanelOpen}
      role="dialog"
      aria-modal="false"
      aria-labelledby="linux-widget-panel-title"
      tabindex="-1"
      onkeydown={(event) => {
        if (event.key === 'Escape') closeLinuxPanel();
      }}
    >
      <div
        class="extension-panel-heading flex items-center [gap:var(--icon-text-gap)] [margin-bottom:18px] [color:var(--muted-foreground)] [font-size:var(--modal-body-font-size)] [&_button]:[margin-left:auto]"
      >
        <UbuntuWidgetLauncher size={18} /><span>linux desktop widget</span
        ><button
          class="icon-button small inline-grid place-items-center [width:30px] [height:30px] p-0 border-0 bg-none [color:var(--muted-foreground)] [border-radius:5px] [&:hover]:[background:var(--secondary)] [&:hover]:[color:var(--foreground)] [&.small]:[width:24px] [&.small]:[height:24px] motion-safe:[transition:background-color_140ms_ease]"
          aria-label="close linux desktop widget panel"
          onclick={closeLinuxPanel}><Cross2 size={14} /></button
        >
      </div>
      <h2 id="linux-widget-panel-title">keep it close on linux.</h2>
      <p
        class="dialog-description [margin:5px_0_18px] [font-size:var(--modal-body-font-size)] [line-height:1.7] [color:var(--muted-foreground)]"
      >
        a lightweight desktop companion for pinned links, reminders, and recent
        opens—with an offline cache for when the network disappears.
      </p>
      <ol
        class="widget-setup-steps [margin:0_0_12px] [padding-left:18px] [color:var(--muted-foreground)] [font-size:var(--modal-body-font-size)] [line-height:1.6] [&_li+li]:[margin-top:6px] [&_strong]:[color:var(--foreground)] [&_strong]:[font-weight:550]"
      >
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
        class="primary-button download-extension inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_transparent] [border-radius:6px] [padding:7px_10px] [font-size:var(--body-font-size)] font-medium [min-height:30px] whitespace-nowrap [background:var(--primary)] [color:var(--primary-foreground)] [&:hover]:[filter:brightness(1.12)] w-full [margin-top:5px] motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)]"
        href="/chikota-linux-widget.zip"
        download><Download />download linux widget</a
      >
      {#if data.session}
        {#if widgetToken}<button
            class="widget-token linux-widget-token [margin-top:14px] flex items-center [gap:8px] [padding:9px] [border:1px_solid_var(--border)] [border-radius:6px] [background:var(--sidebar)] [color:var(--foreground)] text-left [&_code]:min-w-0 [&_code]:overflow-hidden [&_code]:flex-1 [&_code]:[font-size:var(--modal-body-font-size)] [&_code]:text-ellipsis [&_code]:whitespace-nowrap"
            aria-label={copiedTargets.includes('widget-token')
              ? 'connection code copied'
              : 'copy connection code'}
            onclick={copyWidgetToken}
            ><code>{widgetToken}</code><CopyIconSwap
              copied={copiedTargets.includes('widget-token')}
              size={14}
            /></button
          ><small
            class="widget-token-note block [margin-top:7px] [color:var(--muted-foreground)] [font-size:var(--secondary-text-font-size)]"
            >shown once. paste this code into the linux widget.</small
          >{:else}<button
            class="secondary-button widget-connect-action linux-connect-action inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_transparent] [border-radius:6px] [padding:7px_10px] [font-size:var(--body-font-size)] font-medium [min-height:30px] whitespace-nowrap [background:var(--card)] [border-color:var(--border)] [&:hover]:[background:var(--secondary)] [margin-top:14px] w-full motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)]"
            disabled={widgetTokenBusy}
            onclick={createWidgetToken}
            >{widgetTokenBusy ? 'creating…' : 'create connection code'}</button
          >{/if}
        <p
          class="form-error [color:#cf6356] [font-size:var(--modal-body-font-size)] [line-height:1.6] [&:empty]:hidden"
          role="alert"
        >
          {widgetTokenError}
        </p>
      {:else}<button
          class="secondary-button widget-connect-action linux-connect-action inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_transparent] [border-radius:6px] [padding:7px_10px] [font-size:var(--body-font-size)] font-medium [min-height:30px] whitespace-nowrap [background:var(--card)] [border-color:var(--border)] [&:hover]:[background:var(--secondary)] [margin-top:14px] w-full motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)]"
          onclick={() => authClient.signIn.social({ provider: 'google' })}
          >sign in to connect the widget</button
        >
      {/if}
    </div>{/if}

  {#if remindersPanelMounted}<div
      bind:this={remindersPanel}
      class="extension-panel reminders-panel t-panel-slide [transform:translateY(var(--panel-translate-y))] opacity-0 [filter:blur(var(--panel-blur))] pointer-events-none [transition:transform_var(--panel-close-dur)_var(--panel-ease),_opacity_var(--panel-close-dur)_var(--panel-ease),_filter_var(--panel-close-dur)_var(--panel-ease)] [will-change:transform,_opacity,_filter] [&[data-open=true]]:[transform:translateY(0)] [&[data-open=true]]:opacity-100 [&[data-open=true]]:[filter:blur(0)] [&[data-open=true]]:[pointer-events:auto] [&[data-open=true]]:[transition:transform_var(--panel-open-dur)_var(--panel-ease),_opacity_var(--panel-open-dur)_var(--panel-ease),_filter_var(--panel-open-dur)_var(--panel-ease)] [--panel-translate-y:calc(-100%_-_20px)] fixed [z-index:45] [top:0] [right:auto] [left:calc(75%_-_56px)] [width:480px] [max-width:calc(100vw_-_20px)] [max-height:100dvh] overflow-y-auto [scrollbar-width:none] [padding:16px] [border:1px_solid_var(--border)] [border-top:0] [border-radius:10px] [border-top-left-radius:0] [border-top-right-radius:0] [background:var(--card)] [color:var(--foreground)] [box-shadow:var(--shadow)] outline-none [font-family:var(--font-sans)] [font-size:var(--modal-body-font-size)] [&::-webkit-scrollbar]:hidden [&_h2]:m-0 [&_h2]:[font-size:32px] [&_h2]:[line-height:1.15] [&_.extension-demo]:[margin-bottom:18px] [&_.extension-demo]:[padding:12px] [&_.setup-steps]:[margin-block:0_16px] [&_.setup-steps]:[font-size:var(--modal-body-font-size)] [&_.settings-note]:[margin:0_0_16px] [&_.download-extension]:[min-height:32px] [overflow-x:hidden] max-[1716px]:[right:0] max-[1716px]:[left:auto] max-[1716px]:[width:min(480px,_100vw)] motion-reduce:[transition:none!important]"
      data-open={remindersPanelOpen}
      role="dialog"
      aria-modal="false"
      aria-labelledby="reminders-panel-title"
      tabindex="-1"
      onkeydown={(event) => {
        if (event.key === 'Escape') closeRemindersPanel();
      }}
    >
      <div
        class="extension-panel-heading flex items-center [gap:var(--icon-text-gap)] [margin-bottom:18px] [color:var(--muted-foreground)] [font-size:var(--modal-body-font-size)] [&_button]:[margin-left:auto]"
      >
        <ActionBell size={18} /><button
          class="icon-button small inline-grid place-items-center [width:30px] [height:30px] p-0 border-0 bg-none [color:var(--muted-foreground)] [border-radius:5px] [&:hover]:[background:var(--secondary)] [&:hover]:[color:var(--foreground)] [&.small]:[width:24px] [&.small]:[height:24px] motion-safe:[transition:background-color_140ms_ease]"
          aria-label="close reminders panel"
          onclick={closeRemindersPanel}><Cross2 size={14} /></button
        >
      </div>
      <h2 id="reminders-panel-title">reminders</h2>
      <p
        class="dialog-description [margin:5px_0_18px] [font-size:var(--modal-body-font-size)] [line-height:1.7] [color:var(--muted-foreground)]"
      >
        upcoming, completed, and canceled reminders in one place.
      </p>
      {#if reminderBookmarks.length}<div
          class="reminder-table [margin-top:16px] [border-top:1px_solid_var(--border)] [font-variant-numeric:tabular-nums] [&_tr:last-child]:[border-bottom:none] [&_tbody_tr:last-child]:[border-bottom:none]"
          role="table"
          aria-label="bookmark reminders"
        >
          <div
            class="reminder-table-head grid [grid-template-columns:minmax(0,_1fr)_104px_96px_56px_24px] items-center [column-gap:8px] [min-height:30px] [background:var(--secondary)] [color:var(--muted-foreground)] [font-size:10px] [text-transform:uppercase] [letter-spacing:0.04em] [&>span]:min-w-0 [&>span]:overflow-hidden [&>span]:text-ellipsis [&>span]:whitespace-nowrap"
            role="row"
          >
            <span role="columnheader">bookmark</span>
            <span role="columnheader">scheduled</span>
            <span role="columnheader">delivery</span>
            <span role="columnheader">status</span>
            <span
              role="columnheader"
              class="sr-only absolute [width:1px] [height:1px] p-0 [margin:-1px] overflow-hidden [clip:rect(0,_0,_0,_0)] whitespace-nowrap border-0"
              >actions</span
            >
          </div>
          <div
            class="reminder-table-body [&>.reminder-table-row:last-child]:[border-bottom:none]"
            role="rowgroup"
          >
            {#each reminderBookmarks as bookmark}{@const status =
                reminderStatus(bookmark)}
              <div
                class:done={status === 'done'}
                class:canceled={status === 'canceled'}
                class="reminder-table-row grid [grid-template-columns:minmax(0,_1fr)_104px_96px_56px_24px] items-center [column-gap:8px] [min-height:54px] [border-top:1px_solid_var(--border)] [transition:opacity_160ms_ease] [&:last-child]:[border-bottom:none] [&_.reminder-favicon]:[width:24px] [&_.reminder-favicon]:[height:24px] [&_.reminder-favicon]:[flex-basis:24px] [&_.reminder-favicon]:[font-size:10px] [&_.reminder-favicon_img]:[inset:4px] [&_.reminder-favicon_img]:[width:16px] [&_.reminder-favicon_img]:[height:16px] [&.done]:[opacity:0.32] [&.canceled]:[opacity:0.32] [&.done_strong]:[text-decoration:line-through] [&.done_strong]:[text-decoration-thickness:1px] [&.canceled_strong]:[text-decoration:line-through] [&.canceled_strong]:[text-decoration-thickness:1px] motion-reduce:transition-none"
                role="row"
              >
                <div
                  class="reminder-bookmark-cell min-w-0 flex items-center [gap:8px] [&>span:last-child]:min-w-0 [&_strong]:block [&_strong]:min-w-0 [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_small]:block [&_small]:min-w-0 [&_small]:overflow-hidden [&_small]:text-ellipsis [&_small]:whitespace-nowrap [&_strong]:[font-size:var(--modal-body-font-size)] [&_strong]:[font-weight:550] [&_small]:[margin-top:1px] [&_small]:[color:var(--muted-foreground)] [&_small]:[font-size:var(--secondary-text-font-size)]"
                  role="cell"
                >
                  <span
                    class="reminder-favicon relative grid place-items-center [width:28px] [height:28px] [flex:0_0_28px] overflow-hidden [font-family:var(--font-sans)] [font-size:var(--modal-body-font-size)] [&_img]:absolute [&_img]:[inset:5px] [&_img]:[width:18px] [&_img]:[height:18px] [&_img]:object-contain"
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
                  class="reminder-table-cell min-w-0 overflow-hidden text-ellipsis whitespace-nowrap [color:var(--muted-foreground)] [font-size:var(--secondary-text-font-size)] [&.reminder-status]:[margin-left:0] [&.reminder-status]:[color:var(--foreground)]"
                  role="cell"
                  title={formatReminder(bookmark.reminderAt!)}
                  >{formatReminder(bookmark.reminderAt!)}</span
                >
                <span
                  class="reminder-table-cell min-w-0 overflow-hidden text-ellipsis whitespace-nowrap [color:var(--muted-foreground)] [font-size:var(--secondary-text-font-size)] [&.reminder-status]:[margin-left:0] [&.reminder-status]:[color:var(--foreground)]"
                  role="cell"
                >
                  {bookmark.reminderEmail ? 'email' : 'browser + sound'}
                </span>
                <span
                  class="reminder-table-cell reminder-status [margin-left:3px] lowercase min-w-0 overflow-hidden text-ellipsis whitespace-nowrap [color:var(--muted-foreground)] [font-size:var(--secondary-text-font-size)] [&.reminder-status]:[margin-left:0] [&.reminder-status]:[color:var(--foreground)]"
                  role="cell">{status}</span
                >
                <span
                  class="reminder-table-action [min-width:24px] grid place-items-center"
                  role="cell"
                >
                  {#if status === 'active'}<button
                      class="icon-button small inline-grid place-items-center [width:30px] [height:30px] p-0 border-0 bg-none [color:var(--muted-foreground)] [border-radius:5px] [&:hover]:[background:var(--secondary)] [&:hover]:[color:var(--foreground)] [&.small]:[width:24px] [&.small]:[height:24px] motion-safe:[transition:background-color_140ms_ease]"
                      aria-label={`cancel reminder for ${bookmark.title}`}
                      title="cancel reminder"
                      onclick={() => cancelReminder(bookmark)}
                      ><BellOff size={14} /></button
                    >{/if}
                </span>
              </div>{/each}
          </div>
        </div>
      {:else}<div
          class="notification-empty [min-height:170px] grid place-items-center [align-content:center] [gap:8px] [color:var(--muted-foreground)] text-center [&_strong]:[color:var(--foreground)] [&_strong]:[font-size:var(--modal-body-font-size)] [&_strong]:font-medium [&_p]:m-0 [&_p]:[font-size:var(--secondary-text-font-size)]"
        >
          <ActionBell />
          <strong>no reminders yet.</strong>
          <p>use the bell on a bookmark to bring it back later.</p>
        </div>{/if}
    </div>{/if}

  {#if selectedCollections.length}<div
      class="selection-toolbar fixed [z-index:30] [left:50%] [bottom:30px] [transform:translateX(-50%)] [border:1px_solid_var(--border)] [border-radius:12px] [padding:8px_12px] flex items-center [gap:5px] [background:var(--card)] [box-shadow:var(--shadow)] whitespace-nowrap [&>span]:flex [&>span]:[gap:var(--icon-text-gap)] [&>span]:items-center [&>span]:[font-size:var(--body-font-size)] [&>span]:[padding:0_14px_0_4px] [&>span]:[color:var(--accent-text)] [&>span]:[border-right:1px_solid_var(--border)] [&>span]:[margin-right:5px] [&_button]:inline-flex [&_button]:items-center [&_button]:[gap:var(--icon-text-gap)] [&_button]:bg-none [&_button]:border-0 [&_button]:[padding:8px] [&_button]:[border-radius:5px] [&_button]:[font-size:var(--body-font-size)] [&_button:hover]:[background:var(--secondary)] [&.bookmark-selection-toolbar]:[gap:2px] [&.bookmark-selection-toolbar]:[padding:5px] [&.bookmark-selection-toolbar]:[border-radius:999px] [&.bookmark-selection-toolbar>span]:m-0 [&.bookmark-selection-toolbar>span]:[padding:0_8px] [&.bookmark-selection-toolbar>span]:border-0 [&.bookmark-selection-toolbar>span]:[color:var(--foreground)] [&.bookmark-selection-toolbar>span]:[font-weight:600] [&.bookmark-selection-toolbar_button]:grid [&.bookmark-selection-toolbar_button]:place-items-center [&.bookmark-selection-toolbar_button]:[width:30px] [&.bookmark-selection-toolbar_button]:[height:30px] [&.bookmark-selection-toolbar_button]:p-0 [&.bookmark-selection-toolbar_button]:rounded-full [&.bookmark-selection-toolbar_button_svg]:[width:16px] [&.bookmark-selection-toolbar_button_svg]:[height:16px] max-[520px]:[bottom:16px] max-[520px]:[padding:6px] max-[520px]:[gap:0] max-[520px]:[max-width:calc(100vw_-_18px)] max-[520px]:[&>span]:[font-size:var(--body-font-size)] max-[520px]:[&>span]:[padding-right:7px] max-[520px]:[&_button]:[font-size:var(--body-font-size)] max-[520px]:[&_button]:[padding:7px] motion-safe:[transform-origin:center_bottom] motion-safe:[animation:selection-dock-in_360ms_cubic-bezier(0.22,_1,_0.36,_1)_both] motion-safe:[will-change:transform,_opacity] motion-reduce:[animation:none]"
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
      class="selection-toolbar bookmark-selection-toolbar fixed [z-index:30] [left:50%] [bottom:30px] [transform:translateX(-50%)] [border:1px_solid_var(--border)] [border-radius:12px] [padding:8px_12px] flex items-center [gap:5px] [background:var(--card)] [box-shadow:var(--shadow)] whitespace-nowrap [&>span]:flex [&>span]:[gap:var(--icon-text-gap)] [&>span]:items-center [&>span]:[font-size:var(--body-font-size)] [&>span]:[padding:0_14px_0_4px] [&>span]:[color:var(--accent-text)] [&>span]:[border-right:1px_solid_var(--border)] [&>span]:[margin-right:5px] [&_button]:inline-flex [&_button]:items-center [&_button]:[gap:var(--icon-text-gap)] [&_button]:bg-none [&_button]:border-0 [&_button]:[padding:8px] [&_button]:[border-radius:5px] [&_button]:[font-size:var(--body-font-size)] [&_button:hover]:[background:var(--secondary)] [&.bookmark-selection-toolbar]:[gap:2px] [&.bookmark-selection-toolbar]:[padding:5px] [&.bookmark-selection-toolbar]:[border-radius:999px] [&.bookmark-selection-toolbar>span]:m-0 [&.bookmark-selection-toolbar>span]:[padding:0_8px] [&.bookmark-selection-toolbar>span]:border-0 [&.bookmark-selection-toolbar>span]:[color:var(--foreground)] [&.bookmark-selection-toolbar>span]:[font-weight:600] [&.bookmark-selection-toolbar_button]:grid [&.bookmark-selection-toolbar_button]:place-items-center [&.bookmark-selection-toolbar_button]:[width:30px] [&.bookmark-selection-toolbar_button]:[height:30px] [&.bookmark-selection-toolbar_button]:p-0 [&.bookmark-selection-toolbar_button]:rounded-full [&.bookmark-selection-toolbar_button_svg]:[width:16px] [&.bookmark-selection-toolbar_button_svg]:[height:16px] max-[520px]:[bottom:16px] max-[520px]:[padding:6px] max-[520px]:[gap:0] max-[520px]:[max-width:calc(100vw_-_18px)] max-[520px]:[&>span]:[font-size:var(--body-font-size)] max-[520px]:[&>span]:[padding-right:7px] max-[520px]:[&_button]:[font-size:var(--body-font-size)] max-[520px]:[&_button]:[padding:7px] motion-safe:[transform-origin:center_bottom] motion-safe:[animation:selection-dock-in_360ms_cubic-bezier(0.22,_1,_0.36,_1)_both] motion-safe:[will-change:transform,_opacity] motion-reduce:[animation:none]"
      role="region"
      aria-label="selection actions"
      onmouseleave={() => hideSelectionTooltip()}
      onfocusout={hideSelectionTooltip}
    >
      <div
        class="pointer-events-none absolute bottom-full left-0 [z-index:1] [&.warm]:[will-change:transform] motion-safe:[&.warm]:[transition:transform_180ms_cubic-bezier(0.645,_0.045,_0.355,_1)] motion-reduce:transition-none"
        class:warm={selectionTooltipWarm}
        style:transform={`translateX(${selectionTooltip.x}px)`}
      >
        <div
          id="selection-dock-tooltip"
          role="tooltip"
          aria-hidden={!selectionTooltip.visible}
          class="selection-dock-tooltip flex flex-col items-center origin-bottom opacity-0 [transform:translate(-50%,_8px)_scale(0.88)] motion-safe:[transition:transform_180ms_cubic-bezier(0.16,_1,_0.3,_1),_opacity_110ms_ease-out] motion-reduce:transition-none [&.visible]:[transform:translate(-50%,_0)_scale(1)] [&.visible]:opacity-100"
          class:visible={selectionTooltip.visible}
        >
          <span class="selection-dock-tooltip-bubble"
            >{selectionTooltip.label}</span
          >
          <svg
            class="selection-dock-tooltip-tail"
            viewBox="0 0 44 14"
            aria-hidden="true"
          >
            <path
              d="M0 0C8 0 11 1.5 16 8C18.5 11.3 19.3 14 22 14C24.7 14 25.5 11.3 28 8C33 1.5 36 0 44 0Z"
            ></path>
          </svg>
        </div>
      </div>
      <button
        aria-label="clear selection"
        onmouseenter={(event) => showSelectionTooltip(event, 'clear selection')}
        onfocus={(event) => showSelectionTooltip(event, 'clear selection')}
        onclick={() => {
          selected = [];
          selectMode = false;
          bookmarkSelectionAnchor = null;
        }}><Cross2 /></button
      ><span>{selected.length} selected</span><button
        aria-label="select all bookmarks"
        onmouseenter={(event) => showSelectionTooltip(event, 'select all')}
        onfocus={(event) => showSelectionTooltip(event, 'select all')}
        onclick={() => (selected = visible.map((b) => b.id))}
        ><SelectAll /></button
      ><button
        aria-label={selectionPinned
          ? 'unpin selected bookmarks'
          : 'pin selected bookmarks'}
        onmouseenter={(event) =>
          showSelectionTooltip(event, selectionPinned ? 'unpin' : 'pin')}
        onfocus={(event) =>
          showSelectionTooltip(event, selectionPinned ? 'unpin' : 'pin')}
        onclick={() => {
          setFlags(selected, 'pinned', !selectionPinned);
          selected = [];
          selectMode = false;
          bookmarkSelectionAnchor = null;
        }}><Pin /></button
      ><button
        aria-label="mark selected bookmarks as read"
        onmouseenter={(event) => showSelectionTooltip(event, 'mark as read')}
        onfocus={(event) => showSelectionTooltip(event, 'mark as read')}
        onclick={() => {
          setFlags(selected, 'read', true);
          selected = [];
          selectMode = false;
          bookmarkSelectionAnchor = null;
        }}><ActionRead /></button
      ><button
        aria-label="delete selected bookmarks"
        onmouseenter={(event) => showSelectionTooltip(event, 'delete')}
        onfocus={(event) => showSelectionTooltip(event, 'delete')}
        onclick={() => openModal('delete')}><DeleteTrash /></button
      >
    </div>{/if}
  {#if drag && dragging}<div
      class="selection-marquee fixed [border:1px_solid_var(--accent-text)] [background:color-mix(in_srgb,_var(--accent-text)_12%,_transparent)] pointer-events-none [z-index:20]"
      style:left={`${Math.min(drag.x, drag.endX)}px`}
      style:top={`${Math.min(drag.y, drag.endY)}px`}
      style:width={`${Math.abs(drag.x - drag.endX)}px`}
      style:height={`${Math.abs(drag.y - drag.endY)}px`}
    ></div>{/if}
  {#if reminderPopover && reminderTarget}
    <button
      class="context-backdrop fixed [inset:0] bg-transparent border-0 [z-index:50] [cursor:default]"
      aria-label="close reminder"
      onclick={closeReminderPopover}
      tabindex="-1"
    ></button>
    <div
      bind:this={reminderPopoverPanel}
      class="reminder-popover fixed [z-index:51] [width:320px] [max-width:calc(100vw_-_20px)] [padding:12px] [border:1px_solid_var(--border)] [border-radius:10px] [background:var(--card)] [color:var(--foreground)] [box-shadow:var(--shadow)] [animation:appear_160ms_cubic-bezier(0.22,_1,_0.36,_1)] [&>p]:[margin:6px_0_14px] [&>p]:overflow-hidden [&>p]:[color:var(--muted-foreground)] [&>p]:[font-size:var(--body-font-size)] [&>p]:text-ellipsis [&>p]:whitespace-nowrap motion-reduce:[animation:none]"
      role="dialog"
      tabindex="-1"
      aria-label={`set reminder for ${reminderTarget.title}`}
      style:left={`${reminderPopover.x}px`}
      style:top={`${reminderPopover.y}px`}
      onkeydown={(event) => {
        if (event.key === 'Escape') closeReminderPopover();
      }}
    >
      <div
        class="reminder-popover-title flex items-center [gap:var(--icon-text-gap)] [&_strong]:[font-size:var(--body-font-size)] [&_strong]:font-medium [&_button]:[margin-left:auto]"
      >
        <ActionBell size={16} /><strong>set reminder</strong><button
          type="button"
          class="icon-button small inline-grid place-items-center [width:30px] [height:30px] p-0 border-0 bg-none [color:var(--muted-foreground)] [border-radius:5px] [&:hover]:[background:var(--secondary)] [&:hover]:[color:var(--foreground)] [&.small]:[width:24px] [&.small]:[height:24px] motion-safe:[transition:background-color_140ms_ease]"
          aria-label="close reminder"
          onclick={closeReminderPopover}><Cross2 size={14} /></button
        >
      </div>
      <p>{reminderTarget.title}</p>
      <form
        class="reminder-popover-form [&_label]:[gap:5px] [&_label]:[margin-bottom:11px] [&_label]:[font-size:var(--body-font-size)] [&_input]:[padding:8px_9px] [&_input]:[border-radius:6px] [&_input]:[font-size:var(--body-font-size)] [&_input:focus]:outline-0 [&_input:focus]:[box-shadow:none] [&_input:focus-visible]:outline-0 [&_input:focus-visible]:[box-shadow:none]"
        onsubmit={saveReminder}
      >
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
        <p
          class="form-error [color:#cf6356] [font-size:var(--modal-body-font-size)] [line-height:1.6] [&:empty]:hidden"
          role="alert"
        >
          {formError}
        </p>
        <div
          class="reminder-popover-actions flex items-center justify-end [gap:7px] [margin-top:12px] [padding-top:10px] [border-top:1px_solid_var(--border)] [&_.plain-button]:[margin-right:auto] [&_.plain-button]:[font-size:var(--body-font-size)] [&_.primary-button]:[min-height:30px] [&_.primary-button]:[padding:7px_9px] [&_.primary-button]:[font-size:var(--body-font-size)]"
        >
          {#if reminderTarget.reminderAt && reminderStatus(reminderTarget) === 'active'}<button
              type="button"
              class="plain-button danger-text [&_svg]:block inline-flex items-center [gap:var(--icon-text-gap)] [padding:5px_6px] border-0 [border-radius:5px] bg-transparent [color:var(--foreground)] [font-size:var(--body-font-size)] whitespace-nowrap [&:hover]:[background:var(--secondary)] [&.control-active]:[background:var(--secondary)] [&.control-active]:[color:var(--foreground)] [color:#d15f54] max-[520px]:[padding:6px_4px] max-[520px]:[font-size:var(--body-font-size)]"
              onclick={() => {
                void cancelReminder(reminderTarget!);
                closeReminderPopover();
              }}>cancel reminder</button
            >{/if}<button
            class="primary-button inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_transparent] [border-radius:6px] [padding:7px_10px] [font-size:var(--body-font-size)] font-medium [min-height:30px] whitespace-nowrap [background:var(--primary)] [color:var(--primary-foreground)] [&:hover]:[filter:brightness(1.12)] motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)]"
            disabled={saving}
            >{saving ? 'saving…' : 'set reminder'}<Check size={14} /></button
          >
        </div>
      </form>
    </div>
  {/if}
  {#if context}
    <button
      class="bookmark-context-backdrop fixed [inset:0] bg-transparent border-0 [z-index:50] [cursor:default]"
      aria-label="close context menu"
      onclick={closeContext}
      tabindex="-1"
    ></button>
    <div
      bind:this={contextPanel}
      class="context-menu fixed [z-index:51] [width:200px] [padding:4px] [border-radius:10px] [background:var(--card)] [box-shadow:var(--shadow)] [border:1px_solid_var(--border)] [animation:appear_160ms_cubic-bezier(0.22,_1,_0.36,_1)] [&_button]:flex [&_button]:items-center [&_button]:[gap:var(--icon-text-gap)] [&_button]:border-0 [&_button]:[border-radius:5px] [&_button]:bg-none [&_button]:w-full [&_button]:[min-height:32px] [&_button]:[padding:5px_7px] [&_button]:text-left [&_button]:[font-size:var(--body-font-size)] [&_button]:[line-height:1.25] [&_button>svg]:block [&_button>svg]:[width:17px] [&_button>svg]:[height:17px] [&_button>span]:min-w-0 [&_kbd]:inline-flex [&_kbd]:items-center [&_kbd]:[gap:3px] [&_kbd]:[margin-left:auto] [&_kbd]:[color:var(--muted-foreground)] [&_kbd]:[font-family:inherit] [&_kbd]:[font-size:10px] [&_kbd]:[line-height:1] [&_kbd_svg]:block [&_button:hover]:[background:var(--secondary)] [&_button:hover]:outline-none [&_button:focus-visible]:[background:var(--secondary)] [&_button:focus-visible]:outline-none [&_hr]:border-0 [&_hr]:[border-top:1px_solid_var(--border)] [&_hr]:[margin:5px_3px] motion-reduce:[animation:none]"
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
          ><ArrowUpRight /><span>open bookmark</span><kbd aria-label="cmd+o"
            ><CommandKey size={10} />O</kbd
          ></button
        ><button
          role="menuitem"
          data-shortcut="e"
          onclick={() => openModal('bookmark', b)}
          ><ActionEdit /><span>edit bookmark</span><kbd aria-label="cmd+e"
            ><CommandKey size={10} />E</kbd
          ></button
        ><button
          role="menuitem"
          data-shortcut="r"
          onclick={() => openModal('reminder', b)}
          ><ActionBell /><span
            >{b.reminderAt ? 'edit reminder' : 'set reminder'}</span
          ><kbd aria-label="cmd+r"><CommandKey size={10} />R</kbd></button
        ><button
          role="menuitem"
          data-shortcut="p"
          onclick={() => toggleFlag(b.id, 'pinned')}
          ><Pin /><span
            >{flags[b.id]?.pinned ? 'unpin bookmark' : 'pin bookmark'}</span
          ><kbd aria-label="cmd+p"><CommandKey size={10} />P</kbd></button
        ><button
          role="menuitem"
          data-shortcut="m"
          onclick={() => toggleFlag(b.id, 'read')}
          ><ActionRead /><span
            >{flags[b.id]?.read ? 'mark as unread' : 'mark as read'}</span
          ><kbd aria-label="cmd+m"><CommandKey size={10} />M</kbd></button
        >{#if data.session}<button
            role="menuitem"
            data-shortcut="w"
            onclick={() => void toggleWidgetBookmark(b)}
            ><MacWidgetLauncher /><span
              >{b.widgetEnabled
                ? 'remove from mac widget'
                : 'add to mac widget'}</span
            ><kbd aria-label="cmd+w"><CommandKey size={10} />W</kbd></button
          >{/if}
        <hr />
        <button
          role="menuitem"
          class="danger-text [color:#d15f54]"
          data-shortcut="d"
          onclick={() => {
            selected = [b.id];
            void openModal('delete');
          }}
          ><DeleteTrash /><span>delete bookmark</span><kbd aria-label="cmd+d"
            ><CommandKey size={10} />D</kbd
          ></button
        >{/if}
    </div>
  {/if}

  <dialog
    bind:this={dialog}
    class="app-dialog [border:1px_solid_var(--border)] p-0 [width:480px] [max-width:calc(100vw_-_32px)] [max-height:90dvh] [border-radius:8px] [background:var(--card)] [color:var(--foreground)] [box-shadow:var(--shadow)] [margin:auto] overflow-y-auto [font-family:var(--font-sans)] [font-size:var(--modal-body-font-size)] [&[open]]:[animation:appear_200ms_cubic-bezier(0.22,_1,_0.36,_1)] [&::backdrop]:[background:#00000065] [&::backdrop]:[backdrop-filter:blur(4px)] [&_input:focus]:outline-0 [&_input:focus]:[border-color:var(--border)] [&_input:focus]:[box-shadow:none] [&_input:focus-visible]:outline-0 [&_input:focus-visible]:[border-color:var(--border)] [&_input:focus-visible]:[box-shadow:none] [&_textarea:focus]:outline-0 [&_textarea:focus]:[border-color:var(--border)] [&_textarea:focus]:[box-shadow:none] [&_textarea:focus-visible]:outline-0 [&_textarea:focus-visible]:[border-color:var(--border)] [&_textarea:focus-visible]:[box-shadow:none] [&_select:focus]:outline-0 [&_select:focus]:[border-color:var(--border)] [&_select:focus]:[box-shadow:none] [&_select:focus-visible]:outline-0 [&_select:focus-visible]:[border-color:var(--border)] [&_select:focus-visible]:[box-shadow:none] [&.settings-dialog]:[width:680px] [&.command-positioned]:fixed [&.command-positioned]:m-0 [&.command-positioned]:[max-width:calc(100vw_-_20px)] [&.command-positioned]:[max-height:min(520px,_calc(100dvh_-_20px))] [&.command-positioned]:[border-radius:8px] [&.command-positioned]:overflow-hidden motion-reduce:[&[open]]:[animation:none]"
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
    {#if modal}<div
        class="dialog-inner [padding:28px] relative [&_h2]:m-0 [&_h2]:[font-size:34px] [&_h2]:[line-height:1.2] [&_h2]:[letter-spacing:normal] [&_h2]:font-normal [.settings-dialog_&]:p-0 [.command-positioned_&]:p-0 max-[520px]:[padding:27px_22px]"
      >
        {#if modal !== 'command'}<button
            class="dialog-close icon-button inline-grid place-items-center [width:30px] [height:30px] p-0 border-0 bg-none [color:var(--muted-foreground)] [border-radius:5px] [&:hover]:[background:var(--secondary)] [&:hover]:[color:var(--foreground)] [&.small]:[width:24px] [&.small]:[height:24px] absolute [top:16px] [right:16px] [width:32px] [height:32px] [.settings-dialog_&]:[z-index:2] motion-safe:[transition:background-color_140ms_ease]"
            aria-label="close dialog"
            disabled={saving}
            onclick={closeModal}><Cross2 /></button
          >{/if}
        {#if modal === 'command'}<div
            class="command-dialog [margin:-28px] [.command-positioned_&]:m-0"
          >
            <h2
              id="dialog-title"
              class="sr-only absolute [width:1px] [height:1px] p-0 [margin:-1px] overflow-hidden [clip:rect(0,_0,_0,_0)] whitespace-nowrap border-0"
            >
              command menu
            </h2>
            <div
              class="command-input flex items-center [gap:var(--icon-text-gap)] [height:46px] [padding:0_14px] [border-bottom:1px_solid_var(--border)] [color:var(--muted-foreground)] [&_input]:min-w-0 [&_input]:flex-1 [&_input]:h-full [&_input]:border-0 [&_input]:outline-0 [&_input]:bg-transparent [&_input]:[color:var(--foreground)] [&_input]:[font-size:var(--modal-body-font-size)] [&_input:focus-visible]:outline-0 [&_kbd]:[padding:3px_6px] [&_kbd]:[border:1px_solid_var(--border)] [&_kbd]:[border-radius:4px] [&_kbd]:[font-size:9px]"
            >
              <SearchGrid size={17} /><input
                bind:this={searchInput}
                bind:value={commandQuery}
                aria-label="command menu"
                placeholder="search bookmarks or run a command…"
              /><kbd>esc</kbd>
            </div>
            <div
              class="command-results [max-height:min(430px,_65dvh)] overflow-y-auto [padding:7px] [&>p]:[margin:8px_9px_4px] [&>p]:[color:var(--muted-foreground)] [&>p]:[font-size:9px] [&>p]:[font-weight:550] [&>p]:[letter-spacing:0.08em] [&>p]:lowercase [&>button]:flex [&>button]:items-center [&>button]:[gap:var(--icon-text-gap)] [&>button]:w-full [&>button]:[min-height:38px] [&>button]:[padding:7px_9px] [&>button]:border-0 [&>button]:[border-radius:5px] [&>button]:bg-none [&>button]:[color:var(--foreground)] [&>button]:text-left [&>button]:[font-size:var(--modal-body-font-size)] [&>button]:leading-none [&>button>svg]:block [&>button>svg]:shrink-0 [&>a]:flex [&>a]:items-center [&>a]:[gap:var(--icon-text-gap)] [&>a]:w-full [&>a]:[min-height:38px] [&>a]:[padding:7px_9px] [&>a]:border-0 [&>a]:[border-radius:5px] [&>a]:bg-none [&>a]:[color:var(--foreground)] [&>a]:text-left [&>a]:[font-size:var(--modal-body-font-size)] [&>button:hover]:outline-0 [&>button:hover]:[background:var(--secondary)] [&>button:focus-visible]:outline-0 [&>button:focus-visible]:[background:var(--secondary)] [&>a:hover]:outline-0 [&>a:hover]:[background:var(--secondary)] [&>a:focus-visible]:outline-0 [&>a:focus-visible]:[background:var(--secondary)] [&>button>.single-shortcut]:ml-auto [&>button>.single-shortcut]:[color:var(--muted-foreground)] [&>a>svg]:[margin-left:auto] [&>a>svg]:[color:var(--muted-foreground)] [&_.single-shortcut]:inline-flex [&_.single-shortcut]:items-center [&_.single-shortcut]:[gap:var(--icon-text-gap)] [&_strong]:block [&_strong]:overflow-hidden [&_strong]:whitespace-nowrap [&_strong]:text-ellipsis [&_small]:block [&_small]:overflow-hidden [&_small]:whitespace-nowrap [&_small]:text-ellipsis [&_strong]:[font-size:var(--modal-body-font-size)] [&_strong]:font-medium [&_strong]:[line-height:1.4] [&_small]:[color:var(--muted-foreground)] [&_small]:[font-size:var(--secondary-text-font-size)] [&_small]:[line-height:1.4]"
            >
              <p>actions</p>
              <button onclick={() => openFromCommand('bookmark')}
                ><Plus /><span>save a link</span><span
                  class="single-shortcut"
                  aria-label="cmd+n"><CommandKey size={12} />N</span
                ></button
              ><button onclick={() => openFromCommand('collection')}
                ><FileTray /><span>new collection</span></button
              ><button onclick={() => openFromCommand('settings')}
                ><ActionSettings /><span>open settings</span></button
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
                    ><span
                      class="command-favicon relative grid place-items-center [width:28px] [height:28px] overflow-hidden border-0 [border-radius:7px] [background:var(--secondary)] [font-family:var(--font-sans)] [&_img]:absolute [&_img]:[inset:5px] [&_img]:[width:18px] [&_img]:[height:18px] [&_img]:object-contain [&:has(img)>svg]:[visibility:hidden]"
                      ><Globe size={16} /><img
                        src={`https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(bookmark.url)}&sz=32`}
                        alt=""
                        onerror={(event) => event.currentTarget.remove()}
                      /></span
                    ><strong
                      class="command-bookmark-title min-w-0 [flex:0_1_auto]"
                      >{bookmark.title}</strong
                    ><small
                      class="command-bookmark-url min-w-0 [flex:1_1_auto] [margin-left:var(--icon-text-gap)]"
                      >{bookmark.url}</small
                    ><ExternalLink
                      class="command-external-link [flex:0_0_16px] [color:var(--muted-foreground)]"
                      size={16}
                    /></a
                  >{/each}
              {/if}
            </div>
          </div>
        {:else if modal === 'bookmark'}<div
            class="dialog-symbol flex [width:fit-content] p-0 [color:var(--accent-text)] [margin-bottom:13px]"
          >
            <BookmarkIcon size={22} />
          </div>
          <h2 id="dialog-title">
            {editing ? 'a little fine-tuning.' : 'a good find, kept.'}
          </h2>
          <p
            class="dialog-description [margin:5px_0_18px] [font-size:var(--modal-body-font-size)] [line-height:1.7] [color:var(--muted-foreground)]"
          >
            {editing
              ? 'update the details that help you find it again.'
              : 'save a link now. come back when you have a moment.'}
          </p>
          <form
            class="bookmark-form [&_.dialog-actions]:[padding-top:0] [&_.dialog-actions]:[border-top:0]"
            onsubmit={saveBookmark}
          >
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
            <p
              class="form-error [color:#cf6356] [font-size:var(--modal-body-font-size)] [line-height:1.6] [&:empty]:hidden"
              id="form-error"
              role="alert"
            >
              {formError}
            </p>
            <div
              class="dialog-actions flex justify-end [gap:9px] [margin-top:23px] [&>button]:[height:32px] [&>button]:[min-height:32px] [&>button]:[line-height:1]"
            >
              <button
                type="button"
                class="secondary-button inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_transparent] [border-radius:6px] [padding:7px_10px] [font-size:var(--body-font-size)] font-medium [min-height:30px] whitespace-nowrap [background:var(--card)] [border-color:var(--border)] [&:hover]:[background:var(--secondary)] motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)]"
                disabled={saving}
                onclick={closeModal}>cancel</button
              ><button
                class="primary-button inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_transparent] [border-radius:6px] [padding:7px_10px] [font-size:var(--body-font-size)] font-medium [min-height:30px] whitespace-nowrap [background:var(--primary)] [color:var(--primary-foreground)] [&:hover]:[filter:brightness(1.12)] motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)]"
                disabled={saving}
                >{saving
                  ? 'saving…'
                  : editing
                    ? 'save changes'
                    : 'save bookmark'}<Check /></button
              >
            </div>
          </form>
        {:else if modal === 'collection' || modal === 'collection-edit'}<div
            class="dialog-symbol flex [width:fit-content] p-0 [color:var(--accent-text)] [margin-bottom:13px]"
          >
            <FileTray size={22} />
          </div>
          <h2 id="dialog-title">
            {editingCollectionId
              ? 'rename collection.'
              : 'a place for an interest.'}
          </h2>
          <p
            class="dialog-description [margin:5px_0_18px] [font-size:var(--modal-body-font-size)] [line-height:1.7] [color:var(--muted-foreground)]"
          >
            {editingCollectionId
              ? 'change its name or remove it from chikota.'
              : 'keep related links together in a collection.'}
          </p>
          <form
            class="collection-form [&_.dialog-actions]:[padding-top:0] [&_.dialog-actions]:[border-top:0]"
            onsubmit={saveCollection}
          >
            <label
              ><input
                bind:value={collectionName}
                placeholder="collection name"
                required
                maxlength="60"
              /></label
            >
            <p
              class="form-error [color:#cf6356] [font-size:var(--modal-body-font-size)] [line-height:1.6] [&:empty]:hidden"
              role="alert"
            >
              {formError}
            </p>
            <div
              class="dialog-actions flex justify-end [gap:9px] [margin-top:23px] [&>button]:[height:32px] [&>button]:[min-height:32px] [&>button]:[line-height:1]"
            >
              {#if editingCollectionId}<button
                  type="button"
                  class="secondary-button delete-collection inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_transparent] [border-radius:6px] [padding:7px_10px] [font-size:var(--body-font-size)] font-medium [min-height:30px] whitespace-nowrap [background:var(--card)] [border-color:var(--border)] [&:hover]:[background:var(--secondary)] [margin-right:auto] motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)]"
                  class:danger-text={collectionDeleteConfirm}
                  onclick={removeCollection}
                  >{collectionDeleteConfirm
                    ? 'confirm delete'
                    : 'delete'}</button
                >{/if}
              <button
                type="button"
                class="secondary-button inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_transparent] [border-radius:6px] [padding:7px_10px] [font-size:var(--body-font-size)] font-medium [min-height:30px] whitespace-nowrap [background:var(--card)] [border-color:var(--border)] [&:hover]:[background:var(--secondary)] motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)]"
                onclick={closeModal}>cancel</button
              ><button
                class="primary-button inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_transparent] [border-radius:6px] [padding:7px_10px] [font-size:var(--body-font-size)] font-medium [min-height:30px] whitespace-nowrap [background:var(--primary)] [color:var(--primary-foreground)] [&:hover]:[filter:brightness(1.12)] motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)]"
                >{editingCollectionId ? 'save name' : 'create collection'}<Check
                /></button
              >
            </div>
          </form>
        {:else if modal === 'reminder' && reminderTarget}<div
            class="dialog-symbol flex [width:fit-content] p-0 [color:var(--accent-text)] [margin-bottom:13px]"
          >
            <ActionBell size={22} />
          </div>
          <h2 id="dialog-title">bring it back at the right time.</h2>
          <p
            class="dialog-description reminder-description [margin:5px_0_18px] [font-size:var(--modal-body-font-size)] [line-height:1.7] [color:var(--muted-foreground)] [&_strong]:[color:var(--foreground)] [&_strong]:font-medium"
          >
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
            <div
              class="delivery-note flex items-center [gap:var(--icon-text-gap)] [margin-top:-3px] [color:var(--muted-foreground)] [font-size:var(--secondary-text-font-size)] [&_svg]:[width:13px] [&_svg]:[height:13px]"
            >
              {#if reminderEmail.trim()}<Mail />scheduled email only{:else}<ActionBell
                />browser notification with a soft sound{/if}
            </div>
            <p
              class="form-error [color:#cf6356] [font-size:var(--modal-body-font-size)] [line-height:1.6] [&:empty]:hidden"
              role="alert"
            >
              {formError}
            </p>
            <div
              class="dialog-actions flex justify-end [gap:9px] [margin-top:23px] [&>button]:[height:32px] [&>button]:[min-height:32px] [&>button]:[line-height:1]"
            >
              {#if reminderTarget.reminderAt && reminderStatus(reminderTarget) === 'active'}<button
                  type="button"
                  class="secondary-button delete-collection inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_transparent] [border-radius:6px] [padding:7px_10px] [font-size:var(--body-font-size)] font-medium [min-height:30px] whitespace-nowrap [background:var(--card)] [border-color:var(--border)] [&:hover]:[background:var(--secondary)] [margin-right:auto] motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)]"
                  onclick={() => {
                    void cancelReminder(reminderTarget!);
                    closeModal();
                  }}>cancel reminder</button
                >{/if}
              <button
                type="button"
                class="secondary-button inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_transparent] [border-radius:6px] [padding:7px_10px] [font-size:var(--body-font-size)] font-medium [min-height:30px] whitespace-nowrap [background:var(--card)] [border-color:var(--border)] [&:hover]:[background:var(--secondary)] motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)]"
                disabled={saving}
                onclick={closeModal}>close</button
              ><button
                class="primary-button inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_transparent] [border-radius:6px] [padding:7px_10px] [font-size:var(--body-font-size)] font-medium [min-height:30px] whitespace-nowrap [background:var(--primary)] [color:var(--primary-foreground)] [&:hover]:[filter:brightness(1.12)] motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)]"
                disabled={saving}
                >{saving ? 'saving…' : 'set reminder'}<Check /></button
              >
            </div>
          </form>
        {:else if modal === 'settings'}<div
            class="settings-shell grid [grid-template-columns:150px_minmax(0,_1fr)] [min-height:410px]"
          >
            <nav
              class="settings-tabs flex flex-col [gap:3px] [padding:54px_12px_20px] [border-right:1px_solid_var(--border)] [background:var(--sidebar)] [&_button]:flex [&_button]:items-center [&_button]:[gap:var(--icon-text-gap)] [&_button]:w-full [&_button]:[padding:8px_9px] [&_button]:border-0 [&_button]:[border-radius:5px] [&_button]:bg-transparent [&_button]:[color:var(--muted-foreground)] [&_button]:text-left [&_button]:[font-size:var(--modal-body-font-size)] [&_button:hover]:[background:var(--secondary)] [&_button:hover]:[color:var(--foreground)] [&_button.active]:[background:var(--secondary)] [&_button.active]:[color:var(--foreground)] [&_svg]:[width:13px] [&_svg]:[height:13px]"
              aria-label="settings sections"
            >
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
                class:active={settingsTab === 'shortcuts'}
                aria-pressed={settingsTab === 'shortcuts'}
                onclick={() => (settingsTab = 'shortcuts')}
                ><CommandKey />shortcuts</button
              ><button
                class:active={settingsTab === 'about'}
                aria-pressed={settingsTab === 'about'}
                onclick={() => (settingsTab = 'about')}><Info />about</button
              >
            </nav>
            <section
              class="settings-panel min-w-0 [padding:42px_32px_30px] [&_h2_span]:[color:var(--muted-foreground)] [&_h2_span]:[font-family:var(--font-sans)] [&_h2_span]:[font-size:var(--secondary-text-font-size)] [&_h2_span]:[letter-spacing:0]"
            >
              {#if settingsTab === 'appearance'}<h2 id="dialog-title">
                  make it feel like you.
                </h2>
                <p
                  class="dialog-description [margin:5px_0_18px] [font-size:var(--modal-body-font-size)] [line-height:1.7] [color:var(--muted-foreground)]"
                >
                  a different atmosphere. the same quiet space.
                </p>
                <div
                  class="theme-options grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] [gap:12px] [&>button]:bg-none [&>button]:border-0 [&>button]:p-0 [&>button]:[font-size:var(--modal-body-font-size)] [&>button]:text-left [&_strong]:block [&_strong]:[font-size:inherit] [&_strong]:font-medium [&_strong]:[line-height:1.4] [&_strong]:[margin-top:9px] [&_small]:block [&_small]:[font-size:var(--secondary-text-font-size)] [&_small]:[line-height:1.4] [&_small]:[color:var(--muted-foreground)] [&_small]:[margin-top:4px] max-[520px]:[gap:9px] max-[520px]:[&_small]:[font-size:var(--secondary-text-font-size)]"
                >
                  {#each themes as theme}<button
                      class:theme-selected={themeStore.current === theme.id}
                      aria-pressed={themeStore.current === theme.id}
                      onclick={() => themeStore.set(theme.id)}
                      ><span
                        class="theme-preview flex [gap:8px] [height:80px] [border:1px_solid_#e2e2e2] [border-radius:7px] [background:#fff] relative overflow-hidden [.theme-selected_&]:[outline:2px_solid_var(--accent-text)] [.theme-selected_&]:[outline-offset:3px]"
                        data-preview={theme.id}
                        ><span
                          class="preview-sidebar [width:26%] [background:#f2f2f2] [border-right:1px_solid_#e2e2e2] [[data-preview=forest]_&]:[background:#18271e] [[data-preview=forest]_&]:[border-color:#26352b] [[data-preview=ember]_&]:[background:#2a1c13] [[data-preview=ember]_&]:[border-color:#3b2d23]"
                        ></span><span
                          class="preview-content flex-1 [padding:19px_9px_0_0] [&_i]:block [&_i]:[height:4px] [&_i]:[border-radius:2px] [&_i]:[width:90%] [&_i]:[background:#e6e6e6] [&_i]:[margin-bottom:10px] [&_i:first-child]:[width:45%] [&_i:first-child]:[background:#777777] [[data-preview=forest]_&_i]:[background:#2e4034] [[data-preview=forest]_&_i:first-child]:[background:#b1cbb4] [[data-preview=ember]_&_i]:[background:#493429] [[data-preview=ember]_&_i:first-child]:[background:#ff8b42]"
                          ><i></i><i></i><i></i></span
                        >{#if themeStore.current === theme.id}<span
                            class="theme-check absolute [right:5px] [bottom:5px] [width:16px] [height:16px] rounded-full grid place-items-center [color:var(--primary-foreground)] [background:var(--primary)]"
                            ><Check size={12} /></span
                          >{/if}</span
                      ><strong>{theme.name}</strong><small
                        >{theme.description}</small
                      ></button
                    >{/each}
                </div>
                <p
                  class="settings-note [font-size:var(--modal-body-font-size)] [line-height:1.7] [color:var(--muted-foreground)] [margin:18px_0_12px]"
                >
                  {data.session
                    ? 'bookmarks sync to your account. collections, pins, and reading status are stored on this device.'
                    : 'your links are saved in this browser. export a copy to keep a backup.'}
                </p>
                <button
                  class="settings-row flex items-center [gap:var(--icon-text-gap)] border-0 [border-top:1px_solid_var(--border)] [padding:16px_0] w-full bg-none text-left [font-size:var(--modal-body-font-size)] [&>span]:[margin-left:auto] [&>span]:[font-size:var(--secondary-text-font-size)] [&>span]:[color:var(--muted-foreground)] [&>span]:flex [&>span]:items-center [&>span]:[gap:var(--icon-text-gap)]"
                  onclick={exportLibrary}
                  ><Download />export library<span
                    >json<ArrowUpRight size={13} /></span
                  ></button
                ><button
                  class="settings-row flex items-center [gap:var(--icon-text-gap)] border-0 [border-top:1px_solid_var(--border)] [padding:16px_0] w-full bg-none text-left [font-size:var(--modal-body-font-size)] [&>span]:[margin-left:auto] [&>span]:[font-size:var(--secondary-text-font-size)] [&>span]:[color:var(--muted-foreground)] [&>span]:flex [&>span]:items-center [&>span]:[gap:var(--icon-text-gap)]"
                  onclick={() => {
                    closeModal();
                    void openExtensionPanel();
                  }}
                  ><BrowserExtension />browser extension<span
                    >set up<ArrowUpRight size={13} /></span
                  ></button
                >{#if data.session}<button
                    class="settings-row flex items-center [gap:var(--icon-text-gap)] border-0 [border-top:1px_solid_var(--border)] [padding:16px_0] w-full bg-none text-left [font-size:var(--modal-body-font-size)] [&>span]:[margin-left:auto] [&>span]:[font-size:var(--secondary-text-font-size)] [&>span]:[color:var(--muted-foreground)] [&>span]:flex [&>span]:items-center [&>span]:[gap:var(--icon-text-gap)]"
                    onclick={async () => {
                      await authClient.signOut();
                      location.reload();
                    }}><LogOut />sign out</button
                  >{/if}
              {:else if settingsTab === 'shortcuts'}
                <h2 id="dialog-title">a few quick keys.</h2>
                <p class="dialog-description">
                  use cmd on mac, or ctrl on windows and linux.
                </p>
                <dl class="settings-shortcuts">
                  {#each [['cmd / ctrl + k', 'search bookmarks and commands'], ['cmd / ctrl + n', 'save a bookmark'], ['cmd / ctrl + a', 'select all visible bookmarks'], ['escape', 'close the active dialog, menu, or selection'], ['shift + click', 'select a range of bookmarks or collections'], ['tab / shift + tab', 'move between controls'], ['enter / space', 'activate the focused control'], ['↑ / ↓ / home / end', 'navigate an open bookmark menu'], ['cmd / ctrl + o', 'open the bookmark'], ['cmd / ctrl + e', 'edit the bookmark'], ['cmd / ctrl + r', 'set or edit its reminder'], ['cmd / ctrl + p', 'pin or unpin the bookmark'], ['cmd / ctrl + m', 'mark as read or unread'], ['cmd / ctrl + w', 'add to or remove from the mac widget'], ['cmd / ctrl + d', 'open bookmark deletion confirmation'], ['alt + t', 'focus notifications']] as [keys, action]}
                    <div>
                      <dt>{keys}</dt>
                      <dd>{action}</dd>
                    </div>
                  {/each}
                </dl>
                <p class="settings-note">
                  bookmark commands from o through d apply while its context
                  menu is open. widget commands require sign-in.
                </p>
              {:else if settingsTab === 'reminders'}<h2 id="dialog-title">
                  reminder delivery
                </h2>
                <p
                  class="dialog-description [margin:5px_0_18px] [font-size:var(--modal-body-font-size)] [line-height:1.7] [color:var(--muted-foreground)]"
                >
                  pause every reminder or clear the active queue.
                </p>
                <div
                  class="reminder-setting flex items-center justify-between [gap:18px] [padding:14px_0] [border-block:1px_solid_var(--border)] [&_strong]:block [&_small]:block [&_strong]:[font-size:var(--modal-body-font-size)] [&_strong]:font-medium [&_small]:[margin-top:4px] [&_small]:[color:var(--muted-foreground)] [&_small]:[font-size:var(--secondary-text-font-size)]"
                >
                  <div>
                    <strong>all reminders</strong><small
                      >{remindersEnabled
                        ? `${upcomingReminderCount} upcoming`
                        : 'delivery is paused'}</small
                    >
                  </div>
                  <button
                    class:enabled={remindersEnabled}
                    class="settings-switch [width:32px] [height:18px] [padding:2px] [border:1px_solid_var(--border)] [border-radius:9px] [background:var(--secondary)] [&_span]:block [&_span]:[width:12px] [&_span]:[height:12px] [&_span]:rounded-full [&_span]:[background:var(--muted-foreground)] [&_span]:[transform:translateX(0)] [&.enabled]:[background:var(--primary)] [&.enabled]:[border-color:var(--primary)] [&.enabled_span]:[background:var(--primary-foreground)] [&.enabled_span]:[transform:translateX(14px)]"
                    role="switch"
                    aria-checked={remindersEnabled}
                    aria-label="toggle all reminders"
                    disabled={saving}
                    onclick={toggleAllReminders}><span></span></button
                  >
                </div>
                <button
                  class="settings-row danger-text [color:#d15f54] flex items-center [gap:var(--icon-text-gap)] border-0 [border-top:1px_solid_var(--border)] [padding:16px_0] w-full bg-none text-left [font-size:var(--modal-body-font-size)] [&>span]:[margin-left:auto] [&>span]:[font-size:var(--secondary-text-font-size)] [&>span]:[color:var(--muted-foreground)] [&>span]:flex [&>span]:items-center [&>span]:[gap:var(--icon-text-gap)]"
                  disabled={!reminderBookmarks.some(
                    (bookmark) => reminderStatus(bookmark) === 'active'
                  )}
                  onclick={cancelAllReminders}
                  ><BellOff />cancel all active reminders</button
                ><button
                  class="settings-row flex items-center [gap:var(--icon-text-gap)] border-0 [border-top:1px_solid_var(--border)] [padding:16px_0] w-full bg-none text-left [font-size:var(--modal-body-font-size)] [&>span]:[margin-left:auto] [&>span]:[font-size:var(--secondary-text-font-size)] [&>span]:[color:var(--muted-foreground)] [&>span]:flex [&>span]:items-center [&>span]:[gap:var(--icon-text-gap)]"
                  onclick={() => {
                    closeModal();
                    void openRemindersPanel();
                  }}
                  ><ActionBell />view notifications<span
                    >{reminderBookmarks.length}<ArrowUpRight size={13} /></span
                  ></button
                >
              {:else}<h2 id="dialog-title">chikọta <span>v1.0.0</span></h2>
                <p
                  class="about-copy [max-width:390px] [margin:12px_0_0] [color:var(--muted-foreground)] [font-size:var(--modal-body-font-size)] [line-height:1.8]"
                >
                  “chikọta” is igbo for “bring together”—a quiet, beautiful
                  place to gather the links you want to keep, read, and
                  rediscover.
                </p>
                <div
                  class="about-mark grid place-items-center [width:42px] [height:42px] [margin-top:38px] [border:1px_solid_var(--border)] [border-radius:8px] [color:var(--foreground)]"
                >
                  <BookmarkFilled />
                </div>
              {/if}
            </section>
          </div>
        {:else if modal === 'delete'}<div
            class="dialog-symbol flex [width:fit-content] p-0 [color:var(--accent-text)] [margin-bottom:13px]"
          >
            <DeleteTrash size={22} />
          </div>
          <h2 id="dialog-title">let these links go?</h2>
          <p
            class="dialog-description [margin:5px_0_18px] [font-size:var(--modal-body-font-size)] [line-height:1.7] [color:var(--muted-foreground)]"
          >
            delete {selected.length} selected {selected.length === 1
              ? 'bookmark'
              : 'bookmarks'} from your library. this cannot be undone.
          </p>
          <p
            class="form-error [color:#cf6356] [font-size:var(--modal-body-font-size)] [line-height:1.6] [&:empty]:hidden"
            role="alert"
          >
            {formError}
          </p>
          <div
            class="dialog-actions flex justify-end [gap:9px] [margin-top:23px] [&>button]:[height:32px] [&>button]:[min-height:32px] [&>button]:[line-height:1]"
          >
            <button
              class="secondary-button inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_transparent] [border-radius:6px] [padding:7px_10px] [font-size:var(--body-font-size)] font-medium [min-height:30px] whitespace-nowrap [background:var(--card)] [border-color:var(--border)] [&:hover]:[background:var(--secondary)] motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)]"
              disabled={saving}
              onclick={closeModal}>keep bookmarks</button
            ><button
              class="primary-button destructive inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_transparent] [border-radius:6px] [padding:7px_10px] [font-size:var(--body-font-size)] font-medium [min-height:30px] whitespace-nowrap [background:var(--primary)] [color:var(--primary-foreground)] [&:hover]:[filter:brightness(1.12)] [background:#b04437] [color:white] motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)]"
              disabled={saving}
              onclick={removeSelected}
              >{saving ? 'deleting…' : 'delete bookmarks'}</button
            >
          </div>
        {:else if modal === 'delete-collections'}<div
            class="dialog-symbol flex [width:fit-content] p-0 [color:var(--accent-text)] [margin-bottom:13px]"
          >
            <DeleteTrash size={22} />
          </div>
          <h2 id="dialog-title">remove these collections?</h2>
          <p
            class="dialog-description [margin:5px_0_18px] [font-size:var(--modal-body-font-size)] [line-height:1.7] [color:var(--muted-foreground)]"
          >
            delete {selectedCollections.length} selected {selectedCollections.length ===
            1
              ? 'collection'
              : 'collections'}. their bookmarks will remain in your library.
          </p>
          <p
            class="form-error [color:#cf6356] [font-size:var(--modal-body-font-size)] [line-height:1.6] [&:empty]:hidden"
            role="alert"
          >
            {formError}
          </p>
          <div
            class="dialog-actions flex justify-end [gap:9px] [margin-top:23px] [&>button]:[height:32px] [&>button]:[min-height:32px] [&>button]:[line-height:1]"
          >
            <button
              class="secondary-button inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_transparent] [border-radius:6px] [padding:7px_10px] [font-size:var(--body-font-size)] font-medium [min-height:30px] whitespace-nowrap [background:var(--card)] [border-color:var(--border)] [&:hover]:[background:var(--secondary)] motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)]"
              disabled={saving}
              onclick={closeModal}>keep collections</button
            ><button
              class="primary-button destructive inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_transparent] [border-radius:6px] [padding:7px_10px] [font-size:var(--body-font-size)] font-medium [min-height:30px] whitespace-nowrap [background:var(--primary)] [color:var(--primary-foreground)] [&:hover]:[filter:brightness(1.12)] [background:#b04437] [color:white] motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)]"
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

<style>
  .right-marker-fade {
    position: absolute;
    top: 0;
    bottom: -24px;
    left: calc(100% + 1px);
    width: 64px;
    pointer-events: none;
    background: linear-gradient(
      to bottom,
      var(--background) calc(100% - 24px),
      transparent
    );
  }

  .pinned-rail-item {
    position: relative;
    min-width: 0;
    max-width: 100%;
  }

  .pinned-rail-unpin {
    position: absolute;
    right: 5px;
    top: 50%;
    transform: translateY(-50%);
    display: grid;
    place-items: center;
    width: 18px;
    height: 20px;
    padding: 0;
    border: 0;
    border-radius: 4px;
    background: var(--sidebar);
    box-shadow: -5px 0 6px var(--sidebar);
    color: var(--muted-foreground);
    opacity: 0;
  }

  .pinned-rail-item:hover .pinned-rail-unpin,
  .pinned-rail-item:focus-within .pinned-rail-unpin {
    opacity: 1;
  }

  .pinned-rail-unpin:hover {
    color: var(--foreground);
    background: var(--secondary);
  }

  .pinned-rail-unpin:focus-visible {
    outline: 1px solid var(--accent-text);
  }

  .date-heading {
    font-size: var(--body-font-size) !important;
  }

  .app-dialog[open] {
    animation: modal-open 240ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .app-dialog[open]::backdrop {
    animation: modal-backdrop-open 240ms ease-out both;
  }

  @keyframes modal-open {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes modal-backdrop-open {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .app-dialog.settings-dialog {
    width: 680px;
  }

  .app-dialog.command-positioned {
    position: fixed;
    bottom: auto;
    right: auto;
    margin: 0;
    max-height: min(520px, calc(100dvh - 20px));
    overflow: hidden;
  }

  .app-dialog.settings-dialog .dialog-inner,
  .app-dialog.command-positioned .dialog-inner {
    padding: 0;
  }

  .command-positioned .command-dialog {
    margin: 0;
  }

  .reminders-panel .extension-panel-heading {
    margin-bottom: 8px;
  }

  .reminders-panel .dialog-description {
    margin-top: 2px;
  }

  .reminder-table-head > span:first-child {
    padding-left: 32px;
  }

  .reminder-table-row.done strong,
  .reminder-table-row.canceled strong {
    text-decoration: line-through;
    text-decoration-thickness: 1px;
  }

  .theme-options {
    align-items: start;
  }

  .theme-preview[data-preview='forest'] {
    background: #0c1510;
    border-color: #26352b;
  }

  .theme-preview[data-preview='ember'] {
    background: #17120f;
    border-color: #3b2d23;
  }

  .settings-shortcuts {
    margin: 0;
  }

  .settings-panel .dialog-description {
    margin: 5px 0 18px;
    color: var(--muted-foreground);
    font-size: var(--body-font-size);
    line-height: 1.7;
  }

  .settings-shortcuts > div {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding-block: 9px;
    border-bottom: 1px solid var(--border);
  }

  .settings-shortcuts dd {
    margin: 0;
    color: var(--muted-foreground);
    text-align: right;
  }

  @media (max-width: 520px) {
    .settings-shell {
      grid-template-columns: 1fr;
    }

    .settings-tabs {
      flex-direction: row;
      flex-wrap: wrap;
      padding: 42px 12px 10px;
      border-right: 0;
      border-bottom: 1px solid var(--border);
    }

    .settings-tabs button {
      width: auto;
    }

    .settings-panel {
      padding: 20px;
    }
  }

  .sticky-library-header {
    box-shadow: 0 1px 0 color-mix(in srgb, var(--border) 58%, transparent);
  }

  #collection-content.open,
  .date-bookmarks-collapse.open {
    grid-template-rows: 1fr;
    opacity: 1;
  }

  .date-bookmarks-collapse.open .collapse-inner {
    overflow: visible;
  }

  .collection-slider {
    position: relative;
    min-width: 0;
    border-top: 1px solid var(--border);
  }

  .collection-empty {
    height: 117px;
    min-height: 117px;
    padding-block: 7px;
  }

  .collection-grid {
    display: grid;
    grid-auto-columns: calc(100% / 5);
    grid-template-rows: repeat(2, 58px);
    height: 116px;
    width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    background: var(--sidebar);
    scrollbar-width: none;
    scroll-snap-type: x proximity;
    overscroll-behavior-inline: contain;
  }

  .collection-grid::-webkit-scrollbar {
    display: none;
  }

  .collection-grid .collection-card {
    grid-column: var(--collection-column);
    grid-row: var(--collection-row);
    border-right: 1px solid var(--border);
    scroll-snap-align: start;
  }

  .collection-grid .collection-card:hover,
  .collection-grid .collection-card.active,
  .collection-grid .collection-card.selected {
    background: var(--accent-soft);
  }

  .collection-grid .collection-card.selected {
    box-shadow: inset 0 0 0 1px var(--accent-text);
  }

  .collection-grid .collection-card:hover .collection-menu,
  .collection-grid .collection-card:focus-within .collection-menu {
    opacity: 1;
  }

  .collection-grid .collection-card:nth-child(10n + 6),
  .collection-grid .collection-card:nth-child(10n + 7),
  .collection-grid .collection-card:nth-child(10n + 8),
  .collection-grid .collection-card:nth-child(10n + 9),
  .collection-grid .collection-card:nth-child(10n + 10) {
    border-top: 1px solid var(--border);
  }

  .collection-slider::before,
  .collection-slider::after {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 1;
    width: 58px;
    content: '';
    opacity: 0;
    pointer-events: none;
    transition: opacity 160ms ease;
  }

  .collection-slider::before {
    left: 0;
    background: linear-gradient(90deg, var(--sidebar), transparent);
  }

  .collection-slider::after {
    right: 0;
    background: linear-gradient(270deg, var(--sidebar), transparent);
  }

  .collection-slider.fade-start::before,
  .collection-slider.fade-end::after {
    opacity: 1;
  }

  .pinned-rail-chip:focus-visible {
    outline: 2px solid var(--accent-text);
    outline-offset: 2px;
  }

  .pinned-rail {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 21;
    width: calc((100vw - var(--reading-max)) / 2);
    max-height: 100dvh;
    overflow-y: auto;
    scrollbar-width: none;
  }

  .pinned-rail::-webkit-scrollbar {
    display: none;
  }

  .pinned-rail-list {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
    align-content: start;
    justify-content: flex-end;
    padding: 18px 22px;
  }

  .pinned-rail-chip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    max-width: 100%;
    min-height: 31px;
    padding: 4px 9px;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--sidebar);
    color: var(--muted-foreground);
    font-size: 13px;
    line-height: 1.2;
    text-decoration: none;
    box-shadow: inset 0 1px 0 #ffffff0d;
  }

  .pinned-rail-chip:hover,
  .pinned-rail-chip.selected {
    background: var(--secondary);
    color: var(--foreground);
  }

  .pinned-rail-chip > span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pinned-rail-icon {
    position: relative;
    display: grid;
    flex: 0 0 18px;
    place-items: center;
    width: 18px;
    height: 18px;
    overflow: hidden;
    border-radius: 50%;
    background: var(--secondary);
  }

  .pinned-rail-icon img {
    position: absolute;
    width: 16px;
    height: 16px;
    object-fit: contain;
  }

  #bookmark-action-rail {
    position: absolute;
    top: 50%;
    left: 100%;
    z-index: 4;
    display: flex;
    align-items: center;
    gap: 3px;
    width: max-content;
    padding-left: 7px;
    visibility: hidden;
    pointer-events: none;
    transform: translateY(-50%);
  }

  #bookmark-action-rail.open {
    visibility: visible;
    pointer-events: auto;
  }

  #bookmark-action-rail .plain-button {
    min-height: 30px;
    padding: 5px 6px;
    border-radius: 5px;
    background: var(--background);
    color: var(--foreground);
    box-shadow: 0 0 0 1px var(--border);
    opacity: 0;
    transform: translateX(-9px) scale(0.97);
    transition:
      opacity 150ms ease-out,
      transform 190ms cubic-bezier(0.22, 1, 0.36, 1),
      background-color 140ms ease;
  }

  #bookmark-action-rail.open .plain-button {
    opacity: 1;
    transform: translateX(0) scale(1);
  }

  #bookmark-action-rail .plain-button:hover,
  #bookmark-action-rail .plain-button:focus-visible {
    background: var(--secondary);
  }

  .list-options-trigger:hover,
  .list-options-trigger:focus-visible {
    background: var(--secondary);
    color: var(--foreground);
  }

  .bookmark-row + .bookmark-row {
    border-top: 1px solid var(--border);
  }

  .bookmark-row::before {
    position: absolute;
    z-index: 0;
    inset: 0;
    background: transparent;
    content: '';
    pointer-events: none;
  }

  .bookmark-row > * {
    position: relative;
    z-index: 1;
  }

  .bookmark-row:hover::before,
  .bookmark-row:focus-within::before {
    background: var(--row-hover);
  }

  .bookmark-row.selected::before {
    background: var(--accent-soft);
  }

  .bookmark-row.context-active::before {
    background: color-mix(in srgb, var(--row-hover) 80%, var(--foreground) 4%);
  }

  .bookmark-leading .site-letter {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    overflow: hidden;
    border-radius: 7px;
    background: var(--secondary);
  }

  .bookmark-leading .site-letter img {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 20px;
    object-fit: contain;
    transform: translate(-50%, -50%);
  }

  .bookmark-leading .site-letter:has(img) :global(svg) {
    visibility: hidden;
  }

  .bookmark-row:hover .row-actions .icon-button,
  .bookmark-row:focus-within .row-actions .icon-button,
  .row-actions .icon-button.reminder-active {
    opacity: 1;
  }

  .row-actions .icon-button:hover,
  .row-actions .icon-button:focus-visible {
    color: var(--foreground);
  }

  .selection-dock-tooltip {
    filter: drop-shadow(0 8px 12px #0003) drop-shadow(0 2px 3px #0002);
  }

  .selection-dock-tooltip.visible {
    opacity: 1;
    transform: translate(-50%, 0) scale(1);
  }

  .selection-dock-tooltip-bubble {
    padding: 8px 12px;
    border-radius: 999px;
    background: var(--card);
    color: var(--foreground);
    font-family: var(--font-sans);
    font-size: var(--body-font-size);
    font-weight: 400;
    letter-spacing: 0.1px;
    line-height: 1;
    white-space: nowrap;
    box-shadow: inset 0 1px 0
      color-mix(in srgb, var(--foreground) 7%, transparent);
  }

  .selection-dock-tooltip-tail {
    display: block;
    width: 32px;
    height: 10px;
    margin-top: -2px;
    scale: 1;
    overflow: visible;
    fill: var(--card);
  }

  @media (max-width: 1179px) {
    .pinned-rail {
      display: none;
    }
  }

  @media (max-width: 1060px) {
    #bookmark-action-rail {
      top: 100%;
      right: 0;
      left: auto;
      padding: 7px 0 0;
      transform: none;
    }
  }

  @media (max-width: 520px) {
    .collection-grid {
      grid-auto-columns: 50%;
    }

    .collection-grid .collection-card {
      grid-column: var(--collection-mobile-column);
      grid-row: var(--collection-mobile-row);
    }

    .collection-grid .collection-card:nth-child(n) {
      border-top: 0;
    }

    .collection-grid .collection-card:nth-child(4n + 3),
    .collection-grid .collection-card:nth-child(4n + 4) {
      border-top: 1px solid var(--border);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .app-dialog[open],
    .app-dialog[open]::backdrop {
      animation: none;
    }

    .collection-slider::before,
    .collection-slider::after {
      transition: none;
    }

    #bookmark-action-rail .plain-button {
      transition: none;
    }
  }
</style>

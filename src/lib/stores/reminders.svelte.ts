import type { Bookmark } from '$lib/types';

export type ReminderState = {
  status: 'active' | 'done' | 'canceled';
  emailId?: string;
  updatedAt: string;
};

export type ReminderStatus = ReminderState['status'];

export type ReminderStates = Record<string, ReminderState>;

export function formatReminder(value: Date) {
  return value.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function reminderInputValue(value = new Date(Date.now() + 86_400_000)) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
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
  } catch {
    /* Browser audio can be blocked; the visual reminder still lands. */
  }
}

export function createRemindersStore(options: {
  scopeKey: () => string;
  getBookmarks: () => Bookmark[];
  signedIn: () => boolean;
  updateBookmark: (id: string, data: Partial<Bookmark>) => Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  let states = $state<ReminderStates>({});
  let enabled = $state(true);
  let currentTime = $state(Date.now());
  let checking = false;

  function stateKey() {
    return `chikota-reminder-state-${options.scopeKey()}`;
  }

  function enabledKey() {
    return `chikota-reminders-enabled-${options.scopeKey()}`;
  }

  function persist(next: ReminderStates) {
    localStorage.setItem(stateKey(), JSON.stringify(next));
    states = next;
  }

  function loadFromStorage() {
    try {
      states = JSON.parse(localStorage.getItem(stateKey()) || '{}');
      enabled = localStorage.getItem(enabledKey()) !== 'false';
    } catch {
      states = {};
    }
  }

  function applyStorageEvent(event: StorageEvent) {
    if (event.key === stateKey()) {
      try {
        states = JSON.parse(event.newValue || '{}');
      } catch {
        states = {};
      }
      return true;
    }
    if (event.key === enabledKey()) {
      enabled = event.newValue !== 'false';
      return true;
    }
    return false;
  }

  function tick() {
    currentTime = Date.now();
  }

  function statusFor(bookmark: Bookmark): ReminderStatus {
    const saved = states[bookmark.id]?.status;
    if (saved === 'canceled') return 'canceled';
    if (saved === 'done' || +(bookmark.reminderAt || 0) <= currentTime)
      return 'done';
    return 'active';
  }

  function reminderBookmarks() {
    return options
      .getBookmarks()
      .filter((bookmark) => bookmark.reminderAt)
      .toSorted(
        (a, b) =>
          +(a.reminderAt || new Date(0)) - +(b.reminderAt || new Date(0))
      );
  }

  async function scheduleEmail(bookmark: Bookmark, when: Date, email: string) {
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

  async function save(
    bookmark: Bookmark,
    whenValue: string,
    emailValue: string
  ) {
    const when = new Date(whenValue);
    if (Number.isNaN(+when) || +when <= Date.now())
      throw new Error('choose a time in the future.');
    const email = emailValue.trim();
    if (email && !options.signedIn())
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
    await cancelScheduledEmail(states[bookmark.id]?.emailId);
    const emailId =
      email && enabled ? await scheduleEmail(bookmark, when, email) : undefined;
    await options.updateBookmark(bookmark.id, {
      reminderAt: when,
      reminderEmail: email
    });
    persist({
      ...states,
      [bookmark.id]: {
        status: 'active',
        emailId,
        updatedAt: new Date().toISOString()
      }
    });
    options.onSuccess(`reminder set for ${formatReminder(when)}`);
  }

  async function cancel(bookmark: Bookmark, announce = true) {
    try {
      await cancelScheduledEmail(states[bookmark.id]?.emailId);
      persist({
        ...states,
        [bookmark.id]: {
          status: 'canceled',
          updatedAt: new Date().toISOString()
        }
      });
      if (announce) options.onSuccess('reminder canceled');
    } catch (error) {
      options.onError(
        error instanceof Error ? error.message : 'could not cancel reminder'
      );
    }
  }

  async function cancelAll() {
    const active = reminderBookmarks().filter(
      (bookmark) => statusFor(bookmark) === 'active'
    );
    for (const bookmark of active) await cancel(bookmark, false);
    options.onSuccess(
      `${active.length} ${active.length === 1 ? 'reminder' : 'reminders'} canceled`
    );
  }

  async function toggleEnabled() {
    const nextEnabled = !enabled;
    const nextStates = { ...states };
    for (const bookmark of reminderBookmarks()) {
      if (statusFor(bookmark) !== 'active' || !bookmark.reminderEmail) continue;
      const state = nextStates[bookmark.id];
      if (
        nextEnabled &&
        bookmark.reminderAt &&
        +bookmark.reminderAt > Date.now()
      ) {
        const emailId = await scheduleEmail(
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
    localStorage.setItem(enabledKey(), String(nextEnabled));
    enabled = nextEnabled;
    persist(nextStates);
    options.onSuccess(nextEnabled ? 'reminders enabled' : 'reminders paused');
  }

  async function check(ready: boolean) {
    if (!enabled || checking || !ready) return;
    checking = true;
    try {
      const nextStates = { ...states };
      let changed = false;
      for (const bookmark of reminderBookmarks()) {
        const storedStatus = states[bookmark.id]?.status;
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
      if (changed) persist(nextStates);
    } finally {
      checking = false;
    }
  }

  return {
    get states() {
      return states;
    },
    set states(value: ReminderStates) {
      states = value;
    },
    get enabled() {
      return enabled;
    },
    set enabled(value: boolean) {
      enabled = value;
    },
    get currentTime() {
      return currentTime;
    },
    stateKey,
    enabledKey,
    persist,
    loadFromStorage,
    applyStorageEvent,
    tick,
    statusFor,
    reminderBookmarks,
    save,
    cancel,
    cancelAll,
    toggleEnabled,
    check
  };
}

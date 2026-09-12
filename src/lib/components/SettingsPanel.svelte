<script lang="ts">
  import type { Bookmark } from '$lib/types';
  import type { Theme } from '$lib/stores/theme.svelte';
  import type { ReminderStatus } from '$lib/stores/reminders.svelte';
  import ActionBell from '$lib/components/icons/ActionBell.svelte';
  import ActionSettings from '$lib/components/icons/ActionSettings.svelte';
  import BrowserExtension from '$lib/components/icons/BrowserExtension.svelte';
  import {
    ArrowUpRight,
    BellOff,
    BookmarkFilled,
    Check,
    Download,
    Info,
    LogOut
  } from '$lib/components/icons/radix';

  type SettingsTab = 'appearance' | 'reminders' | 'about';

  let {
    tab = $bindable('appearance'),
    themes,
    currentTheme,
    signedIn = false,
    remindersEnabled = true,
    upcomingReminderCount = 0,
    reminderBookmarks,
    reminderStatusById,
    saving = false,
    onTheme,
    onExport,
    onOpenExtension,
    onSignOut,
    onToggleReminders,
    onCancelAllReminders,
    onViewReminders
  }: {
    tab: SettingsTab;
    themes: { id: Theme; name: string; description: string }[];
    currentTheme: Theme;
    signedIn?: boolean;
    remindersEnabled?: boolean;
    upcomingReminderCount?: number;
    reminderBookmarks: Bookmark[];
    reminderStatusById: Map<string, ReminderStatus>;
    saving?: boolean;
    onTheme: (theme: Theme) => void;
    onExport: () => void;
    onOpenExtension: () => void;
    onSignOut: () => void;
    onToggleReminders: () => void;
    onCancelAllReminders: () => void;
    onViewReminders: () => void;
  } = $props();

  const hasActiveReminders = $derived(
    reminderBookmarks.some(
      (bookmark) => reminderStatusById.get(bookmark.id) === 'active'
    )
  );
</script>

<div class="settings-shell">
  <nav class="settings-tabs" aria-label="settings sections">
    <button
      class:active={tab === 'appearance'}
      aria-pressed={tab === 'appearance'}
      onclick={() => (tab = 'appearance')}><ActionSettings />appearance</button
    ><button
      class:active={tab === 'reminders'}
      aria-pressed={tab === 'reminders'}
      onclick={() => (tab = 'reminders')}><ActionBell />reminders</button
    ><button
      class:active={tab === 'about'}
      aria-pressed={tab === 'about'}
      onclick={() => (tab = 'about')}><Info />about</button
    >
  </nav>
  <section class="settings-panel">
    {#if tab === 'appearance'}<h2 id="dialog-title">make it feel like you.</h2>
      <p class="dialog-description">
        a different atmosphere. the same quiet space.
      </p>
      <div class="theme-options">
        {#each themes as theme (theme.id)}<button
            class:theme-selected={currentTheme === theme.id}
            aria-pressed={currentTheme === theme.id}
            onclick={() => onTheme(theme.id)}
            ><span class="theme-preview" data-preview={theme.id}
              ><span class="preview-sidebar"></span><span
                class="preview-content"><i></i><i></i><i></i></span
              >{#if currentTheme === theme.id}<span class="theme-check"
                  ><Check size={12} /></span
                >{/if}</span
            ><strong>{theme.name}</strong><small>{theme.description}</small
            ></button
          >{/each}
      </div>
      <p class="settings-note">
        {signedIn
          ? 'bookmarks, pins, and reading status sync to your account. collections are stored on this device.'
          : 'your links are saved in this browser. export a copy to keep a backup.'}
      </p>
      <button class="settings-row" onclick={onExport}
        ><Download />export library<span>json<ArrowUpRight size={13} /></span
        ></button
      ><button class="settings-row" onclick={onOpenExtension}
        ><BrowserExtension />browser extension<span
          >set up<ArrowUpRight size={13} /></span
        ></button
      >{#if signedIn}<button class="settings-row" onclick={onSignOut}
          ><LogOut />sign out</button
        >{/if}
    {:else if tab === 'reminders'}<h2 id="dialog-title">reminder delivery</h2>
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
          onclick={onToggleReminders}><span></span></button
        >
      </div>
      <button
        class="settings-row danger-text"
        disabled={!hasActiveReminders}
        onclick={onCancelAllReminders}
        ><BellOff />cancel all active reminders</button
      ><button class="settings-row" onclick={onViewReminders}
        ><ActionBell />view notifications<span
          >{reminderBookmarks.length}<ArrowUpRight size={13} /></span
        ></button
      >
    {:else}<h2 id="dialog-title">chikọta <span>v1.0.0</span></h2>
      <p class="about-copy">
        “chikọta” is igbo for “bring together”—a quiet, beautiful place to
        gather the links you want to keep, read, and rediscover.
      </p>
      <div class="about-mark"><BookmarkFilled /></div>
    {/if}
  </section>
</div>

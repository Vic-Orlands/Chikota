export const RECENT_OPEN_WINDOW_MS = 604_800_000;

export type TimestampInput = Date | string | number | null | undefined;

export type WidgetMembershipInput = {
  widgetEnabled?: boolean;
  isPinned?: boolean;
  openedAt?: TimestampInput;
  reminderAt?: TimestampInput;
};

export function timestampMs(value: TimestampInput): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const ms = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isFinite(ms) ? ms : null;
}

export function isRecentOpen(openedAt: TimestampInput, now: number): boolean {
  const opened = timestampMs(openedAt);
  if (opened == null) return false;
  const elapsed = now - opened;
  return elapsed >= 0 && elapsed <= RECENT_OPEN_WINDOW_MS;
}

export function hasActiveReminder(
  reminderAt: TimestampInput,
  now: number
): boolean {
  const when = timestampMs(reminderAt);
  return when != null && when > now;
}

/**
 * A bookmark belongs on desktop widgets when it is explicitly enabled,
 * pinned, opened in the last 7 days, or has a future reminder.
 * Keep in sync with macos/Shared/WidgetModels.swift and
 * linux/chikota_widget.py. See docs/widget-membership.md.
 */
export function belongsOnWidget(
  bookmark: WidgetMembershipInput,
  now: number
): boolean {
  return (
    Boolean(bookmark.widgetEnabled) ||
    Boolean(bookmark.isPinned) ||
    isRecentOpen(bookmark.openedAt, now) ||
    hasActiveReminder(bookmark.reminderAt, now)
  );
}

export function desktopWidgetToggleLabel(enabled: boolean): string {
  return enabled ? 'remove from desktop widget' : 'add to desktop widget';
}

export function desktopWidgetToast(wasEnabled: boolean): string {
  return wasEnabled ? 'removed from desktop widget' : 'added to desktop widget';
}

export const desktopWidgetErrorMessage = 'could not update the desktop widget';

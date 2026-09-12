# Desktop widget membership

Desktop widgets (macOS WidgetKit and the Linux companion) show a **subset** of the library. The web app and the macOS companion library still list every bookmark.

`GET /api/widget` returns the full library so clients can compute membership locally. Clients must not invent their own filter.

## Rule

A bookmark belongs on the widget when **any** of these is true:

1. `widgetEnabled` is true (explicit “add to desktop widget”)
2. `isPinned` is true
3. it was opened in the last **7 days** (`openedAt` within 604,800 seconds)
4. it has an **active** reminder (`reminderAt` is in the future)

In other words: `widgetEnabled ∪ pin ∪ recent ∪ active reminder`.

A completed reminder (`reminderAt <= now`) does **not** keep the bookmark on the widget unless another rule still applies.

## Shared implementations

| Client | Predicate |
| --- | --- |
| Web | `src/lib/widget-membership.ts` → `belongsOnWidget` |
| macOS | `WidgetBookmark.belongsOnWidget` in `macos/Shared/WidgetModels.swift` |
| Linux | `belongs_on_widget` in `linux/chikota_widget.py` |

The web context menu toggles **only** `widgetEnabled`. Pin, recent, and reminder membership are derived from those fields. Labels say **desktop widget**, not Mac-only, because Linux uses the same rule.

## Why the API stays unfiltered

The macOS companion app is a full library. Widget clients reuse that feed and apply this predicate before display (then take the platform’s visible limit).

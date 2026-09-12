# Tags (frozen)

Wave 3 leaves tags **unused by live UI**.

- Bookmark form, library rows, and settings do not create or edit tags.
- The unused web store `src/lib/stores/tags.ts` was removed.
- `GET/POST /api/tags` and `PUT/DELETE /api/tags/[id]` stay for data already stored and for bookmark create/update payloads that still accept `tags`.
- Tag names stay unique **per user** (`userId` + `name`), as scoped in Wave 1.

Do not add a settings-only tag manager. Wire tags into the live form and row chips in a later product pass if they become first-class.

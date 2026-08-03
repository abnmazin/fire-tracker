# Fire Tracker — Feature Overview

## Installable PWA

- Installable on phones/tablets/desktop via the "تثبيت التطبيق على الجهاز" button and browser install prompts (`beforeinstallprompt`).
- Full web manifest: standalone display, RTL, Arabic locale, maskable + regular icons, and shortcuts to dashboard / list / report / users.
- Window Controls Overlay titlebar on supported platforms with a draggable header.
- Zoom is locked so the app behaves like a native app (no accidental pinch/scroll zoom).

## Offline support

- All extinguisher mutations work offline: local state updates immediately, writes are queued (`ft_pendingWrites`) and flushed automatically when back online.
- Offline-safe actions include: add, edit, inspect, archive, transfer, undo transfer, history reset, user management, performance-log deletion, inspection policies, archive center, and developer settings (wipe/clear/restore/bulk add).

## Extinguisher log (سجل الطفايات)

- Table view on desktop, card view on mobile.
- Filters: type, main location, sub location, quick status, search.
- "مسح الفلاتر" (clear filters) resets every filter and the multi-selection at once.
- Multi-select with bulk actions: grouped action, transfer, archive.
- Mobile-friendly floating action bar (full-width bottom sheet on small screens).
- Add modal: location auto-filled from active filters, suggested next number (max+1), bulk consecutive add (up to 200), remembers last used values.
- Unified `dd-mm-yyyy` date display everywhere, with safe parsing of legacy `dd/mm/yyyy` records.
- Per-extinguisher history (actions log) with reset for developers.
- Statuses: صالحة / تحتاج فحص / صيانة قريبة / تحتاج صيانة, with 6-month maintenance scheduling.

## Reporting & performance

- Report page with per-location reports and receipts.
- Performance report (متابعة الإنجاز) tracking inspection progress from audit logs, with per-record deletion.
- Dashboard with summary statistics, contacts, and quick actions.

## Management

- Hierarchical location tree (locations, sub-locations) managed via `LocationTreeManager`.
- Users & roles: developer / father / admin / member.
- Inspection policy center: per-top-level-location policy rules.
- Archive center: archived extinguishers and users, restore/delete.
- Developer settings: data wipe/clear/restore, bulk add, quality checks, site settings.

## Session & persistence

- Dual auth: Firebase anonymous auth (background, for Firestore) + local session (`ft_user`).
- The last active screen persists across refresh via `?view=` URL parameter and `localStorage ft_view`.
- Local caches for every collection enable instant offline reads.

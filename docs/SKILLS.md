# Skills — working with the Fire Tracker codebase

Practical skills, conventions, and gotchas for editing this project.

## Core skill: know the architecture

- **Monolithic single-file app.** Almost all logic lives in `src/App.jsx` (~3000+ lines). Views switch via `currentView` state, not a router. Modals are shown/hidden via truthy state variables.
- **No TypeScript, no test suite.** Verify changes with `npm run build`. Run `npm run lint` but note pre-existing warnings in untouched code.
- **Arabic / RTL.** All UI strings are Arabic; layout uses `dir="rtl"`. Keep new UI text in Arabic.

## Firebase data model

All data lives under `artifacts/{appId}/public/data/` (`appId = 'fire-tracker-ed183'`).

- Extinguishers: `extinguishers/{id}` (id pattern `EXT-{3-digit number}`).
- Users: `users/{id}`.
- Audit logs: `auditLogs/{id}`.
- App data docs: `app_data/contacts`, `app_data/locations`, `app_data/inspectionPolicies`, `app_data/siteSettings`.

## Skill: offline-first writes

Never write to Firestore directly for user-facing mutations. Use the app's helpers so changes survive going offline:

- `routeWrite(db, fbUser, appId, colPath, id, data)`
- `routeDelete(db, fbUser, appId, colPath, id)`
- `enqueueWrite` / `enqueueDelete` — queue when offline (`localStorage ft_pendingWrites`)
- `flushPendingWrites(db, fbUser, appId)` — retry queued writes when back online
- Queue changes broadcast via `QUEUE_EVENT = 'ft-queue-changed'`

Rule of thumb: update local state immediately, then call `routeWrite`/`routeDelete`. Do not block the UI on the network.

## Skill: date handling

- Display format everywhere is `dd-mm-yyyy` (enforced by `formatDisplayDate`, `formatDisplayDateTime`, `formatLogDate`).
- Helper `normalizeDayStr` handles legacy `dd/mm/yyyy` records idempotently — keep any new date parsing through these helpers, never write raw `toLocaleDateString`.

## Skill: PWA / installable behavior

- Zoom is locked at three levels: `viewport` meta, CSS `touch-action` in `index.css`, and JS handlers in `src/main.jsx`. Do not remove these — the app is meant to behave like a native app.
- Manifest lives in `vite.config.js` (id, start_url, scope, display_override, shortcuts). Icons are in `public/icons/`.
- WCO (Window Controls Overlay): the header handles `wcoVisible` / `isStandalone` / `installPrompt`; keep the draggable titlebar region and `env(titlebar-area-height)` padding intact.
- View persistence: `navigateTo(view)` saves to `localStorage ft_view` and updates `?view=` in the URL. Keep this pattern for any new screen.

## Skill: the location tree

- Locations are a nested tree stored in `app_data/locations → .list`.
- Node shape: `{ id, name, children: [] }`.
- Extinguisher `location` field is the full path joined with ` / ` (e.g., `"البصرة / مسجد الموسوي / المطبخ"`).
- Use the API in `src/locationUtils.js` (`flatToTree`, `getNodePath`, `addNode`, `removeNode`, `updateNodeName`, `getAllLeafPaths`, `migrateIfNeeded`, …) — do not hand-roll tree mutations.
- Components: `HierarchicalLocationPicker.jsx` (cascading dropdowns) and `LocationTreeManager.jsx` (inline tree editor).

## Skill: statuses, roles, and conventions

- Extinguisher statuses (Arabic): `'صالحة'`, `'تحتاج فحص'`, `'صيانة قريبة'`, `'تحتاج صيانة'`.
- Role hierarchy: `developer` > `father` > `admin` > `member`. Gate views with conditionals like `currentUser.role === 'developer'`.
- Default accounts (password `123`): `dev`, `father`, `admin`, `user`.
- `archived: true` is a soft delete (extinguishers and users); only `developer` can hard-delete.

## Local state keys (localStorage)

| Key | Purpose |
|---|---|
| `ft_user` | current logged-in user session |
| `ft_extinguishers` | local copy of extinguishers |
| `ft_users` | users cache |
| `ft_auditLogs` | audit log cache |
| `ft_contacts` | contacts cache |
| `ft_locations` | location tree cache |
| `ft_inspectionPolicies` | inspection policies cache |
| `ft_siteSettings` | site settings cache |
| `ft_pendingWrites` | queued offline writes |
| `ft_view` | last active screen (persists across refresh) |
| `ft_lastAdd` | last values used in the add-extinguisher modal |

## Build / verify

```bash
npm run build    # always run after edits
npm run lint     # shows pre-existing warnings; fix only what you introduced
```

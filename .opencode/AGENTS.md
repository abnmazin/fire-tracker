# fire-tracker — agent guide

## Quick start

```bash
npm run dev      # Vite dev server
npm run build    # production build
npm run lint     # ESLint (entire project)
npm run preview  # preview production build
```

No test suite, no typecheck step, no CI.

## Architecture

**Monolithic single-file app** — all ~2800 lines of component logic live in `src/App.jsx`. No router, no state library, no code splitting. Views switch via `currentView` state. Modal visibility is toggled by truthy state variables.

Entrypoint: `index.html` → `src/main.jsx` → `src/App.jsx`.

## Tech stack

- React 19 + Vite 7 + Tailwind CSS 3.4 (PostCSS)
- Firebase 12 (Firestore + Anonymous Auth)
- **No TypeScript** — plain JSX
- `src/App.css` is unused Vite template boilerplate; all styling comes from Tailwind via `src/index.css`
- `vite-plugin-pwa` v1.3.0 — generates service worker + manifest

## Firebase

Firebase config is **hardcoded in source** (`src/App.jsx:17-24`) with real credentials (expected for Firebase Web SDK — API key is public by design; access is gated by Firestore security rules).

Auth flow: `signInAnonymously` on mount → Firestore real-time listeners via `onSnapshot` on all collections. Offline persistence enabled via `enableIndexedDbPersistence`. All writes use `setDoc`/`deleteDoc`/`writeBatch`.

### Firestore schema

All data lives under the prefix: `artifacts/{appId}/public/data/`

| Path | Type | Notes |
|---|---|---|
| `.../extinguishers/{id}` | collection | extinguisher records |
| `.../users/{id}` | collection | user accounts |
| `.../auditLogs/{id}` | collection | action history |
| `.../app_data/contacts` | doc | array in `.list` |
| `.../app_data/locations` | doc | array in `.list` |
| `.../app_data/inspectionPolicies` | doc | array in `.list` |
| `.../app_data/siteSettings` | doc | flat object |

## Auth system

Dual auth:
1. **Firebase anonymous** — background auth for Firestore access
2. **Local session** — `fireTracker_user` key in `localStorage`; user must log in via the app's own login screen

Role hierarchy (most to least privileged): `developer` > `father` > `admin` > `member`. Role-based view gating is done inline with conditionals like `currentUser.role === 'developer'`.

Default accounts (all password `123`): `dev` (developer), `father` (father), `admin` (admin), `user` (member).

## File structure

| File | Purpose |
|---|---|
| `src/App.jsx` | Main app (~2800 lines) — all component logic |
| `src/locationUtils.js` | Utility functions for hierarchical location tree management |
| `src/HierarchicalLocationPicker.jsx` | Cascading dropdown picker for selecting locations from the tree |
| `src/LocationTreeManager.jsx` | Interactive tree UI for managing locations (add/edit/delete nodes) |

## Key conventions

- **Arabic / RTL** — all UI strings are in Arabic, layout uses `dir="rtl"`
- Extinguisher IDs follow pattern `EXT-{3-digit number}` (e.g., `EXT-001`)
- Status values are Arabic strings: `'صالحة'`, `'تحتاج فحص'`, `'صيانة قريبة'`, `'تحتاج صيانة'`
- `archived: true` is used for soft-delete (extinguishers and users); only `developer` can hard-delete
- Firestore security rules are the only access control for the Firebase data — inspect them if auth issues arise

## Location system (hierarchical tree)

Locations are stored as a **tree structure** in Firestore at `app_data/locations → .list`, replacing the old flat array.

### Tree node format

```js
{ id: string, name: string, children: TreeNode[] }
```

### Location path format in extinguishers

Extinguisher `location` field uses the **full path** separated by ` / ` (e.g., `"البصرة / مسجد الموسوي / المطبخ"`). This replaces the old `location` + `subLocation` pair.

### `locationUtils.js` API

| Function | Description |
|---|---|
| `flatToTree(arr)` | Converts flat string array to tree structure |
| `treeToFlat(tree)` | Converts tree back to flat array |
| `getNodePath(tree, id)` | Returns full path string |
| `findNodeById(tree, id)` | Finds a node by its ID |
| `addNode(tree, parentId, name)` | Adds a child node under a parent (or root if null) |
| `removeNode(tree, id)` | Removes a node by ID |
| `updateNodeName(tree, id, name)` | Renames a node |
| `getAllLeafPaths(tree)` | Returns `[{ id, path }]` for all leaf nodes |
| `getAllNodePaths(tree)` | Returns `[{ id, name, path, depth }]` for all nodes |
| `countNodes(tree)` | Counts total nodes |
| `migrateIfNeeded(data)` | Auto-converts old flat array to tree on load |
| `serializeTree(tree)` | Deep-clone for Firestore |
| `deserializeTree(json)` | Deep-clone from Firestore |

---

## Major refactoring — ReportPage (June 2026)

This section describes the **current state** of `src/App.jsx` after a major rewrite of the Report view. Any new agent should read this first.

### Data model (report `useMemo`)

```js
report = {
  [mainLocation: string]: {
    total: number,
    subLocs: {
      [subLocation: string]: {
        total: number,
        items: Array<{
          key: string,         // `${subLocation}|${type}|${size}|${inCabinet}`
          type: string,
          size: string,
          inCabinet: boolean,
          count: number,
          ids: string[],
        }>
      }
    }
  }
}
```

- Grouping is **Main Location → Sub Location → items** (NOT type-based anymore).
- `typeMeta` (colored cards per type) was removed — all locations use a unified gray gradient header.
- Cabinet info (`inCabinet`) is a column in the table, **not** a separate expandable section.

### UI — location-based tables + inline counters

- Each **main location** is a collapsible card. Tap the gradient header to expand/collapse.
- Each **sub location** inside is also independently collapsible. Tap the sub-location name to expand/collapse its table.
- Start state: all locations **collapsed** by default (user taps what they want to see).
- Within an expanded sub-location table, each row has `[-]` and `[+]` buttons to add/remove extinguishers to a **transfer cart**.
- Cart items are keyed by `${subLocation}|${type}|${size}|${inCabinet}` for correct deduplication in inline counters.

### Cart & transfer

- **Cart state**: `cartItems` array of objects with `{ key, subLocation, type, size, inCabinet, count, total, ids, numbers[] }`.
- `getCartCount(key)` — returns count of a key in cart.
- `handleCartIncrement(subLoc, type, size, inCabinet, max, ids, numbers)` — adds to cart or increases count.
- `handleCartDecrement(key)` — decreases count or removes item.
- `removeCartItem(key)` — removes entirely.
- Transfer button opens **TransferModal** (popup with `HierarchicalLocationPicker`), NOT an inline picker.
- After transfer, cart is cleared and a receipt modal is shown.
- **Action names unified**: all transfer logs use `'نقل'` as the action string (both `ExtinguishersList` and `ReportPage`).

### Transfer log

- Rendered as **cards** (was a table) for better mobile UX.
- Filtered by `l.action === 'نقل'`.
- Old transfer logs (before refactor) used different action strings (`'ترحيل جماعي'`, `'ترحيل طفاية'`, `نقل ... طفاية إلى "..."`) — **they will NOT appear** in the new filtered log.

### Undo transfer

- Each transfer log's `details` field stores a **structured JSON string** with `{ fromLocation, toLocation, ids, numbers }`.
- `handleUndoTransfer(log)`:
  - Reverts extinguisher locations back to the original.
  - Marks the original log with `undone: true` + `undoDate` via `updateDoc`.
  - Creates a new reversed log entry with action `'تراجع عن نقل'`.
- UI for undone transfers:
  - `from` / `to` are **reversed** in the card display.
  - A green badge "تم التراجع عن النقل" is shown.
  - The card text is dimmed (`text-gray-400`).
- Undo relies on Firestore's `onSnapshot` for state propagation — there may be a 1–2 second delay before the UI updates.

### PrintModal

- Uses the **same location-based grouping** as the main report.
- Only shows tables with counts — no `+/-` buttons.
- The `typeMeta` structure is NOT used.

### Critical constraints

| Constraint | Detail |
|---|---|
| **No push** | Do NOT push to GitHub unless the user explicitly says so |
| **Service worker cache** | Old cached JS may persist on Vercel/live site; a **hard refresh (Ctrl+Shift+R)** is needed after redeploy |
| **Vercel deploy** | Vercel does NOT auto-deploy — user must trigger a redeploy from the Vercel dashboard, or the agent must push a commit (only if user allows) |

### State summary (key variables in `ReportPage`)

| Variable | Type | Purpose |
|---|---|---|
| `expanded` | `Set<string>` | Main location IDs currently expanded |
| `expandedSubs` | `Set<string>` | Sub location keys (`${mainLoc}\|\|${subLoc}`) currently expanded |
| `cartItems` | `Array` | Items in transfer cart |
| `cartTargetLocation` | `string` | Target location for pending transfer |
| `showTransferModal` | `boolean` | Transfer modal visibility |
| `showReceiptModal` / `receiptData` | `boolean` / `object` | Receipt modal after transfer |
| `filterMainLocation` | `string` | `'All'` or a main location name |
| `filterSubLocation` | `string` | `'All'` or a sub location path |
| `filterType` | `string` | `'All'` or a raw type value (`Powder`, `CO2`, etc.) |
| `filterSize` | `string` | `'All'` or a size string (`1Kg`, `6L`, etc.) |

### Next steps for a new agent

1. **Vercel redeploy** — trigger from Vercel dashboard (or push a dummy commit if user permits).
2. **Old transfer log visibility** — if needed, adjust the `transferLogs` filter or UI to show/hide old-format logs.
3. **Performance** — the `report` memo recomputes on every state change; consider `useMemo` dependency optimization for large datasets.
4. **Code splitting** — `src/App.jsx` is ~2800 lines; consider extracting `ReportPage`, `ExtinguishersList`, `Dashboard` into separate files.

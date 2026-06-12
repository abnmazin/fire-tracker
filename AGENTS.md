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

**Monolithic single-file app** — all ~2050 lines of component logic live in `src/App.jsx`. No router, no state library, no code splitting. Views switch via `currentView` state. Modal visibility is toggled by truthy state variables.

Entrypoint: `index.html` → `src/main.jsx` → `src/App.jsx`.

## Tech stack

- React 19 + Vite 7 + Tailwind CSS 3.4 (PostCSS)
- Firebase 12 (Firestore + Anonymous Auth)
- **No TypeScript** — plain JSX
- `src/App.css` is unused Vite template boilerplate; all styling comes from Tailwind via `src/index.css`

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
| `src/App.jsx` | Main app (~2100 lines) — all component logic |
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

Example:
```json
[
  { "id": "basra", "name": "البصرة", "children": [
      { "id": "mosque", "name": "مسجد الموسوي", "children": [
          { "id": "kitchen", "name": "المطبخ", "children": [] }
        ]
      }
    ]
  }
]
```

### Location path format in extinguishers

Extinguisher `location` field uses the **full path** separated by ` / ` (e.g., `"البصرة / مسجد الموسوي / المطبخ"`). This replaces the old `location` + `subLocation` pair.

### `locationUtils.js` API

| Function | Description |
|---|---|
| `flatToTree(arr)` | Converts flat string array to tree structure |
| `treeToFlat(tree)` | Converts tree back to flat array |
| `getNodePath(tree, id)` | Returns full path string (e.g., `"البصرة / مسجد الموسوي"`) |
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

### UI components

- **`HierarchicalLocationPicker`** — cascading dropdowns (one level at a time) used in add/edit/transfer extinguisher modals.
- **`LocationTreeManager`** — interactive inline tree editor with add/edit/delete buttons, used in Developer Settings → إدارة المواقع.
- In Developer Settings, old flat location input replaced with `LocationTreeManager` tree component.
- Filter dropdown in ExtinguishersList uses all leaf paths from the tree.
- Inspection policies use top-level location names only.
- Bulk add uses top-level location names.
- `resolveExtinguisherStatus` uses the first segment of the location path for policy matching.
- Old `subLocation` field is removed from display; location path includes all hierarchy levels.
- `migrateIfNeeded()` auto-converts old flat array data to tree on first load, ensuring backward compatibility.

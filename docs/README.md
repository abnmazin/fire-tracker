# Fire Tracker — Documentation

Fire Tracker is a progressive web application (PWA) for managing fire extinguishers: tracking daily inspections, 6-month maintenance, locations (hierarchical tree), users, and audit logs. It is designed to be installed on phones and tablets and to work fully offline.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build | Vite 7 |
| Styling | Tailwind CSS 3.4 |
| Backend | Firebase 12 (Firestore + Anonymous Auth) |
| App type | PWA (installable, offline-capable) |
| Language | JavaScript (JSX), no TypeScript |

## Table of contents

| Document | Description |
|---|---|
| [CHANGELOG.md](CHANGELOG.md) | History of changes and features per release |
| [SKILLS.md](SKILLS.md) | Skills, conventions, and tooling notes for working with this codebase |
| [FEATURES.md](FEATURES.md) | Detailed feature overview of the application |

## Project layout

```
fire-tracker/
├── index.html            # Entry HTML (viewport, iOS metas, icons)
├── vite.config.js        # Vite + PWA manifest + shortcuts
├── src/
│   ├── main.jsx          # React entry + zoom-lock JS
│   ├── App.jsx           # Entire application (all screens/components)
│   ├── index.css         # Tailwind + zoom-lock CSS + WCO styles
│   ├── locationUtils.js  # Hierarchical location tree utilities
│   ├── HierarchicalLocationPicker.jsx
│   ├── LocationTreeManager.jsx
│   └── App.css           # Unused Vite boilerplate
├── public/icons/         # Generated PNG icons (192/512/maskable/apple)
└── docs/                 # This documentation
```

## Quick start

```bash
npm install      # install dependencies
npm run dev      # development server
npm run build    # production build
npm run preview  # preview the production build
```

## Where to start

- Read [FEATURES.md](FEATURES.md) for an overview of what the app does.
- Read [CHANGELOG.md](CHANGELOG.md) to see recent work.
- Read [SKILLS.md](SKILLS.md) for conventions before editing code.
- For the detailed architecture reference, see `AGENTS.md` at the project root.

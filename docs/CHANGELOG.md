# Changelog

All notable changes to the Fire Tracker app. Entries are grouped by date (dd-mm-yyyy), newest first. This is a single-file React app, so each entry corresponds to changes in `src/App.jsx`, `src/main.jsx`, `src/index.css`, `index.html`, `vite.config.js`, or the `public/` folder.

## Unreleased / latest work

### 03-08-2026

#### Excel export — total row placement + styling, remove «عاملة»
- «الإجمالي» no longer sits in the narrow sequence column (ت); it is now written in the widest column of the sheet (e.g. الموقع for inventory sheets, من for transfer-log sheets).
- Total row cells now use a distinct amber fill (previously gray) for easy spotting.
- Removed the word «عاملة» from the main-location sheet titles.

#### Excel export — per sub-location sheets
- New toggle in export settings: «عرض صفحة لكل موقع فرعي».
- When enabled, the exported file gets one sheet per sub-location (named by the full location path, e.g. `النجف الأشرف - مركز المدينة`) listing each extinguisher on its own row with full details — status, last inspection, maintenance date, expiry date, numbers, cabinet, notes (respecting the column toggles) — plus a total row.
- Same design as the other sheets: RTL, red header, banded rows, thin borders, A4 fit-to-width.

#### Excel export — transfer logs sheet
- New toggle in export settings: «عرض سجلات الترحيل (صفحة جديدة)».
- When enabled, the exported file gets a «سجلات الترحيل» sheet listing every transfer operation whose destination matches the active location filter (main + sub). Each row shows: ت، التاريخ، المستخدم، من (location before transfer)، إلى، العدد، أرقام الطفايات، تفاصيل الطفايات (type/size), plus a total row.
- The sheet uses the same design as the other tables: RTL, red header, banded rows, thin borders, A4 fit-to-width.
- All tables across all pages are banded for easy line tracking.

#### Excel export — text wrapping + A4 print setup + location per row
- Long text (notes, locations) now wraps inside cells (`wrapText`) and rows auto-grow in height; header/total/data cells are vertically centered.
- Sheets are configured for A4 printing: `paperSize="9"`, portrait, `fitToWidth` so the full table fits one A4 page wide.
- The location column is now written on every row (previously only the first row of a multi-type group had it, mimicking merged cells).
- Print-modal HTML table also wraps long notes/numbers/location paths.

#### Excel export — settings dialog + column control + table coloring
- Clicking "تصدير إكسل" (report header or print modal) now opens an export-settings dialog first.
- The dialog provides toggles to fully control the report columns: حالة الطفاية، آخر فحص يومي، تاريخ الصيانة، تاريخ الانتهاء، أرقام الطفايات، الملاحظات، الكبينة. Base columns (ت | الموقع | النوع | الحجم | العدد) are always included.
- Choices persist in `localStorage ft_exportSettings`.
- Column widths are sized to fit their content (numbers narrow, dates/notes wide).
- Table coloring: banded/alternating row fill, red header bar with white text, thin borders, and a highlighted total row.

#### Excel export — refinements per site requirements
- Sheets are now right-to-left (`rightToLeft="1"`), matching the Arabic template layout.
- Field names follow the site's own labels: `ت | الموقع | النوع | الحجم | العدد | الأرقام | ملاحظات` (also applied to the on-screen and print tables).
- Extinguisher numbers display without the `EXT-` prefix and without leading zeros (001 → 1), in both Excel and HTML.
- Archived extinguishers are excluded from the export entirely (the archived sheet was removed).
- A new "غير الصالحة للعمل" sheet lists non-working extinguishers (status `تحتاج صيانة` only).
- Export, non-working sheet, and summary totals all respect the active filters.
- Excel styling added: bold title, red header bar with white text, thin cell borders, and a highlighted total row.

#### Excel export of the inventory report
- New "تصدير إكسل" buttons (report header + print modal) generate a real `.xlsx` file with one sheet per main location, matching the adopted template:
  - Each location sheet is named after the location and contains: title row, headers (ت / الموقع / النوع / الحجم / العدد / أرقام الطفايات / الملاحظات), grouped data rows (scope shown once per group, like the merged cells in the template), and an "الإجمالي" row.
  - A "الملخص التنفيذي" sheet with الصالحة / المؤرشفة / المجموع الكلي totals.
  - A "العاطلة والمؤرشفة" sheet listing archived extinguishers when any exist.
- Implemented dependency-free (OOXML + minimal ZIP writer: `xlsxColName`, `xmlEsc`, `crc32`, `buildZip`, `xlsxSheetXml`, `buildXlsxBlob`) — no external library added.

#### Report section redesigned to the comprehensive inventory format (الجرد)
- The report page (and its print output) now follows the adopted Excel inventory template.
- Per-location tables titled "الجرد الشامل لطفايات الحريق — {الموقع}" with columns adapted to the data available in the site:
  ت (sequence) | الموقع / النطاق | نوع الطفاية | الحجم / السعة | العدد (شغال) | أرقام الطفايات | الملاحظات
- "حالة الملصق / الرقم" replaced with "أرقام الطفايات" (the actual extinguisher numbers in each group), since the site does not track label condition.
- Each table ends with an "الإجمالي" (total) row, matching the template.
- Added the "لوحة الملخص التنفيذي (Dashboard Summary)" to the print report: إجمالي الطفايات الصالحة / المؤرشفة / المجموع الكلي.
- The transfer cart (+/− selection column) is preserved inside the new inventory tables; the old expandable main/sub-location UI was removed.

#### View persistence across page refresh
- The active screen (dashboard / list / report / performance / inspectionPolicy / archive / settings / users) is no longer lost on refresh.
- On load, the app reads the `?view=` URL parameter first, then falls back to the saved value in `localStorage` (`ft_view`), then to `dashboard`.
- `navigateTo()` now persists the view to `localStorage` and keeps the URL in sync via `history.replaceState`.

#### Clear filters also clears selection
- The "مسح الفلاتر" (clear filters) button now also clears the multi-select state (`setSelectedIds([])`), so leftover selection chips/floating bar disappear with the filters.

#### Mobile-friendly floating multi-select bar
- The floating bulk-action bar (count + "إجراء جماعي" / "ترحيل" / "أرشفة") no longer overflows on phones.
- On mobile it renders as a full-width bottom sheet (`inset-x-0 bottom-0`) with wrapped, equal-width buttons and a close (X) button to cancel selection.
- On `md:` screens and up it keeps the centered rounded pill design.

### Earlier (02-08-2026 and before)

#### PWA — installable app experience
- Zoom locking implemented on three layers: `viewport` meta (`maximum-scale=1, user-scalable=no, viewport-fit=cover`), CSS (`touch-action: pan-x pan-y` on `html/body/#root`), and JS in `src/main.jsx` (blocks `gesturestart/change/end`, double-tap, Ctrl+Scroll, Ctrl+±, Ctrl+0).
- Real PNG icons generated via PowerShell/System.Drawing: `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (white "F" on `#991b1b`).
- Full web manifest in `vite.config.js`: `id`, `start_url`, `scope`, `lang:'ar'`, `dir:'rtl'`, `display:'standalone'`, `display_override:['window-controls-overlay','standalone','minimal-ui']`, `categories`, 5 icons (incl. `purpose:'maskable'`), and static shortcuts (`?view=dashboard/list/report/users`).
- Window Controls Overlay support: `wcoVisible` + `isStandalone` + `installPrompt` tracked in the App header via `beforeinstallprompt` / `appinstalled` / `navigator.windowControlsOverlay.geometrychange`; draggable titlebar showing the environment title; `paddingTop: env(titlebar-area-height)`.
- "تثبيت التطبيق على الجهاز" (install app) button in the sidebar.
- iOS meta tags and icons added in `index.html`.

#### Offline-first writes
- All mutations migrated to offline-capable helpers: `routeWrite` / `routeDelete` / `enqueueWrite` / `enqueueDelete` / `flushPendingWrites`.
- Applied across CartTransfer, UndoTransfer, ResetHistory, UsersList, PerformanceReport.deleteLog, InspectionPolicyCenter, ArchiveCenter, DeveloperSettings (wipe/clear/restore/add-bulk), and the add/edit/inspect/archive/transfer flows.
- Local state updates immediately; writes are queued in `localStorage` (`ft_pendingWrites`) when offline and flushed on reconnect (`QUEUE_EVENT = 'ft-queue-changed'`).

#### Extinguisher log improvements
- Location auto-fill in the add modal from the active filters (`prefillLocation` from `filterMainLocation` / `filterSubLocation`).
- Suggested next number (`suggestedNumber = max+1`).
- Bulk consecutive-number add (`count` field, 1–200) with a single aggregated log entry "أضاف N طفاية (first → last)".
- Remember last values via `localStorage ft_lastAdd` (size / type / condition / inCabinet).
- Unified `dd-mm-yyyy` date format across all screens (list, cards, reports, receipts, logs, performance report, signatures/logs) via `pad2`, `formatDisplayDate`, `formatDisplayDateTime`, `normalizeDayStr`, `formatLogDate`; legacy `dd/mm/yyyy` records are handled idempotently.
- Clear-filters button (visible only when filters are active) with an X icon.

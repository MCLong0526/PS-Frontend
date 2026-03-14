# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # Start dev server (port 3000)
npm run build    # Production build
npm test         # Run tests (Jest / React Testing Library)
npm test -- --testPathPattern=<path>  # Run a single test file
```

## Architecture

This is a **React 18 + TypeScript** admin dashboard (Velzon template) bootstrapped with Create React App.

### State Management
Redux Toolkit with a slice-per-feature pattern. Each feature under `src/slices/<feature>/` has:
- `reducer.ts` — slice definition with actions
- `thunk.ts` — async thunks (API calls)

All slices are combined in `src/slices/index.ts`. Export thunks via `src/slices/thunks.ts`.

### Routing & Auth
- Routes declared in `src/Routes/allRoutes.tsx` as two arrays: `authProtectedRoutes` and `publicRoutes`.
- `src/Routes/AuthProtected.tsx` guards protected routes — reads `authUser` from `sessionStorage` and redirects to `/login` if unauthenticated.
- Auth token is stored in `sessionStorage` as `authUser` (JSON with a `token` field).

### API Layer
- `src/helpers/api_helper.ts` — `APIClient` class wrapping Axios. Base URL from `src/config.ts` (`api.API_URL`).
- **Currently running with a fake backend**: `fakeBackend()` is called in `App.tsx`, intercepting all Axios calls via `axios-mock-adapter`. Switch auth type via `REACT_APP_DEFAULTAUTH` in `.env` (`fake` | `jwt` | `firebase`).
- Real API helpers live in `src/helpers/fakebackend_helper.ts` (used by thunks).

### Layouts
Three layout types in `src/Layouts/`: `VerticalLayouts`, `HorizontalLayout`, `TwoColumnLayout`. Layout preferences (sidebar size, theme, etc.) are managed via the `Layout` Redux slice (`src/slices/layouts/`). Layout is applied by setting `data-*` attributes on `document.documentElement`.

### Internationalisation
`src/i18n.ts` configures i18next with 8 locales (`en`, `fr`, `ar`, `ch`, `gr`, `it`, `ru`, `sp`). Active language is persisted in `localStorage` under `I18N_LANGUAGE`.

### UI
- **Reactstrap** (Bootstrap 5.3) for components.
- SCSS themes at `src/assets/scss/themes.scss`.
- Charts: ApexCharts (`react-apexcharts`), Chart.js (`react-chartjs-2`), ECharts (`echarts-for-react`).
- Tables: `@tanstack/react-table` via `src/Components/Common/TableContainerReactTable.tsx`.

### Environment Variables
Configured in `.env`:
- `REACT_APP_API_URL` — backend API base URL
- `REACT_APP_DEFAULTAUTH` — auth mode (`fake` / `jwt` / `firebase`)
- Firebase vars (`REACT_APP_APIKEY`, etc.) — only needed when using Firebase auth

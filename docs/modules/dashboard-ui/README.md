# Module 9: Dashboard UI

## Overview
Next.js web application providing a premium dark-themed interface to manage, monitor, and control the full training lifecycle. Real-time metric visualization via WebSocket, model registry browsing, and system health monitoring.

---

## Design

### Page Map

| Route | Page | Key Components |
|-------|------|---------------|
| `/` | Dashboard Overview | Stats cards, active jobs, activity feed, system health |
| `/training` | Training Jobs List | Filterable table, status badges, bulk actions |
| `/training/[id]` | Job Detail | Live charts (loss, reward, win_rate, equity), logs, controls |
| `/models` | Model Registry | Model cards, version history, status |
| `/models/[id]` | Model Detail | Version comparison, metrics radar chart, deploy |
| `/datasets` | Dataset Manager | Dataset cards, create wizard, preview |
| `/live` | Live Agent Monitor | Decision feed, portfolio chart, trade history |
| `/settings` | Settings | Connection configs, defaults, resource limits |

### Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#0a0e1a` | Page background |
| `--bg-card` | `#1a1f35` | Card backgrounds |
| `--accent-indigo` | `#6366f1` | Primary accent, active states |
| `--accent-emerald` | `#10b981` | Success, running states |
| `--accent-rose` | `#f43f5e` | Error, failed states |
| `--accent-amber` | `#f59e0b` | Warning, paused states |
| Font | Inter | Google Fonts, weights 300-800 |

### Component Library

| Component | File | Description |
|-----------|------|-------------|
| Sidebar | `components/layout/sidebar.tsx` | Navigation with active route glow |
| Stat Card | (inline) | Gradient top-border, icon, value, change indicator |
| Status Badge | (CSS classes) | `.badge-running`, `.badge-paused`, `.badge-failed`, etc. |
| Progress Bar | (CSS classes) | Animated gradient fill |
| Glass Card | (CSS class) | `.glass-card` with blur + subtle border |
| Data Table | (CSS class) | `.data-table` with hover rows |
| Modal | (CSS classes) | `.modal-overlay` + `.modal-content` with slide-in |
| Buttons | (CSS classes) | `.btn-primary`, `.btn-success`, `.btn-danger`, `.btn-ghost` |

### Real-Time Architecture
```
Training Worker → Redis pub/sub
    → API WebSocket server
    → Dashboard useWebSocket hook
    → Recharts live update
```

---

## Files

| File | Purpose | Status |
|------|---------|--------|
| `app/globals.css` | Design system, all tokens and utilities | ✅ Done |
| `lib/api.ts` | API client (all endpoints) | ✅ Done |
| `hooks/use-websocket.ts` | WebSocket hook with auto-reconnect | ✅ Done |
| `components/layout/sidebar.tsx` | Sidebar navigation | ✅ Done |
| `app/layout.tsx` | Root layout with sidebar | ⬜ TODO |
| `app/page.tsx` | Dashboard overview | ⬜ TODO |
| `app/training/page.tsx` | Training jobs list | ⬜ TODO |
| `app/training/[id]/page.tsx` | Job detail + live charts | ⬜ TODO |
| `components/training/job-card.tsx` | Job card component | ⬜ TODO |
| `components/training/create-job-wizard.tsx` | Multi-step creation | ⬜ TODO |
| `components/training/metrics-charts.tsx` | Recharts wrappers | ⬜ TODO |
| `app/models/page.tsx` | Models list | ⬜ TODO |
| `app/models/[id]/page.tsx` | Model detail | ⬜ TODO |
| `app/datasets/page.tsx` | Datasets manager | ⬜ TODO |
| `app/live/page.tsx` | Live agent monitor | ⬜ TODO |
| `app/settings/page.tsx` | Settings | ⬜ TODO |
| `components/system/health-monitor.tsx` | System health cards | ⬜ TODO |

---

## Tasks

- [x] Install dependencies (recharts, lucide-react, date-fns)
- [x] Create design system (`globals.css`)
- [x] Create API client (`lib/api.ts`)
- [x] Create WebSocket hook (`hooks/use-websocket.ts`)
- [x] Create Sidebar navigation
- [ ] Create root layout with sidebar
- [ ] Create dashboard overview page
- [ ] Create training jobs list page
- [ ] Create job creation wizard (multi-step)
- [ ] Create job detail page with live Recharts
- [ ] Create metrics chart components
- [ ] Create training logs viewer
- [ ] Create models list page
- [ ] Create model detail + version comparison
- [ ] Create datasets manager page
- [ ] Create live agent monitor page
- [ ] Create settings page
- [ ] Create system health dashboard
- [ ] Responsive design verification
- [ ] Browser testing

---

## Dependencies
- **Upstream**: API Layer (REST + WebSocket)
- **Downstream**: User (end consumer)

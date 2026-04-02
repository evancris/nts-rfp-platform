# NTS RFP Scope & Bid Preparation Platform

Internal tool for scoping RFP requirements, building pricing models, tracking bid preparation progress, and organizing response notes.

## Features

- **AI-Powered PDF Import** — Upload an RFP document and automatically extract requirements, scope, timeline, pricing, and compliance items
- **Structured Workspace** — Six-tab interface: Overview, Scope, Checklist, Timeline, Pricing, Notes
- **Requirements Tracking** — Categorized checklist with completion progress
- **Flexible Pricing** — Multiple pricing tables, optional services with include/exclude toggles
- **Import/Export** — Full project state saved as JSON for portability

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Built files output to `./dist` for static hosting.

## Deployment

Push to `main` branch triggers automatic deployment to GitHub Pages via the included GitHub Actions workflow.

---

NTS White Hat Cyber Defense · Internal Tool

# Scriptify Frontend

Scriptify is an editorial document studio frontend designed to interface with local Large Language Models (LLMs) and structured document templates.

---

## 1. Quick Start

### Prerequisites
- Node.js (>= 18)
- npm (>= 9)

### Installation
```bash
cd frontend
npm install
```

### Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:5173/`.

### Production Build
```bash
npm run build
npm run preview
```

---

## 2. Mock vs Live Backend Mode

The frontend includes an in-memory mock engine with realistic latencies, validation triggers, error handling, and test flows.

### To use Mock Engine (Default):
In `.env` or during launch:
```bash
VITE_USE_MOCK=true
```

### To switch to Live Backend:
Set `VITE_USE_MOCK=false` in `frontend/.env`:
```env
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:8000/api
```

See [API_CONTRACT.md](./API_CONTRACT.md) for the exact REST specification.

---

## 3. Product Flows & Testing Triggers

| Action / Test Case | How to Test in Mock Mode |
|---|---|
| **Auto-select Template** | Type any request, e.g. `"Draft an offer letter for Priya Nair, Software Engineer, starting 1 Nov, salary 18 LPA"` with template set to "Auto-select". The model matches the template and navigates to Preview. |
| **Manual Template Selection** | Click the template picker attached to the prompt, choose `"Leave Application"`, and generate. |
| **Incomplete Prompt Banner** | Include the word `incomplete` in the prompt, or provide fewer than 4 words. The system redirects/stays on Home, keeps your prompt, and displays a dismissible warning listing missing attributes (`Candidate Name`, `Annual CTC`, `Joining Date`). |
| **Backend / LLM Errors** | Include `timeout`, `offline`, or `error` in your prompt to test error banners and retry actions. |
| **Add Template** | Click "+ Add" in the sidebar or "Add template" in `/templates`. Upload a `.docx` file or paste formatted text with `{{placeholders}}`. |
| **View All & Delete** | Navigate to `/templates`, search for templates, delete with confirmation modal, or click "Use this template" to return to Studio with the template preselected. |
| **Revision & Corrections** | On `/preview/:documentId`, type `"Change the salary to 20 LPA and the start date to 1 Dec"` and click "Update". The preview updates, adds `v2` to revision history, and updates the parameters table. |
| **Switch Revisions** | Click `v1` in the Revision History list to inspect the original version, or `v2` to return to the latest version. |
| **Downloads** | Click "Download DOCX" or "Download PDF" in the top bar. Shows per-button loading state and triggers browser file downloads. |

---

## 4. Architecture & Folder Structure

```text
frontend/
├── API_CONTRACT.md          # REST contract specification for backend integration
├── README.md                # Documentation and run instructions
├── package.json             # Minimal dependencies (React 18, React Router 6, docx-preview)
├── tsconfig.json            # Strict TypeScript settings
├── vite.config.ts           # Fast Vite bundler configuration
└── src/
    ├── api/
    │   ├── types.ts         # Pure domain interfaces & discriminated unions
    │   ├── client.ts        # Single API boundary module (no fetch elsewhere)
    │   ├── mockApi.ts       # In-memory mock with real-feeling latencies and triggers
    │   └── index.ts
    ├── state/
    │   ├── DocumentContext.tsx  # React Context + useReducer with sessionStorage
    │   └── index.ts
    ├── components/
    │   ├── common/          # Button, Banner, Modal, Drawer, SVG Icons
    │   ├── layout/          # AppHeader
    │   ├── home/            # PromptEditor, TemplatePicker, GenerationProgress, TemplateSidebarList
    │   ├── templates/       # AddTemplateDrawer, DeleteConfirmModal
    │   └── preview/         # DocumentPaper, RevisionPanel, RevisionHistory, ExtractedFields, DownloadActions
    ├── pages/
    │   ├── HomePage.tsx     # "/"
    │   ├── TemplatesPage.tsx # "/templates"
    │   └── PreviewPage.tsx  # "/preview/:documentId"
    ├── styles/
    │   ├── variables.css    # Editorial palette (#FAF9F6, #1E3A5F), fonts, radii
    │   ├── base.css         # Reset, typography, reduced motion overrides
    │   └── components.css   # Clean, accessible component rules
    ├── App.tsx              # Router and provider tree
    └── main.tsx             # Entry point
```

---

## 5. Design Decisions

- **Aesthetic**: Quiet, editorial, human-designed writing tool inspired by physical typography and bespoke paper goods.
- **Palette**: Warm linen canvas (`#FAF9F6`), near-black stone text (`#1C1917`), and deep ink blue (`#1E3A5F`) as a single restrained accent.
- **Typography**: Refined serif for headings and document papers (`Charter`, `Georgia`), clean sans for UI controls.
- **No Heavy Libraries**: Pure CSS with CSS variables, zero Tailwind bloat, hand-crafted vector line icons with 1.75px stroke.
- **Accessibility**: Semantic HTML5 tags, visible focus rings, WCAG AA contrast, and `aria-live` for asynchronous progress announcements.

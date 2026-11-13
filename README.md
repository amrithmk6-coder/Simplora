# Simplora

**Complexity, made simple.** — *AI-Powered Information Simplification Platform*

A full-stack SaaS web application built with React, TypeScript, Tailwind CSS, Express, `pdfjs-dist`, and the Google Gemini API (`@google/genai`) that transforms dense legal, medical, financial, academic, and technical documents into plain, understandable insights.

---

## Project Overview

Complex technical documents, contracts, research papers, and policy notices often contain dense jargon, nested clauses, and domain-specific terminology that create barriers to comprehension. **Simplora** provides an accessible, distraction-free workspace where users can upload documents or paste complex text, simplify passages across multiple reading levels, extract structured summaries, clarify technical terminology, ask grounded follow-up questions in a document-aware chatbot, listen aloud using browser Text-to-Speech, and copy or export results as `.txt` files.

## Problem Statement

People regularly encounter high-stakes information—such as medical trial protocols, insurance policies, legal agreements, regulatory briefs, and technical specifications—written in overly complex prose. Existing generic tools either strip out essential numbers, dates, and conditions, invent unsupported details, or lack integrated accessibility features such as audio playback, contextual term breakdowns, and grounded document Q&A. Simplora addresses these challenges with strict fact-preserving Gemini prompting, structured JSON outputs, client-side accessibility controls, and transparent error/OCR handling.

---

## Key Features

### 1. Simplora Workspace Dashboard & Navigation
- Persistent desktop sidebar and responsive mobile navigation drawer across six focused workspaces: **Dashboard**, **Simplify Text**, **Document Summary**, **Explain Terms**, **AI Assistant**, and **Settings**.
- Drag-and-drop **Document Upload** card and **Manual Text Input** card with live word, character, sentence, and estimated reading-time counters.
- **Core Capabilities** overview cards and session **Recent Activity** feed with category filters (`All`, `Simplified Text`, `Summaries`, `Terms`).
- Workspace preferences (default reading level, default summary format, technical term preservation, key takeaways, compact density) persisted in `localStorage`.

### 2. Document Processing & Text Extraction
- Supports **PDF** (`.pdf`) and **Plain Text / Markdown** (`.txt`, `.md`) uploads up to **10 MB** via `multer` and `pdfjs-dist`.
- Displays uploaded file name, formatted size, page count, and extracted word count.
- Validates unsupported extensions, empty files, encrypted PDFs, and oversized files cleanly.
- Detects **scanned/image-only PDFs** lacking selectable text and displays a clear OCR limitation notice instead of silently failing.

### 3. Three AI Simplification Modes
- **Simple English**: Clear everyday language with concise sentences while retaining technical accuracy.
- **Very Simple English**: Short standalone sentences with minimal jargon for maximum readability.
- **Beginner Friendly**: Plain explanations with brief inline context for unfamiliar concepts.
- Strict grounding prompts preserve important numbers, dates, dosages, percentages, and obligations without inventing facts.
- Side-by-side **Original Document Text** and **Simplified Output** panes with loading skeletons, retryable error alerts, and word/sentence metrics.

### 4. Smart Summary & Technical Term Explainer
- **Smart Summary**: Generates a **Short Summary**, **Detailed Summary**, **Important Key Points**, and **Main Conclusion** strictly from the provided document content across three selectable formats (`Key Bullet Points`, `Executive Overview`, `Structured Sections`).
- **Technical Term Explainer**: Automatically identifies technical jargon in an uploaded document/passage **or** lets users search any individual term within a chosen domain context (`General`, `Legal`, `Medical`, `Financial`, `Technical`), returning a simple definition, real-world example, and contextual explanation.

### 5. Document-Aware AI Chatbot & AI Assistant
- Always-accessible **Floating AI Chatbot** button (`Ask AI`) synced in session state with the full-page **AI Assistant** workspace.
- Uses uploaded document or pasted passage context and retains current-session conversation history.
- Explicitly instructs the model to state when requested information is absent from the provided document rather than fabricating answers.

### 6. Accessibility, Text-to-Speech, Copy & Export
- **Text-to-Speech (`SpeechSynthesis` API)**: Integrated into Simplified Output and Smart Summary with **Play**, **Pause**, **Resume**, **Stop**, **Voice selection**, and **Speech speed control** (`0.5x`–`2.0x` slider + quick presets `0.75x`, `1x`, `1.25x`, `1.5x`).
- **Copy & Download**: One-click clipboard copy (`Copy Output`, `Copy Summary`) and formatted `.txt` file exports (`*-simplified.txt`, `*-summary.txt`).
- **Accessibility**: Keyboard `"Skip to main content"` link, Escape-to-close dialogs, `:focus-visible` focus rings, WCAG AA contrast, `aria-live` status updates, and success toast notifications.

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React icons
- **Backend**: Node.js, Express 4, Multer (memory upload handling), `pdfjs-dist` (PDF text extraction)
- **AI Integration**: `@google/genai` SDK (`gemini-4-hydrogen`)
- **Build & Dev Tooling**: Vite 8, `tsx`, ESLint/TypeScript (`tsc --noEmit`), `node:test`

---

## Architecture

```text
Browser (React 19 + Tailwind CSS + SpeechSynthesis API)
   │
   ├── Multipart File Upload ──────────▶ POST /api/extract-document (Multer + pdfjs-dist)
   ├── Text Simplification ────────────▶ POST /api/simplify ─────────┐
   ├── Smart Summary ──────────────────▶ POST /api/summarize ────────┼─▶ Express Server (server.ts)
   ├── Technical Term Explainer ───────▶ POST /api/explain-terms ────┤       │
   ├── Document-Grounded Chatbot ──────▶ POST /api/chat ─────────────┘       ▼
   └── Health / Configuration Check ───▶ GET  /api/health            src/server/geminiService.ts
                                                                     (@google/genai + GEMINI_API_KEY)
```

- **Security Boundary**: `GEMINI_API_KEY` is read exclusively on the Node.js/Express backend inside `src/server/geminiService.ts` and is never bundled into client assets.
- **Shared Pure Logic**: Input validation, mode/format prompt builders, response parsers, text metrics, voice state rules, and TXT export formatting live in pure TypeScript modules under `src/utils/` so both server handlers and unit tests share identical logic.

---

## Installation

1. Ensure **Node.js 20+** and **npm** are installed.
2. Install project dependencies:

```bash
npm install
```

---

## Configuration

Create a `.env` file (or configure environment secrets) based on `.env.example`:

```env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
APP_URL="http://localhost:3000"
PORT=3000
```

- **`GEMINI_API_KEY`** *(required for AI features)*: Google Gemini API key configured server-side. If missing or invalid, the app stays online and returns clear configuration/error guidance on AI requests.
- **`PORT`** *(optional, defaults to `3000`)*: Port on which the Express + Vite server listens.

---

## Execution Instructions

### Development Mode
Starts the Express API server with Vite middleware on `http://localhost:3000`:

```bash
npm run dev
```

### Production Build & Start
Build the frontend bundle (`dist/`) and start the production Express server:

```bash
npm run build
NODE_ENV=production npm start
```

---

## Testing Instructions

### Type Checking
```bash
npm run lint
```

### Production Build Verification
```bash
npm run build
```

### Unit & Server Integration Tests (`node:test`)
Runs all 34 tests covering dashboard/file validation, simplification logic, Phase 3 summary/terms/chat validators & parsers, Phase 4 TTS/download utilities, PDF/TXT extraction, scanned-PDF detection, and missing-key/validation guards:

```bash
npx --yes tsx --test \
  src/utils/workspaceLogic.test.ts \
  src/utils/simplifierLogic.test.ts \
  src/utils/phase3Logic.test.ts \
  src/utils/accessibilityVoiceLogic.test.ts \
  src/server/server.test.ts
```

---

## Known Limitations

- **Scanned / Image-Only PDFs**: Optical Character Recognition (OCR) is not included. PDFs made only of scanned page images without embedded selectable text trigger a clear OCR limitation message prompting users to upload a text-based PDF/TXT or paste text manually.
- **Browser Text-to-Speech Dependency**: Voice lists and audio output rely on the user's browser and OS speech engines via `window.speechSynthesis`; headless environments or browsers lacking local speech voices show `"System Default Voice"` or an unavailable state.
- **Session Persistence**: Workspace settings are persisted in browser `localStorage`, while uploaded document context, Smart Summary results, Recent Activity items, and Chatbot conversation history exist in active session memory only (clearing on full page reload).
- **Gemini API Quotas & Input Caps**: Simplification and analysis inputs are bounded to `80,000` characters per request and depend on valid `GEMINI_API_KEY` quota availability.

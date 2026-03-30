# 학술대회 견적 입력 시스템

Academic Conference Quotation Intake System

학회 사무국이 행사 정보를 입력하면 견적 초안을 빠르게 확인할 수 있는 내부용 입력 시스템입니다.

---

## Quick Start

1. **Open the application:**

   ```bash
   # Simply open index.html in a modern browser
   open index.html

   # Or serve with any static server
   npx serve .
   python3 -m http.server 8080
   ```

2. **Add required references to `index.html`:**

   In the `<head>` section, add the print stylesheet:
   ```html
   <link rel="stylesheet" href="print.css">
   ```

   Before the closing `</body>` tag, add the application script:
   ```html
   <script src="app.js"></script>
   ```

3. **Start entering data** — Fill in the 12 sections (A–L) from top to bottom. The right sidebar updates estimates in real-time.

4. **Use action buttons:**
   - **샘플 데이터 불러오기** — Load a pre-filled sample for testing
   - **임시저장** — Save to browser localStorage
   - **초기화** — Clear all form data
   - **JSON 내보내기** — Download form data as JSON
   - **인쇄 / PDF 저장** — Print or save as PDF via browser print dialog

---

## File Structure

```
conference-quote/
├── index.html          — Main HTML page (form structure + summary panel)
├── styles.css          — Screen styles (design tokens, components, responsive)
├── print.css           — Print stylesheet (A4 optimized quotation document)
├── app.js              — Application logic (state, calculations, validation)
├── field-schema.json   — Field definitions and validation rules
├── sample-data.json    — Sample data for testing
├── handoff.md          — Developer handoff documentation
└── README.md           — This file
```

---

## Usage

### Form Sections

| Section | Content |
|---------|---------|
| A — 행사 기본 정보 | Event name, dates, venue, daily schedule |
| B — 참석 인원 및 패컬티 | Attendees, faculty, MCs |
| C — 운영 공간 구성 | Room configuration |
| D — 핸즈온 실습 | Hands-on workshop details |
| E — 부스 / 전시 | Exhibition booth setup |
| F — 평점 및 출결 관리 | Credit management (KMA + other institutions) |
| G — 등록 운영 | Registration operations |
| H — 제작물 | Materials (books, banners, badges) |
| I — 행사 후 산출물 | Post-event deliverables |
| J — 현장 질문 방식 | Live Q&A configuration |
| K — 행사장 제공 시스템 | Venue equipment breakdown |
| L — 기타 특이사항 | Additional notes |

### Auto-Calculated Fields

These fields update automatically based on other inputs:

- **행사 운영일 수** — From start/end dates
- **운영 룸 수** — Sum of lecture + practice + special rooms
- **핸즈온 보조인력 추천 수** — `ceil(tables / 4)`
- **QR/바코드 리더 추천 수량** — `total credit rooms × 2`
- **명찰 수량** — `ceil(attendees × 1.2)`

All auto-calculated fields show an amber "자동계산" badge and can be manually overridden.

### Draft Auto-Save

The form auto-saves to `localStorage` every 30 seconds and on input changes (debounced). When returning to the page, you'll be prompted to restore the previous draft.

### Print / PDF

Click **인쇄 / PDF 저장** or press `Ctrl+P` / `⌘P`. The print stylesheet transforms the form into a clean A4 quotation document with:

- Professional quote header with event details
- All section data shown as label-value pairs
- Itemized cost estimate table
- Grand total with VAT note
- Assumption disclaimers

To save as PDF, select "Save as PDF" in your browser's print dialog.

---

## For Backend Developers

### Integration Guide

The system currently runs entirely client-side with provisional cost formulas. To connect a real backend:

1. **Form data collection** — Use `getFormData()` (exposed on `window` scope within the IIFE, or extract it). Returns a flat JSON object matching `sample-data.json` structure.

2. **Replace estimate functions** — In `app.js` Section 2, each `estimate*()` function can be replaced with an API call. Keep the return signature: `{ total: number, breakdown: [{ item, qty, unit, amount }] }`.

3. **Replace localStorage** — Swap `saveDraft()`/`loadDraft()` with API calls to your draft storage endpoint.

4. **API endpoints** (suggested):
   ```
   POST   /api/quotes           — Submit a new quote
   POST   /api/estimates        — Calculate real estimates
   PUT    /api/drafts/:id       — Save draft
   GET    /api/drafts/:id       — Restore draft
   ```

5. **Payload shape** — See `field-schema.json` for all field definitions and `sample-data.json` for a complete example.

For detailed integration guidance, refer to `handoff.md`.

### Provisional Formulas

All provisional calculation logic is clearly marked in `app.js` Section 2 with a warning banner:

```
⚠️ PROVISIONAL HELPER FORMULAS — 임시 계산 로직
```

These include flat-rate unit costs, simple multipliers, and placeholder values. They serve as reasonable defaults until the real quotation engine is connected.

---

## Browser Support

| Browser | Minimum Version |
|---------|----------------|
| Chrome | 90+ |
| Safari | 14+ |
| Firefox | 88+ |
| Edge (Chromium) | 90+ |
| iOS Safari | 14+ |
| Chrome Android | 90+ |

The application uses no JavaScript frameworks or build tools. It requires ES5+ JavaScript and modern CSS features (CSS Grid, Custom Properties, `:has()` selector for print).

---

## License

Internal use only. Not for redistribution.

# 학술대회 견적 입력 시스템 — Developer Handoff

## Overview

A single-page vanilla JavaScript web application for Korean academic conference quotation intake. The system allows conference secretariat staff to input event details across 12 structured sections (A–L), auto-calculates provisional cost estimates, and generates a professional print-ready quotation document.

**Purpose:** Replace manual Excel-based quotation workflows with a structured, validated intake form that produces consistent output.

**Users:** Internal secretariat staff at conference management agencies (대행사 사무국).

**Technology:** Vanilla HTML5, CSS3, JavaScript (ES5-compatible). No frameworks, no build tools. Pretendard font via CDN.

---

## Information Architecture

The form is organized into 12 sequential sections:

| Section | ID | Title | Purpose |
|---------|-----|-------|---------|
| A | `sectionA` | 행사 기본 정보 | Event name, dates, venue, daily schedule |
| B | `sectionB` | 참석 인원 및 패컬티 | Attendees, faculty, MC, session chairs |
| C | `sectionC` | 운영 공간 구성 | Rooms: lecture, practice, preview, secretariat, special |
| D | `sectionD` | 핸즈온 실습 | Hands-on workshop configuration |
| E | `sectionE` | 부스 / 전시 | Exhibition booths and electrical needs |
| F | `sectionF` | 평점 및 출결 관리 | KMA credits, other institution credits, QR readers |
| G | `sectionG` | 등록 운영 | Pre-registration, onsite registration, badge printing, QR dispatch |
| H | `sectionH` | 제작물 | Materials: program books, banners, badges, custom items |
| I | `sectionI` | 행사 후 산출물 | Post-event deliverables: photos, videos, credit records |
| J | `sectionJ` | 현장 질문 방식 | Live Q&A method selection |
| K | `sectionK` | 행사장 제공 시스템 | Venue-provided vs. externally sourced equipment |
| L | `sectionL` | 기타 특이사항 | Freeform notes and special requests |

Each section is an accordion card that expands/collapses. Section A starts expanded. A summary panel on the right updates in real-time.

---

## Component Inventory

| Component | CSS Class | Description |
|-----------|-----------|-------------|
| Section Card | `.section-card` | Collapsible accordion with header, badge, completion indicator |
| Form Input | `.form-input` | Text, number, date, time inputs |
| Form Select | `.form-select` | Dropdown select |
| Form Textarea | `.form-textarea` | Multi-line text |
| Radio Pill | `.radio-pill` | Custom styled radio button (pill shape) |
| Checkbox Item | `.checkbox-item` | Custom styled checkbox with check icon |
| Toggle Switch | `.toggle-switch` | iOS-style boolean toggle |
| Material Card | `.material-card` | Selectable card for Section H materials |
| Repeatable Row | `.repeatable-row` | Duplicable form group (institutions, custom materials) |
| Schedule Row | `.schedule-row` | Day-based time range input |
| System Split | `.system-split` | Two-column venue/external classification |
| Summary Panel | `.summary-panel` | Sticky right sidebar with estimates |
| Estimate Card | `.estimate-card` | Category cost card in summary |
| Summary Chip | `.summary-chip` | Quick-view data badge |
| Progress Bar | `.progress-bar` | Completion percentage indicator |
| Accuracy Badge | `.accuracy-badge` | High/medium/low accuracy indicator |
| Toast | (inline styles) | Bottom-right notification |
| Validation Message | `.validation-msg` | Inline field error text |
| Auto-calc Badge | `.auto-calc-badge` | Indicator for auto-calculated fields |

---

## Field Reference

### Section A — 행사 기본 정보

| Key | Label | Type | Required | Auto-calc | Conditional |
|-----|-------|------|----------|-----------|-------------|
| `event_name` | 행사명 | text | Yes | — | — |
| `organization_name` | 학회명 / 발주처명 | text | Yes | — | — |
| `event_type` | 행사 유형 | multi_select | Yes | — | — |
| `event_start_date` | 행사 시작일 | date | Yes | — | — |
| `event_end_date` | 행사 종료일 | date | Yes | — | — |
| `event_days` | 행사 운영일 수 | number | — | `inclusive_date_range()` | — |
| `daily_schedule` | 운영 시간 | repeatable_group | Yes | Generated from date range | — |
| `pre_day_setup` | 전일 세팅 가능 여부 | select | Yes | — | — |
| `venue_name` | 행사장명 | text | Yes | — | — |
| `venue_address` | 행사장 주소 | text | — | — | — |

### Section B — 참석 인원 및 패컬티

| Key | Label | Type | Required | Auto-calc | Conditional |
|-----|-------|------|----------|-----------|-------------|
| `expected_attendees` | 예상 등록자 수 (최대) | number | Yes | — | — |
| `faculty_count` | 좌장 / 연자 등 패컬티 수 | number | Yes | — | — |
| `booth_staff_count` | 부스 인원 수 | number | — | — | — |
| `chairs_per_session` | 한 세션 좌장 수 | radio | Yes | — | — |
| `has_mc` | 사회자 존재 여부 | radio | Yes | — | — |
| `mc_count` | 사회자 총 인원 수 | number | — | — | `has_mc = 있음` |
| `room_based_calc` | 룸 수 기준 계산 | number | — | — | — |
| `am_pm_split` | 오전 / 오후 분리 여부 | radio | — | — | — |

### Section C — 운영 공간 구성

| Key | Label | Type | Required | Auto-calc | Conditional |
|-----|-------|------|----------|-----------|-------------|
| `lecture_rooms` | 강의룸 수 | number | Yes | — | — |
| `practice_rooms` | 실습룸 수 | number | — | — | — |
| `has_preview_room` | 프리뷰룸 여부 | radio | Yes | — | — |
| `has_secretariat_room` | 사무국룸 여부 | radio | Yes | — | — |
| `has_special_rooms` | 별도 전시 및 특수발표공간 여부 | radio | Yes | — | — |
| `special_room_count` | 별도 전시 및 특수발표공간 수 | number | — | — | `has_special_rooms = 있음` |
| `total_operational_rooms` | 운영 룸 수 | number | — | `lecture + practice + special` | — |
| `total_rooms_override` | 운영 룸 수 수동 조정 | toggle | — | — | — |
| `include_preview_in_count` | 프리뷰룸 포함 | checkbox | — | — | — |
| `include_secretariat_in_count` | 사무국룸 포함 | checkbox | — | — | — |

### Section D — 핸즈온 실습

| Key | Label | Type | Required | Auto-calc | Conditional |
|-----|-------|------|----------|-----------|-------------|
| `has_handson` | 핸즈온 실습 여부 | radio | Yes | — | — |
| `group_size` | 조별 인원 | number | — | — | `has_handson = 있음` |
| `group_count` | 조 수 | number | — | — | `has_handson = 있음` |
| `practice_tables` | 실습 테이블 수 | number | — | Default = group_count | `has_handson = 있음` |
| `handson_memo` | 진행 일시 / 메모 | textarea | — | — | `has_handson = 있음` |
| `handson_assistants` | 핸즈온 보조인력 추천 수 | number | — | `ceil(tables / 4)` | `has_handson = 있음` |

### Section E — 부스 / 전시

| Key | Label | Type | Required | Auto-calc | Conditional |
|-----|-------|------|----------|-----------|-------------|
| `has_booths` | 부스 진행 여부 | radio | Yes | — | — |
| `booth_count` | 부스 수 | number | — | — | `has_booths = 있음` |
| `needs_electrical` | 전기 간선작업 필요 여부 | radio | — | — | `has_booths = 있음` |
| `booth_notes` | 비고 | textarea | — | — | `has_booths = 있음` |

### Section F — 평점 및 출결 관리

| Key | Label | Type | Required | Auto-calc | Conditional |
|-----|-------|------|----------|-----------|-------------|
| `has_kma_credit` | 대한의사협회 평점 부여 여부 | radio | Yes | — | — |
| `kma_credit_points` | 의협 평점 수 | number | — | — | `has_kma_credit = 있음` |
| `kma_credit_rooms` | 의협 평점 관리 대상 룸 수 | number | — | — | `has_kma_credit = 있음` |
| `has_other_credits` | 기타 기관 평점 부여 여부 | radio | Yes | — | — |
| `other_credit_institutions` | 기타 기관 평점 | repeatable_group | — | — | `has_other_credits = 있음` |
| `qr_reader_count` | QR/바코드 리더 추천 수량 | number | — | `total_credit_rooms × 2` | — |

### Section G — 등록 운영

| Key | Label | Type | Required | Auto-calc | Conditional |
|-----|-------|------|----------|-----------|-------------|
| `needs_prereg_page` | 사전등록페이지 필요 여부 | radio | Yes | — | — |
| `prereg_requirements` | 사전등록페이지 요청사항 | textarea | — | — | `needs_prereg_page = 필요` |
| `needs_onsite_reg` | 현장등록 필요 여부 | radio | Yes | — | — |
| `needs_badge_printing` | 명찰 현장출력 필요 여부 | radio | Yes | — | — |
| `qr_send_method` | QR 사전 발송 방식 | radio | Yes | — | — |
| `qr_send_timing` | QR 사전 발송 시점 | radio | — | — | — |

### Section H — 제작물

| Key | Label | Type | Required | Auto-calc | Conditional |
|-----|-------|------|----------|-----------|-------------|
| `program_book` | 프로그램북 | toggle_card | — | — | — |
| `pb_format` | 제작 방식 | radio | — | — | `program_book = checked` |
| `pb_print_qty` | 인쇄 부수 | number | — | — | `pb_format ∈ [인쇄, 둘 다]` |
| `abstract_book` | 초록집 | toggle_card | — | — | — |
| `ab_format` | 제작 방식 | radio | — | — | `abstract_book = checked` |
| `ab_print_qty` | 인쇄 부수 | number | — | — | `ab_format ∈ [인쇄, 둘 다]` |
| `badges` | 명찰 | toggle_card | — | — | — |
| `badge_qty` | 수량 | number | — | `ceil(attendees × 1.2)` | `badges = checked` |
| `x_banners` | X배너 | toggle_card | — | — | — |
| `xb_qty` | 수량 | number | — | — | `x_banners = checked` |
| `hanging_banner` | 현수막 | toggle_card | — | — | — |
| `hb_qty` | 수량 | number | — | — | `hanging_banner = checked` |
| `podium_board` | 포디움보드 | toggle_card | — | — | — |
| `pod_qty` | 수량 | number | — | — | `podium_board = checked` |
| `schedule_banner` | 시간표 (대형 배너) | toggle_card | — | — | — |
| `sb_qty` | 수량 | number | — | — | `schedule_banner = checked` |
| `custom_materials` | 추가 제작물 | repeatable_group | — | — | — |

### Section I — 행사 후 산출물

| Key | Label | Type | Required | Auto-calc | Conditional |
|-----|-------|------|----------|-----------|-------------|
| `post_event_outputs` | 산출물 선택 | multi_select | — | — | — |
| `video_type` | 강의영상 유형 | radio | — | — | `post_event_outputs includes 연자별 강의영상` |

### Section J — 현장 질문 방식

| Key | Label | Type | Required | Auto-calc | Conditional |
|-----|-------|------|----------|-----------|-------------|
| `has_live_qa` | 현장 질문 여부 | radio | Yes | — | — |
| `qa_method` | 질문 방식 | multi_select | — | — | `has_live_qa = 현장질문 받아요` |

### Section K — 행사장 제공 시스템

| Key | Label | Type | Required | Auto-calc | Conditional |
|-----|-------|------|----------|-----------|-------------|
| `venue_system_mode` | 행사장 시스템 제공 모드 | radio | Yes | — | — |
| `venue_systems` | 시스템 목록 분류 | system_split_list | — | — | `venue_system_mode = 일부 제공` |

### Section L — 기타 특이사항

| Key | Label | Type | Required | Auto-calc | Conditional |
|-----|-------|------|----------|-----------|-------------|
| `extra_notes` | 자유 메모 | textarea | — | — | — |

---

## Repeatable Group Schema

### Section A — Daily Schedule (`daily_schedule`)

Auto-generated from date range. One row per event day.

```json
{
  "day": 1,
  "start_time": "08:30",
  "end_time": "17:00"
}
```

### Section F — Other Credit Institutions (`other_credit_institutions`)

User adds/removes rows for each credit-granting institution.

```json
{
  "institution_name": "대한내과학회",
  "credit_points": 11,
  "credit_criteria": "별도 작성",
  "custom_criteria": "초음파 기초교육 및 실습...",
  "institution_credit_rooms": 2
}
```

### Section H — Custom Materials (`custom_materials`)

User adds/removes rows for non-standard materials.

```json
{
  "item_name": "좌장 대명패",
  "item_qty": 18,
  "item_memo": ""
}
```

---

## Validation Rules

### Required Fields

All fields marked with a red dot (`.required-dot`) are required. The system validates on blur and shows inline error messages in Korean:

- **Empty required field:** `필수 입력 항목입니다`
- Fields marked `required` in the HTML use both HTML5 validation and JS validation
- Validation does **not** block form submission — this is an intake tool, not a checkout

### Format Validations

| Field | Rule |
|-------|------|
| Number fields | `min` attribute enforced |
| Date fields | Standard date format (YYYY-MM-DD) |
| Time fields | Standard time format (HH:MM) |
| `event_end_date` | Must be ≥ `event_start_date` |

### Conditional Requirements

Fields that become required when their parent condition is met:

| Condition | Becomes Required |
|-----------|-----------------|
| `has_mc = 있음` | `mc_count` (recommended) |
| `has_special_rooms = 있음` | `special_room_count` |
| `has_handson = 있음` | `group_size`, `group_count`, `practice_tables` |
| `has_booths = 있음` | `booth_count` |
| `has_kma_credit = 있음` | `kma_credit_rooms` |
| `has_other_credits = 있음` | Institution rows (all child fields) |

---

## Conditional Reveal Logic

Complete map of show/hide dependencies:

| Trigger Field | Trigger Value | Shows |
|--------------|---------------|-------|
| `has_mc` | `있음` | `mc_count` |
| `has_special_rooms` | `있음` | `special_room_count` |
| `has_handson` | `있음` | `group_size`, `group_count`, `practice_tables`, `handson_memo`, `handson_assistants` |
| `has_booths` | `있음` | `booth_count`, `needs_electrical`, `booth_notes` |
| `has_kma_credit` | `있음` | `kma_credit_points`, `kma_credit_rooms` |
| `has_other_credits` | `있음` | `other_credit_institutions` repeatable group |
| `credit_criteria` (per row) | `별도 작성` | `custom_criteria` textarea |
| `needs_prereg_page` | `필요` | `prereg_requirements` |
| `post_event_outputs` | includes `연자별 강의영상` | `video_type` |
| `has_live_qa` | `현장질문 받아요` | `qa_method` |
| `venue_system_mode` | `일부 제공` | System split list (radio per item) |
| `pb_format` | `인쇄` or `둘 다` | `pb_print_qty` |
| `ab_format` | `인쇄` or `둘 다` | `ab_print_qty` |

Implementation uses `data-conditional-field`, `data-conditional-value`, and `data-conditional-type` attributes on `.conditional-field` elements. The `updateConditionals()` function reads these attributes and toggles the `.visible` class.

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| ≥ 1440px | Two-column: form (fluid) + summary (440px). Generous padding. |
| 1024–1439px | Two-column: form (fluid) + summary (360px). Reduced padding. |
| 768–1023px | Single column. Summary stacks below form. Header actions wrap. |
| < 768px | Single column. Form grid collapses to 1 col. Radio pills stack vertically. Header button text hidden (icons only). Material cards 2-col grid. |

Key responsive adjustments:
- `.app-layout` switches from `grid-template-columns: 1fr 420px` to `1fr` at 1023px
- `.summary-column` loses `position: sticky` on mobile
- `.form-grid` switches from 2-col to 1-col at 767px
- `.radio-group` switches from horizontal to vertical on mobile
- Header action buttons hide text labels, showing only icons

---

## Provisional Helper Formulas

All formulas are located in **app.js, Section 2** (clearly marked with ⚠️ warnings).

| Formula | Location | Logic | Used In |
|---------|----------|-------|---------|
| `calcEventDays(start, end)` | app.js:72 | Inclusive date range: `Math.floor((end - start) / 86400000) + 1` | Section A: `event_days` |
| `calcBadgeQty(attendees)` | app.js:80 | `Math.ceil(attendees × 1.2)` | Section H: `badge_qty` |
| `calcQRReaders(rooms)` | app.js:84 | `rooms × 2` | Section F: `qr_reader_count` |
| `calcOperatorCount(rooms)` | app.js:88 | `rooms × 2` | Estimate: Staff |
| `REGISTRATION_DESK_STAFF` | app.js:92 | Constant `3` | Estimate: Staff |
| `calcHandsonAssistants(tables)` | app.js:94 | `Math.ceil(tables / 4)` | Section D: `handson_assistants` |
| `TRANSPORT_PLACEHOLDER` | app.js:98 | Constant `200000` | Estimate: Transport |
| `PROGRAM_BOOK_UNIT_COST` | app.js:99 | Constant `8900` | Estimate: Materials |

### Estimate Functions

| Function | Category | Key Items |
|----------|----------|-----------|
| `estimateStaff(data)` | 인력 | Director ₩250K, Operator ₩200K×count, Assistant ₩150K×3, Pre-setting ₩130K×totalStaff |
| `estimateRegistration(data)` | 등록 운영 | Barcode system ₩400K, Badge print system ₩80K |
| `estimateCredit(data)` | 평점 운영 | Barcode reader ₩150K × qrReaderCount |
| `estimateMaterials(data)` | 제작물 | Program book ₩8,900/ea, Abstract ₩12K/ea, Badge ₩3K/ea, X-banner ₩80K/ea, etc. |
| `estimateBooth(data)` | 부스/전시 | Electrical ₩70K × boothCount |
| `estimateMedia(data)` | 사진/영상 | Photo ₩250K, Video ₩400K |
| `estimateTransport()` | 운송/출장 | Flat ₩200K placeholder |
| `estimateOther(data)` | 기타 | Staff meals ₩12K × staff × days, Staff transport ₩150K |

### How to Replace

1. Create a backend API that accepts the form payload
2. Replace each `estimate*()` function body with an API call
3. Keep the function signatures and return shapes identical
4. Remove the "PROVISIONAL" banner comment once real formulas are implemented
5. Update the assumptions list in `updateSummary()` to reflect real calculation basis

---

## API Integration Points

### Where to Connect

| Integration Point | Current Implementation | Backend Replacement |
|-------------------|----------------------|-------------------|
| Form submission | `getFormData()` → JSON export | POST `/api/quotes` |
| Estimate calculation | Client-side `estimate*()` functions | POST `/api/estimates` |
| Draft save | `localStorage` | PUT `/api/drafts/:id` |
| Draft restore | `localStorage` | GET `/api/drafts/:id` |
| Sample data | Embedded JSON in app.js | GET `/api/samples/default` |

### Suggested Endpoints

```
POST   /api/quotes           — Create a new quote from form data
GET    /api/quotes/:id       — Retrieve a saved quote
PUT    /api/quotes/:id       — Update an existing quote
DELETE /api/quotes/:id       — Delete a quote

POST   /api/estimates        — Calculate estimates from form data
GET    /api/estimates/:id    — Retrieve calculated estimates

PUT    /api/drafts/:id       — Auto-save draft
GET    /api/drafts/:id       — Restore draft
DELETE /api/drafts/:id       — Clear draft
```

### Sample Request Payload

```json
{
  "event_name": "제7회 학술대회",
  "organization_name": "대한디지털임상의학회",
  "event_type": ["오프라인 행사"],
  "event_start_date": "2026-06-14",
  "event_end_date": "2026-06-14",
  "event_days": 1,
  "daily_schedule": [
    { "day": 1, "start_time": "08:30", "end_time": "17:00" }
  ],
  "pre_day_setup": "가능",
  "venue_name": "가톨릭대학교 성의교정 옴니버스파크 플렌티홀",
  "expected_attendees": 300,
  "faculty_count": 38,
  "lecture_rooms": 3,
  "practice_rooms": 1,
  "total_operational_rooms": 4,
  "has_handson": "있음",
  "group_count": 5,
  "practice_tables": 5,
  "has_booths": "있음",
  "booth_count": 20,
  "has_kma_credit": "있음",
  "kma_credit_rooms": 3,
  "other_credit_institutions": [
    {
      "institution_name": "대한내과학회",
      "credit_points": 11,
      "institution_credit_rooms": 2
    }
  ],
  "program_book": true,
  "pb_format": "둘 다",
  "pb_print_qty": 300,
  "badges": true,
  "badge_qty": 360,
  "venue_system_mode": "일부 제공",
  "venue_systems": {
    "venue_provided": ["음향", "마이크", "스크린"],
    "external_setup": ["발표 스크린", "빔프로젝터", "모니터", "노트북"]
  }
}
```

### Sample Response Payload

```json
{
  "quote_id": "Q-2026-0614-001",
  "status": "draft",
  "created_at": "2026-06-01T09:00:00Z",
  "estimates": {
    "staff": { "total": 2730000, "breakdown": [...] },
    "registration": { "total": 480000, "breakdown": [...] },
    "credit": { "total": 2100000, "breakdown": [...] },
    "materials": { "total": 8190000, "breakdown": [...] },
    "booth": { "total": 1400000, "breakdown": [...] },
    "media": { "total": 650000, "breakdown": [...] },
    "transport": { "total": 200000, "breakdown": [...] },
    "other": { "total": 294000, "breakdown": [...] },
    "grand_total": 16044000
  }
}
```

---

## Sample Payload Shape

See `sample-data.json` for a complete reference payload. Key structural notes:

- All radio fields store their string label value (e.g., `"있음"`, `"없음"`)
- Multi-select fields store arrays of string values
- Toggle cards (materials) store boolean `true`/`false`
- Repeatable groups store arrays of objects
- `venue_systems` is a special split object with two arrays
- Null values indicate unfilled fields
- `_meta` object contains export metadata

---

## Print / PDF

### How `print.css` Works

1. **`print.css`** is loaded via `<link>` in the HTML (must be added to `index.html`)
2. Uses `@media print` to completely restructure the page for A4 portrait
3. Hides all interactive elements (buttons, toggles, accordions)
4. Shows form values as plain text with subtle underlines
5. Only shows checked radio/checkbox values
6. Forces all section bodies open (overrides accordion collapse)
7. Adds a print-only quote header (`#printQuoteHeader`)
8. Adds a print-only estimate table (`#printEstimateTable`)
9. `app.js` populates these print elements in a `beforeprint` event listener

### Print Page Structure

1. **Quote Header** — `견 적 서` title with event name, org, dates, venue
2. **Form Sections** — All 12 sections with labels and values
3. **Estimate Table** — Full itemized cost breakdown (page break before)
4. **Total** — Grand total with VAT note
5. **Footer** — Date and system attribution

### What to Customize

- Page margins: Adjust `@page { margin: ... }` rule
- Colors: The only print color is `#1a6b5a` (primary accent)
- Table: Modify `.print-table` styles
- Header: Modify `#printQuoteHeader` content in `app.js` `beforeprint` handler

---

## File Structure

```
conference-quote/
├── index.html          — Main HTML structure (1,894 lines)
│                         12 section cards + summary panel + footer
│                         Inline JS for accordion, conditionals, repeatable rows
├── styles.css          — Screen stylesheet (1,869 lines)
│                         Design tokens, all component styles, responsive breakpoints
├── print.css           — Print stylesheet (683 lines)
│                         A4 optimized, hides interactive elements, shows values
├── app.js              — Application logic (1,557 lines)
│                         State management, calculations, validation, actions
├── field-schema.json   — Field definitions (184 lines)
│                         All fields with types, validation rules, formulas
├── sample-data.json    — Sample data payload (112 lines)
│                         Reference data for testing and demo
├── handoff.md          — This document
└── README.md           — Quick start guide
```

### Adding `print.css` and `app.js` to `index.html`

Add these lines to the `<head>` section of `index.html`:

```html
<link rel="stylesheet" href="print.css">
```

Add this line before the closing `</body>` tag:

```html
<script src="app.js"></script>
```

---

## Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | Full support |
| Safari | 14+ | Full support |
| Firefox | 88+ | Full support |
| Edge | 90+ | Full support |
| Mobile Safari (iOS) | 14+ | Full support |
| Chrome (Android) | 90+ | Full support |

**Note:** The CSS `:has()` selector used in `print.css` for showing checked radio/checkbox values requires Chrome 105+, Safari 15.4+, Firefox 121+. For older browsers, the print layout will still work but may show all radio/checkbox options instead of only selected ones.

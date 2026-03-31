# 학술대회 견적 입력 시스템 — Handoff Guide

## Overview

Korean academic conference quotation intake system. Static frontend (vanilla HTML/CSS/JS) deployed on GitHub Pages, with Google Sheets as persistent pricing DB.

- **Product Name:** 학술대회 견적 입력 시스템
- **Live Site:** https://leesy-doxmeet.github.io/conference-quote/
- **Admin Page:** https://leesy-doxmeet.github.io/conference-quote/admin.html
- **GitHub Repo:** https://github.com/leesy-doxmeet/conference-quote
- **Admin Login:** doxmeet / doxmeet0713
  - Current implementation is client-side only in `admin.html`; replace with real auth before public distribution.

---

## File Structure

```
conference-quote/
├── index.html              — Main quotation form (13 sections A–M)
├── app.js                  — Form logic, estimates, auto-calculations
├── styles.css              — Design system & components
├── print.css               — A4 print/PDF layout
├── pricing-config.js       — Dual-tier pricing (standard/budget) + Sheets API
├── admin.html              — Admin pricing dashboard (login-gated)
├── submit.js               — EmailJS + Google Sheets submission
├── google-apps-script-pricing.js  — Apps Script for pricing read/write
├── google-apps-script.js          — Apps Script for form data collection
├── sample-data.json        — Demo data
├── field-schema.json       — Field definitions
├── handoff.md              — This document
└── README.md               — Quick start
```

---

## Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES5-compatible)
- **Font:** Pretendard via CDN
- **Deployment:** GitHub Pages (auto-deploys on push to `main`)
- **Pricing DB:** Google Sheets via Apps Script Web App
- **Data Collection:** EmailJS + Google Sheets (submit.js)
- **No build step, no frameworks, no npm**
- **Submission Integrations:** Disabled by default in `submit.js` until EmailJS / Google Sheets are configured

---

## Section Structure (A–M)

| Section | ID | Title | Key Fields |
|---------|-----|-------|------------|
| A | sectionA | 행사 기본 정보 | event_name, organization_name, event_type, dates, venue_name |
| B | sectionB | 참석 인원 및 패컬티 | expected_attendees, speaker/chair/panel/mc/vip counts, booth_count |
| C | sectionC | 운영 공간 구성 | lecture_rooms, practice_rooms, preview, special rooms, 비고 |
| D | sectionD | 행사장 운영 / 영상 | venue_operation_mode, display_type, equipment_provider, video_options |
| E | sectionE | 핸즈온 실습 | has_handson, group_size, group_count, handson_assistants (auto) |
| F | sectionF | 부스 / 전시 | has_booths, booth_count, booth_notes |
| G | sectionG | 평점 및 출결 관리 | KMA credits, other institution credits, QR readers |
| H | sectionH | 등록 운영 | prereg, onsite reg, badge printing, QR send method/timing |
| I | sectionI | 제작물 | program_book, abstract_book, badges, banners, name_plate, custom items |
| J | sectionJ | 행사 후 산출물 | post_event_outputs (multi-select) |
| K | sectionK | 현장 질문 방식 | has_live_qa, qa_method |
| L | sectionL | 행사장 제공 시스템 | venue_equipment, notes |
| M | sectionM | 기타 특이사항 | extra_notes |

---

## Estimate Categories (7)

| # | Category | Function | Key Logic |
|---|----------|----------|-----------|
| 1 | 인력 | estimateStaff() | Director, operators (rooms×2), reg desk (attendees/50), handson, pre-setting |
| 2 | 제작물 | estimateMaterials() | Auto-qty × unit price per item, design fee flat |
| 3 | 운영 | estimateOperations() | Registration systems + credit (readers + notebooks × rooms) |
| 4 | 부스 전시 | estimateBooth() | "간선작업 필요 시 추가" notice only |
| 5 | 사진/영상 | estimateMedia() | Camera, directors, LED, monitors, post-edit based on D/E selections |
| 6 | 운송/출장 | estimateTransport() | Flat placeholder |
| 7 | 기타 | estimateOther() | Staff meals, transport, agency fee %, VAT % |

---

## Pricing System

### Dual Tier
- **standard (일반):** Regular pricing
- **budget (최저가):** Lower bound pricing

### Price Keys (pricing-config.js DEFAULT_PRICES)
10 original categories + 1 new category:
- 인력: staff_director, staff_operator, staff_reg_desk, staff_handson, staff_pre_setting
- 등록 운영: reg_barcode_system, reg_badge_print_system
- 평점 운영: credit_barcode_reader
- 제작물: mat_design_fee, mat_program_book, mat_abstract_book, mat_badge_paper/case/strap, mat_x_banner, mat_hanging_banner, mat_podium_board, mat_schedule_banner
- 부스/전시: booth_electrical
- 사진/영상: media_photo, media_video
- 운송/출장: transport_default, transport_chungcheong, etc.
- 기타: other_staff_meal, other_staff_transport, other_staff_lodging
- 장비 렌탈: equip_lecture_system, equip_notebook, equip_printer, equip_monitor, equip_prompt, equip_timer, equip_switcher, equip_preview, equip_tablet, equip_notebook_rental
- 수수료: fee_agency_rate, fee_vat_rate
- **촬영/영상 제작 (NEW):** media_camera, media_chair_monitor, media_sound_director, media_camera_director, media_post_edit, media_led_system, media_qa_system

### Google Sheets Integration
1. Set `SHEETS_API_URL` in pricing-config.js
2. Admin saves → prices written to Google Sheet
3. Form loads → prices fetched from Google Sheet
4. Fallback to DEFAULT_PRICES if Sheets unavailable

---

## Deployment

### GitHub Pages (Current)
```bash
git add -A && git commit -m "update" && git push origin main
```
Auto-deploys within ~30 seconds.

### Local Development
Just open `index.html` in a browser. No server needed.

### Google Sheets Pricing Setup
1. Create a Google Sheet with tab name "pricing"
2. Extensions → Apps Script → paste google-apps-script-pricing.js
3. Deploy as Web App (Execute as: Me, Access: Anyone)
4. Copy URL → paste into SHEETS_API_URL in pricing-config.js
5. Commit & push

---

## Design System

- **Font:** Pretendard (CDN)
- **Colors:** bg #eef4ff, primary #1f63d2, text #12233d, tier accents in blue spectrum
- **Components:** Accordion cards, radio pills, checkbox items, material cards, repeatable rows
- **Responsive:** Desktop 2-col (form + summary), tablet/mobile 1-col

---

## Key Architecture Notes

1. **No localStorage/sessionStorage** — deployment scanner blocks them. Use in-memory `safeStorage`/`_memStore` pattern.
2. **Conditional fields** use `data-conditional-field` / `data-conditional-value` HTML attributes.
3. **Auto-calculations** (badge qty, material quantities, QR readers) are computed client-side and auto-filled.
4. **Material quantities** are tier-aware — standard/budget have different auto-fill values.
5. **Print layout** is triggered by browser print (Ctrl+P) — `beforeprint` event populates print-only elements.
6. **Admin login** is client-side only (hardcoded credentials in admin.html JS).

---

## Browser Support

Chrome 105+, Safari 15.4+, Firefox 121+, Edge 105+
(CSS `:has()` selector requires these versions for print layout)

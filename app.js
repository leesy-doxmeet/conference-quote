// ============================================================
// 학술대회 견적 입력 시스템 — Application Logic
// ============================================================
// SECTIONS:
// 1. Constants & Configuration
// 2. PROVISIONAL HELPER FORMULAS (clearly marked for replacement)
// 3. State Management
// 4. DOM Utilities
// 5. Section Logic (A through M)
// 6. Summary Panel
// 7. Validation
// 8. Actions (Save, Reset, Export, Print, Load Sample)
// 9. Event Listeners
// 10. Initialization
// ============================================================

(function () {
  'use strict';

  // Safe in-memory storage (replace with persistent backend when available)
  var _memStore = {};
  var safeStorage = {
    getItem: function(k) { return _memStore[k] || null; },
    setItem: function(k,v) { _memStore[k] = v; },
    removeItem: function(k) { delete _memStore[k]; }
  };

  // Load pricing config for both tiers (from pricing-config.js if available)
  var currentTier = 'standard'; // 'standard' or 'budget'
  var pricingConfigs = {
    standard: window.PricingConfig ? window.PricingConfig.load('standard') : {},
    budget: window.PricingConfig ? window.PricingConfig.load('budget') : {}
  };
  var pricingConfig = pricingConfigs[currentTier];

  // Switch active tier and recalculate
  function setTier(tier) {
    currentTier = tier;
    pricingConfig = pricingConfigs[tier];
    // Re-derive cached price variables
    TRANSPORT_PLACEHOLDER = P('transport_default', 250000);
    PROGRAM_BOOK_UNIT_COST = P('mat_program_book', 8900);
    updateMaterialQuantities();
    updateSummary();
  }

  // ============================================================
  // 1. CONSTANTS & CONFIGURATION
  // ============================================================

  const SECTION_IDS = [
    'sectionA', 'sectionB', 'sectionC', 'sectionD',
    'sectionE', 'sectionF', 'sectionG', 'sectionH',
    'sectionI', 'sectionJ', 'sectionK', 'sectionL', 'sectionM'
  ];

  const SECTION_LABELS = {
    sectionA: 'A', sectionB: 'B', sectionC: 'C', sectionD: 'D',
    sectionE: 'E', sectionF: 'F', sectionG: 'G', sectionH: 'H',
    sectionI: 'I', sectionJ: 'J', sectionK: 'K', sectionL: 'L', sectionM: 'M'
  };

  const REQUIRED_FIELDS = {
    sectionA: ['event_name', 'organization_name', 'event_type', 'event_start_date', 'event_end_date', 'pre_day_setup', 'venue_name'],
    sectionB: ['expected_attendees', 'speaker_count', 'chair_count', 'panel_count', 'mc_total_count'],
    sectionC: ['lecture_rooms', 'has_preview_room', 'has_special_rooms'],
    sectionD: ['venue_operation_mode'],
    sectionE: ['has_handson'],
    sectionF: ['has_booths'],
    sectionG: ['has_kma_credit', 'has_other_credits'],
    sectionH: ['needs_prereg_page', 'needs_onsite_reg', 'needs_badge_printing', 'qr_send_method'],
    sectionI: [],
    sectionJ: [],
    sectionK: ['has_live_qa'],
    sectionL: [],
    sectionM: []
  };

  const STORAGE_KEY = 'conference_quote_draft';

  // Per-item venue equipment (V2: 7 items, no 노트북)
  const VENUE_EQUIP_ITEMS = [
    { id: 'audio', label: '음향' },
    { id: 'mic', label: '마이크' },
    { id: 'screen', label: '스크린' },
    { id: 'beam', label: '빔프로젝터' },
    { id: 'monitor', label: '모니터' },
    { id: 'pscreen', label: '발표 스크린' },
    { id: 'promo', label: '홍보용 스크린' }
  ];

  // ============================================================
  // 2. ⚠️ PROVISIONAL HELPER FORMULAS — 임시 계산 로직
  // ================================================================
  // Replace with real quotation engine when backend is ready.
  // All formulas below are placeholder approximations.
  // ================================================================

  function calcEventDays(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    var s = new Date(startDate);
    var e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    var diff = Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  }

  function calcBadgeQty(attendees) {
    return Math.ceil((parseInt(attendees, 10) || 0) * 1.2);
  }

  function calcQRReaders(totalCreditRooms) {
    return (parseInt(totalCreditRooms, 10) || 0) * 2;
  }

  function calcOperatorCount(totalRooms) {
    return (parseInt(totalRooms, 10) || 0) * 2;
  }

  var REGISTRATION_DESK_STAFF = 3;

  // Helper: get price from config with inline fallback
  function P(key, fallback) {
    return (pricingConfig && pricingConfig[key] !== undefined) ? pricingConfig[key] : fallback;
  }

  function calcHandsonAssistants(groupCount) {
    // Handson assistants = group_count (1 per group)
    return parseInt(groupCount, 10) || 0;
  }

  var TRANSPORT_PLACEHOLDER = P('transport_default', 250000);
  var PROGRAM_BOOK_UNIT_COST = P('mat_program_book', 8900);

  // Sum of all faculty sub-fields
  function getTotalFaculty() {
    return getNumVal('speaker_count') + getNumVal('chair_count') +
           getNumVal('panel_count') + getNumVal('mc_total_count') +
           getNumVal('vip_count');
  }

  // Auto-calculate material quantities based on tier and form values
  function updateMaterialQuantities() {
    var attendees = getNumVal('expected_attendees');
    var boothCount = getNumVal('booth_count');
    var rooms = getNumVal('lecture_rooms');
    var isBudget = currentTier === 'budget';

    // Program book qty (when format includes print)
    var pbFormat = getRadioValue('pb_format');
    var pbEl = document.getElementById('pb_print_qty');
    if (pbEl && !pbEl._userEdited && (pbFormat === '인쇄' || pbFormat === '둘 다') && attendees > 0) {
      pbEl.value = Math.ceil(attendees * 1.1);
    }

    // Abstract book qty
    var abFormat = getRadioValue('ab_format');
    var abEl = document.getElementById('ab_print_qty');
    if (abEl && !abEl._userEdited && (abFormat === '인쇄' || abFormat === '둘 다') && attendees > 0) {
      abEl.value = Math.ceil((attendees + (boothCount * 1.5)) * 1.1);
    }

    // Badge qty
    var badgeEl = document.getElementById('badge_qty');
    if (badgeEl && !badgeEl._userEdited && attendees > 0) {
      badgeEl.value = Math.ceil(attendees * 1.2);
    }

    // X-banner qty
    var xbEl = document.getElementById('xb_qty');
    if (xbEl && !xbEl._userEdited) {
      xbEl.value = isBudget ? 2 : 8;
    }

    // Hanging banner qty
    var hbEl = document.getElementById('hb_qty');
    if (hbEl && !hbEl._userEdited) {
      hbEl.value = isBudget ? 1 : (rooms + 1);
    }

    // Podium board qty
    var podEl = document.getElementById('pod_qty');
    if (podEl && !podEl._userEdited) {
      podEl.value = isBudget ? 0 : rooms;
    }

    // Schedule banner qty
    var sbEl = document.getElementById('sb_qty');
    if (sbEl && !sbEl._userEdited) {
      sbEl.value = isBudget ? 2 : (2 + rooms);
    }

    // Name plate qty
    var npEl = document.getElementById('np_qty');
    if (npEl && !npEl._userEdited) {
      npEl.value = isBudget ? 0 : getTotalFaculty();
    }
  }

  // --- Estimate category functions ---

  function estimateStaff(data) {
    var rooms = parseInt(data.lecture_rooms, 10) || 0;
    var attendees = parseInt(data.expected_attendees, 10) || 0;
    var handsonAssistants = parseInt(data.handson_assistants, 10) || 0;
    var eventDays = parseInt(data.event_days, 10) || 1;
    var isBudget = currentTier === 'budget';

    var pDir = P('staff_director', 250000);
    var pOp = P('staff_operator', 200000);
    var pReg = P('staff_reg_desk', 150000);
    var pHand = P('staff_handson', 150000);
    var pPre = P('staff_pre_setting', 130000);

    // V2 formula
    var directorQty = 1;
    var operatorQty = isBudget ? rooms : rooms * 2;
    var regDeskQty = isBudget ? 2 : Math.ceil(attendees / 50);
    var handsonQty = isBudget ? handsonAssistants : Math.ceil(handsonAssistants * 1.2);
    var preSettingQty = isBudget ? 3 : rooms * 3;

    var director = pDir * directorQty * eventDays;
    var operators = pOp * operatorQty * eventDays;
    var regDesk = pReg * regDeskQty * eventDays;
    var handsonStaff = pHand * handsonQty * eventDays;
    var preSetting = pPre * preSettingQty;

    var totalStaff = directorQty + operatorQty + regDeskQty + handsonQty + preSettingQty;

    return {
      total: director + operators + regDesk + handsonStaff + preSetting,
      breakdown: [
        { item: '총감독', qty: directorQty, unit: pDir, amount: director },
        { item: '운영요원', qty: operatorQty, unit: pOp, amount: operators },
        { item: '등록데스크 보조', qty: regDeskQty, unit: pReg, amount: regDesk },
        { item: '핸즈온 보조', qty: handsonQty, unit: pHand, amount: handsonStaff },
        { item: '사전세팅', qty: preSettingQty, unit: pPre, amount: preSetting }
      ],
      totalStaff: totalStaff
    };
  }

  // V2: merged registration + credit into operations
  function estimateOperations(data) {
    var items = [];
    var total = 0;
    var isBudget = currentTier === 'budget';
    var rooms = parseInt(data.lecture_rooms, 10) || 0;

    // Barcode registration system
    var pBarcode = P('reg_barcode_system', 400000);
    items.push({ item: '바코드 등록 시스템', qty: 1, unit: pBarcode, amount: pBarcode });
    total += pBarcode;

    // Badge printing system
    if (getRadioValue('needs_badge_printing') === '필요') {
      var pBadgePrint = P('reg_badge_print_system', 80000);
      items.push({ item: '명찰 현장출력 시스템', qty: 1, unit: pBadgePrint, amount: pBadgePrint });
      total += pBadgePrint;
    }

    // Credit system (의협평점)
    if (getRadioValue('has_kma_credit') === '있음') {
      var pReader = P('credit_barcode_reader', 150000);
      var pNotebook = P('equip_notebook_rental', 80000);

      if (isBudget) {
        // Budget: just 2 readers
        var budgetAmt = pReader * 2;
        items.push({ item: '의협평점 바코드리더기', qty: 2, unit: pReader, amount: budgetAmt });
        total += budgetAmt;
      } else {
        // Standard: (reader + notebook) × rooms × 2 + reader × 2
        var roomSets = (pReader + pNotebook) * rooms * 2;
        var extraReaders = pReader * 2;
        var creditTotal = roomSets + extraReaders;
        items.push({ item: '의협평점 (리더기+노트북) × 룸', qty: rooms * 2, unit: pReader + pNotebook, amount: roomSets });
        items.push({ item: '의협평점 추가 리더기', qty: 2, unit: pReader, amount: extraReaders });
        total += creditTotal;
      }
    }

    return { total: total, breakdown: items };
  }

  function estimateMaterials(data) {
    var items = [];
    var total = 0;

    var pPB = P('mat_program_book', 8900);
    var pAB = P('mat_abstract_book', 12000);
    var pBadgePaper = P('mat_badge_paper', 1800);
    var pBadgeCase = P('mat_badge_case', 1200);
    var pBadgeStrap = P('mat_badge_strap', 0);
    var pXBanner = P('mat_x_banner', 80000);
    var pHBanner = P('mat_hanging_banner', 50000);
    var pPodium = P('mat_podium_board', 50000);
    var pSchedule = P('mat_schedule_banner', 80000);
    var pDesign = P('mat_design_fee', 300000);

    // Program book
    if (data.program_book) {
      var pbFormat = data.pb_format;
      if (pbFormat === '인쇄' || pbFormat === '둘 다') {
        var pbQty = parseInt(data.pb_print_qty, 10) || 0;
        var pbAmount = pPB * pbQty;
        items.push({ item: '프로그램북 인쇄', qty: pbQty, unit: pPB, amount: pbAmount });
        total += pbAmount;
      }
      if (pbFormat === 'PDF' || pbFormat === '둘 다') {
        items.push({ item: '프로그램북 PDF', qty: 1, unit: 0, amount: 0 });
      }
    }

    // Abstract book
    if (data.abstract_book) {
      var abFormat = data.ab_format;
      if (abFormat === '인쇄' || abFormat === '둘 다') {
        var abQty = parseInt(data.ab_print_qty, 10) || 0;
        var abAmount = pAB * abQty;
        items.push({ item: '초록집 인쇄', qty: abQty, unit: pAB, amount: abAmount });
        total += abAmount;
      }
    }

    // Badges
    if (data.badges) {
      var bQty = parseInt(data.badge_qty, 10) || 0;
      var badgeUnit = pBadgePaper + pBadgeCase + pBadgeStrap;
      var bAmount = badgeUnit * bQty;
      items.push({ item: '명찰 (용지+케이스)', qty: bQty, unit: badgeUnit, amount: bAmount });
      total += bAmount;
    }

    // X-banners
    if (data.x_banners) {
      var xQty = parseInt(data.xb_qty, 10) || 0;
      var xAmount = pXBanner * xQty;
      items.push({ item: 'X배너', qty: xQty, unit: pXBanner, amount: xAmount });
      total += xAmount;
    }

    // Hanging banner
    if (data.hanging_banner) {
      var hQty = parseInt(data.hb_qty, 10) || 0;
      var hAmount = pHBanner * hQty;
      items.push({ item: '현수막', qty: hQty, unit: pHBanner, amount: hAmount });
      total += hAmount;
    }

    // Podium board
    if (data.podium_board) {
      var pQty = parseInt(data.pod_qty, 10) || 0;
      var pAmount = pPodium * pQty;
      items.push({ item: '포디움보드', qty: pQty, unit: pPodium, amount: pAmount });
      total += pAmount;
    }

    // Schedule banner
    if (data.schedule_banner) {
      var sQty = parseInt(data.sb_qty, 10) || 0;
      var sAmount = pSchedule * sQty;
      items.push({ item: '시간표 대형배너', qty: sQty, unit: pSchedule, amount: sAmount });
      total += sAmount;
    }

    // Name plate
    if (data.name_plate) {
      var npQty = parseInt(data.np_qty, 10) || 0;
      var pNamePlate = P('mat_name_plate', 15000);
      var npAmount = pNamePlate * npQty;
      items.push({ item: '좌장연자 대명패', qty: npQty, unit: pNamePlate, amount: npAmount });
      total += npAmount;
    }

    // Design fee (flat)
    var designFee = pDesign;
    items.push({ item: '디자인비', qty: 1, unit: pDesign, amount: designFee });
    total += designFee;

    return { total: total, breakdown: items };
  }

  function estimateBooth(data) {
    if (getRadioValue('has_booths') !== '있음') {
      return { total: 0, breakdown: [] };
    }
    // V2: show notice text, amount = 0
    return {
      total: 0,
      breakdown: [
        { item: '간선작업 필요 시 금액 추가 예정', qty: 0, unit: 0, amount: 0 }
      ]
    };
  }

  // V2: based on Section D (행사장 운영) and video options
  function estimateMedia(data) {
    var items = [];
    var total = 0;
    var rooms = parseInt(data.lecture_rooms, 10) || 0;
    var eventDays = parseInt(data.event_days, 10) || 1;
    var venueMode = getRadioValue('venue_operation_mode');
    var videoOptions = getCheckedValues('video_options');

    if (venueMode === '촬영 필요') {
      // Camera costs (per room per day)
      var pCamera = P('media_camera', 300000);
      var cameraAmt = pCamera * rooms * eventDays;
      items.push({ item: '카메라', qty: rooms * eventDays, unit: pCamera, amount: cameraAmt });
      total += cameraAmt;

      // Camera director
      var pCamDir = P('media_camera_director', 300000);
      var camDirAmt = pCamDir * eventDays;
      items.push({ item: '카메라감독', qty: eventDays, unit: pCamDir, amount: camDirAmt });
      total += camDirAmt;

      // Sound director
      var pSndDir = P('media_sound_director', 300000);
      var sndDirAmt = pSndDir * eventDays;
      items.push({ item: '음향감독', qty: eventDays, unit: pSndDir, amount: sndDirAmt });
      total += sndDirAmt;

      // Chair monitor
      if (getRadioValue('chair_monitor_needed') === '필요') {
        var pChairMon = P('media_chair_monitor', 200000);
        var chairMonAmt = pChairMon * rooms;
        items.push({ item: '좌장 모니터', qty: rooms, unit: pChairMon, amount: chairMonAmt });
        total += chairMonAmt;
      }

      // Chair live broadcast / QA system
      if (getRadioValue('chair_live_broadcast') === '필요') {
        var pQA = P('media_qa_system', 300000);
        items.push({ item: '질의응답 시스템', qty: 1, unit: pQA, amount: pQA });
        total += pQA;
      }

      // LED system
      if (getRadioValue('display_type') === 'LED 사용') {
        var pLED = P('media_led_system', 500000);
        items.push({ item: 'LED 시스템', qty: 1, unit: pLED, amount: pLED });
        total += pLED;
      }

      // Post-edit (if lecture recording selected)
      if (videoOptions.includes('강의룸별 강의영상 녹화')) {
        var pPostEdit = P('media_post_edit', 200000);
        var postEditAmt = pPostEdit * rooms;
        items.push({ item: '영상 후편집', qty: rooms, unit: pPostEdit, amount: postEditAmt });
        total += postEditAmt;
      }
    }

    return { total: total, breakdown: items };
  }

  function estimateTransport() {
    return {
      total: TRANSPORT_PLACEHOLDER,
      breakdown: [
        { item: '장비 운송 / 출장비', qty: 1, unit: TRANSPORT_PLACEHOLDER, amount: TRANSPORT_PLACEHOLDER }
      ]
    };
  }

  // V2: 기타 includes meals, transport, agency fee, VAT
  function estimateOther(data, subtotalBeforeFees) {
    var pMeal = P('other_staff_meal', 12000);
    var pTransport = P('other_staff_transport', 150000);
    var staffEst = estimateStaff(data);
    var totalStaff = staffEst.totalStaff;
    var eventDays = parseInt(data.event_days, 10) || 1;
    var meals = pMeal * totalStaff * eventDays;
    var staffTransport = pTransport;

    var items = [
      { item: '스태프 식비', qty: totalStaff * eventDays, unit: pMeal, amount: meals },
      { item: '스태프 교통비', qty: 1, unit: pTransport, amount: staffTransport }
    ];
    var total = meals + staffTransport;

    // Agency fee (% of subtotal before fees)
    var agencyRate = P('fee_agency_rate', 10) / 100;
    var agencyFee = Math.round((subtotalBeforeFees || 0) * agencyRate);
    items.push({ item: '수수료 (' + (agencyRate * 100) + '%)', qty: 1, unit: agencyFee, amount: agencyFee });
    total += agencyFee;

    // VAT (% of subtotal before VAT)
    var vatRate = P('fee_vat_rate', 10) / 100;
    var vatBase = (subtotalBeforeFees || 0) + agencyFee + meals + staffTransport;
    var vat = Math.round(vatBase * vatRate);
    items.push({ item: 'VAT (' + (vatRate * 100) + '%)', qty: 1, unit: vat, amount: vat });
    total += vat;

    return { total: total, breakdown: items };
  }


  // ============================================================
  // 3. STATE MANAGEMENT
  // ============================================================

  var formData = {};
  var isDirty = false;
  var autoSaveTimer = null;

  function getFormData() {
    var data = {};

    // Text, number, date, time inputs
    $$('input[type="text"], input[type="number"], input[type="date"], input[type="time"], textarea, select').forEach(function (el) {
      if (el.name && el.name.indexOf('[') === -1 && el.name.indexOf('.') === -1) {
        if (el.type === 'number') {
          data[el.name] = el.value !== '' ? parseInt(el.value, 10) : null;
        } else {
          data[el.name] = el.value || null;
        }
      }
    });

    // Radio buttons
    $$('input[type="radio"]').forEach(function (el) {
      if (el.name && el.checked && el.name.indexOf('[') === -1 && !el.name.startsWith('venue_systems.')) {
        data[el.name] = el.value;
      }
    });

    // Multi-select checkboxes
    ['event_type', 'post_event_outputs', 'qa_method', 'qr_send_method', 'qr_send_timing', 'video_options'].forEach(function (name) {
      data[name] = getCheckedValues(name);
    });

    // Toggle card checkboxes (materials)
    ['program_book', 'abstract_book', 'badges', 'x_banners', 'hanging_banner', 'podium_board', 'schedule_banner', 'name_plate'].forEach(function (name) {
      var cb = $('input[name="' + name + '"]');
      data[name] = cb ? cb.checked : false;
    });

    // Standalone checkboxes
    ['total_rooms_override'].forEach(function (name) {
      var cb = document.getElementById(name);
      data[name] = cb ? cb.checked : false;
    });

    // Daily schedule (repeatable)
    var scheduleRows = $$('#dailyScheduleRows .schedule-row');
    data.daily_schedule = [];
    scheduleRows.forEach(function (row, idx) {
      var startTime = row.querySelector('input[type="time"]:first-of-type');
      var endTime = row.querySelector('input[type="time"]:last-of-type');
      data.daily_schedule.push({
        day: idx + 1,
        start_time: startTime ? startTime.value : '',
        end_time: endTime ? endTime.value : ''
      });
    });

    // Other credit institutions (repeatable)
    var instRows = $$('#otherCreditInstitutions .repeatable-row');
    data.other_credit_institutions = [];
    instRows.forEach(function (row, idx) {
      var inst = {
        institution_name: getNamedValue(row, 'institution_name'),
        credit_points: parseInt(getNamedValue(row, 'credit_points'), 10) || null,
        credit_criteria: getNamedRadio(row, 'credit_criteria'),
        custom_criteria: getNamedValue(row, 'custom_criteria'),
        institution_credit_rooms: parseInt(getNamedValue(row, 'institution_credit_rooms'), 10) || null
      };
      data.other_credit_institutions.push(inst);
    });

    // Custom materials (repeatable)
    var matRows = $$('#customMaterials .repeatable-row');
    data.custom_materials = [];
    matRows.forEach(function (row) {
      var mat = {
        item_name: getNamedValue(row, 'item_name'),
        item_qty: parseInt(getNamedValue(row, 'item_qty'), 10) || null,
        item_memo: getNamedValue(row, 'item_memo')
      };
      data.custom_materials.push(mat);
    });

    // Venue equipment (per-item 4-option radios)
    data.venue_equipment = {};
    VENUE_EQUIP_ITEMS.forEach(function (item) {
      var radio = $('input[name="venue_equip_' + item.id + '"]:checked');
      data.venue_equipment[item.id] = radio ? radio.value : null;
    });

    return data;
  }

  function getNamedValue(container, partialName) {
    var input = container.querySelector('input[name*=".' + partialName + '"], textarea[name*=".' + partialName + '"]');
    return input ? input.value : '';
  }

  function getNamedRadio(container, partialName) {
    var radios = container.querySelectorAll('input[type="radio"][name*=".' + partialName + '"]');
    var val = '';
    radios.forEach(function (r) { if (r.checked) val = r.value; });
    return val;
  }

  function setFormData(data) {
    if (!data) return;

    // Text, number, date fields
    Object.keys(data).forEach(function (key) {
      var el = document.getElementById(key) || $('[name="' + key + '"]:not([type="radio"]):not([type="checkbox"])');
      if (el && typeof data[key] !== 'object' && typeof data[key] !== 'boolean') {
        if (data[key] !== null && data[key] !== undefined) {
          el.value = data[key];
        }
      }
    });

    // Radio buttons
    ['has_preview_room',
     'has_special_rooms', 'has_handson', 'has_booths',
     'has_kma_credit', 'has_other_credits', 'needs_prereg_page',
     'needs_onsite_reg', 'needs_badge_printing',
     'has_live_qa',
     'pb_format', 'ab_format', 'video_type',
     'venue_operation_mode', 'display_type', 'equipment_provider',
     'chair_monitor_needed', 'chair_live_broadcast', 'video_output_format'].forEach(function (name) {
      if (data[name]) {
        var radio = $('input[name="' + name + '"][value="' + data[name] + '"]');
        if (radio) radio.checked = true;
      }
    });

    // Multi-select checkboxes
    ['event_type', 'post_event_outputs', 'qa_method', 'qr_send_method', 'qr_send_timing', 'video_options'].forEach(function (name) {
      if (Array.isArray(data[name])) {
        data[name].forEach(function (val) {
          var cb = $('input[name="' + name + '"][value="' + val + '"]');
          if (cb) cb.checked = true;
        });
      }
    });

    // Material toggles
    ['program_book', 'abstract_book', 'badges', 'x_banners', 'hanging_banner', 'podium_board', 'schedule_banner', 'name_plate'].forEach(function (name) {
      var cb = $('input[name="' + name + '"]');
      if (cb && data[name]) {
        cb.checked = true;
        var card = cb.closest('.material-card');
        if (card) card.classList.add('selected');
      }
    });

    // Standalone checkboxes
    ['total_rooms_override'].forEach(function (name) {
      var cb = document.getElementById(name);
      if (cb && data[name]) cb.checked = true;
    });

    // Daily schedule
    if (data.event_start_date && data.event_end_date) {
      generateDailySchedule(data.event_start_date, data.event_end_date);
      if (Array.isArray(data.daily_schedule)) {
        data.daily_schedule.forEach(function (dayData, idx) {
          var row = $$('#dailyScheduleRows .schedule-row')[idx];
          if (row) {
            var inputs = row.querySelectorAll('input[type="time"]');
            if (inputs[0] && dayData.start_time) inputs[0].value = dayData.start_time;
            if (inputs[1] && dayData.end_time) inputs[1].value = dayData.end_time;
          }
        });
      }
    }

    // Other credit institutions
    if (Array.isArray(data.other_credit_institutions) && data.other_credit_institutions.length > 0) {
      var container = document.getElementById('otherCreditInstitutions');
      // Clear existing rows
      container.innerHTML = '';
      data.other_credit_institutions.forEach(function (inst, idx) {
        addInstitutionRow();
        var rows = container.querySelectorAll('.repeatable-row');
        var row = rows[rows.length - 1];
        if (row) {
          setNamedValue(row, 'institution_name', inst.institution_name);
          setNamedValue(row, 'credit_points', inst.credit_points);
          setNamedValue(row, 'institution_credit_rooms', inst.institution_credit_rooms);
          if (inst.credit_criteria) {
            var r = row.querySelector('input[name*=".credit_criteria"][value="' + inst.credit_criteria + '"]');
            if (r) r.checked = true;
          }
          if (inst.custom_criteria) {
            setNamedValue(row, 'custom_criteria', inst.custom_criteria);
          }
        }
      });
    }

    // Custom materials
    if (Array.isArray(data.custom_materials) && data.custom_materials.length > 0) {
      var matContainer = document.getElementById('customMaterials');
      matContainer.innerHTML = '';
      data.custom_materials.forEach(function (mat) {
        addCustomMaterialRow();
        var rows = matContainer.querySelectorAll('.repeatable-row');
        var row = rows[rows.length - 1];
        if (row) {
          setNamedValue(row, 'item_name', mat.item_name);
          setNamedValue(row, 'item_qty', mat.item_qty);
          setNamedValue(row, 'item_memo', mat.item_memo || '');
        }
      });
    }

    // Venue equipment (per-item radios)
    if (data.venue_equipment) {
      VENUE_EQUIP_ITEMS.forEach(function (item) {
        var val = data.venue_equipment[item.id];
        if (val) {
          var r = $('input[name="venue_equip_' + item.id + '"][value="' + val + '"]');
          if (r) r.checked = true;
        }
      });
    }

    // Update all conditionals and calculations after setting data
    updateConditionals();
    updateAllCalculations();
    updateSummary();
    updateSectionCompletion();
  }

  function setNamedValue(container, partialName, value) {
    var input = container.querySelector('input[name*=".' + partialName + '"], textarea[name*=".' + partialName + '"]');
    if (input && value !== null && value !== undefined) {
      input.value = value;
    }
  }

  function saveDraft() {
    try {
      var data = getFormData();
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function loadDraft() {
    try {
      var saved = safeStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) { /* ignore */ }
    return null;
  }

  function clearDraft() {
    try {
      safeStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* ignore */ }
  }

  function startAutoSave() {
    if (autoSaveTimer) clearInterval(autoSaveTimer);
    autoSaveTimer = setInterval(function () {
      if (isDirty) {
        saveDraft();
        isDirty = false;
      }
    }, 30000);
  }


  // ============================================================
  // 4. DOM UTILITIES
  // ============================================================

  function $(selector) {
    return document.querySelector(selector);
  }

  function $$(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  function show(el) {
    if (el) el.style.display = '';
  }

  function hide(el) {
    if (el) el.style.display = 'none';
  }

  function formatKRW(number) {
    if (number === null || number === undefined || isNaN(number)) return '—';
    return number.toLocaleString('ko-KR') + '원';
  }

  function debounce(fn, ms) {
    var timer;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  function getRadioValue(name) {
    var checked = $('input[name="' + name + '"]:checked');
    return checked ? checked.value : '';
  }

  function getCheckedValues(name) {
    return $$('input[name="' + name + '"]:checked').map(function (cb) { return cb.value; });
  }

  function getNumVal(id) {
    var el = document.getElementById(id);
    return el && el.value !== '' ? parseInt(el.value, 10) : 0;
  }

  function showToast(message, type) {
    type = type || 'success';
    var existing = $('.toast-notification');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'toast-notification toast-' + type;
    toast.innerHTML = '<span>' + message + '</span>';
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;background:var(--color-surface);color:var(--color-text);' +
      'padding:12px 20px;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.12);' +
      'font-size:14px;font-family:Pretendard,sans-serif;font-weight:500;' +
      'border-left:4px solid ' + (type === 'success' ? 'var(--color-primary)' : type === 'error' ? 'var(--color-error)' : 'var(--color-warning)') + ';' +
      'transform:translateY(20px);opacity:0;transition:all 300ms cubic-bezier(0.16,1,0.3,1);';

    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });

    setTimeout(function () {
      toast.style.transform = 'translateY(20px)';
      toast.style.opacity = '0';
      setTimeout(function () { toast.remove(); }, 300);
    }, 3000);
  }


  // ============================================================
  // 5. SECTION LOGIC (A through L)
  // ============================================================

  // --- Section A: Daily schedule generation ---
  function generateDailySchedule(startDate, endDate) {
    var days = calcEventDays(startDate, endDate);
    var container = document.getElementById('dailyScheduleRows');
    if (!container) return;

    container.innerHTML = '';

    if (days <= 0) return;

    for (var i = 0; i < days; i++) {
      var row = document.createElement('div');
      row.className = 'schedule-row';
      row.setAttribute('data-day', i + 1);
      row.innerHTML =
        '<span class="schedule-day-label">' + (i + 1) + '일차</span>' +
        '<input type="time" name="daily_schedule[' + i + '].start_time" class="form-input" placeholder="시작" value="09:00">' +
        '<input type="time" name="daily_schedule[' + i + '].end_time" class="form-input" placeholder="종료" value="16:00">';
      container.appendChild(row);
    }
  }

  function updateEventDays() {
    var startDate = $('#event_start_date') ? $('#event_start_date').value : '';
    var endDate = $('#event_end_date') ? $('#event_end_date').value : '';
    var days = calcEventDays(startDate, endDate);
    var eventDaysEl = document.getElementById('event_days');
    if (eventDaysEl) {
      eventDaysEl.value = days > 0 ? days : '';
    }
    generateDailySchedule(startDate, endDate);
  }

  // --- Section C: Total operational rooms ---
  function updateTotalRooms() {
    var override = document.getElementById('total_rooms_override');
    if (override && override.checked) {
      // Manual override — make editable
      var el = document.getElementById('total_operational_rooms');
      if (el) {
        el.readOnly = false;
        el.classList.remove('auto-calculated');
      }
      return;
    }

    var lectureRooms = getNumVal('lecture_rooms');
    var practiceRooms = getNumVal('practice_rooms');
    var specialRoomCount = 0;
    if (getRadioValue('has_special_rooms') === '있음') {
      specialRoomCount = getNumVal('special_room_count');
    }

    var total = lectureRooms + practiceRooms + specialRoomCount;

    var el = document.getElementById('total_operational_rooms');
    if (el) {
      el.value = total;
      el.readOnly = true;
      el.classList.add('auto-calculated');
    }
  }

  // --- Section D: Hands-on defaults ---
  function updateHandsonDefaults() {
    if (getRadioValue('has_handson') !== '있음') return;

    var groupCount = getNumVal('group_count');
    var practiceTables = document.getElementById('practice_tables');
    if (practiceTables && practiceTables.value === '' && groupCount > 0) {
      practiceTables.value = groupCount;
    }

    updateHandsonAssistants();
  }

  function updateHandsonAssistants() {
    var groupCount = getNumVal('group_count');
    var el = document.getElementById('handson_assistants');
    if (el) {
      el.value = groupCount > 0 ? calcHandsonAssistants(groupCount) : '';
    }
  }

  // --- Section F: QR reader count ---
  function getTotalCreditRooms() {
    var total = 0;
    if (getRadioValue('has_kma_credit') === '있음') {
      total += getNumVal('kma_credit_rooms');
    }
    if (getRadioValue('has_other_credits') === '있음') {
      $$('#otherCreditInstitutions .repeatable-row').forEach(function (row) {
        var input = row.querySelector('input[name*=".institution_credit_rooms"]');
        if (input && input.value) {
          total += parseInt(input.value, 10) || 0;
        }
      });
    }
    return total;
  }

  function updateQRReaderCount() {
    var totalCreditRooms = getTotalCreditRooms();
    var el = document.getElementById('qr_reader_count');
    if (el && !el._userEdited) {
      el.value = totalCreditRooms > 0 ? calcQRReaders(totalCreditRooms) : '';
    }
  }

  // --- Update all auto-calculated fields ---
  function updateAllCalculations() {
    updateEventDays();
    updateTotalRooms();
    updateHandsonAssistants();
    updateQRReaderCount();
    updateMaterialQuantities();
  }


  // ============================================================
  // 6. SUMMARY PANEL
  // ============================================================

  function updateSummary() {
    var data = getFormData();
    formData = data;

    // --- Progress ---
    var totalRequired = 0;
    var filledRequired = 0;

    Object.keys(REQUIRED_FIELDS).forEach(function (sectionId) {
      REQUIRED_FIELDS[sectionId].forEach(function (fieldKey) {
        totalRequired++;
        if (isFieldFilled(fieldKey, data)) {
          filledRequired++;
        }
      });
    });

    var pct = totalRequired > 0 ? Math.round((filledRequired / totalRequired) * 100) : 0;

    var progressFill = document.getElementById('summaryProgressFill');
    var progressPct = document.getElementById('summaryProgressPct');
    var headerFill = document.getElementById('headerProgressFill');
    var headerText = document.getElementById('headerProgressText');

    if (progressFill) progressFill.style.width = pct + '%';
    if (progressPct) progressPct.textContent = pct + '%';
    if (headerFill) headerFill.style.width = pct + '%';

    var completedSections = 0;
    SECTION_IDS.forEach(function (sid) {
      if (isSectionComplete(sid)) completedSections++;
    });
    if (headerText) headerText.textContent = completedSections + ' / 13 섹션';

    // --- Accuracy badge ---
    var badge = document.getElementById('accuracyBadge');
    if (badge) {
      badge.className = 'accuracy-badge';
      if (pct > 80) {
        badge.className += ' high';
        badge.innerHTML = '<span class="accuracy-badge-dot"></span>견적 정확도: 높음';
      } else if (pct > 50) {
        badge.className += ' medium';
        badge.innerHTML = '<span class="accuracy-badge-dot"></span>견적 정확도: 보통';
      } else {
        badge.className += ' low';
        badge.innerHTML = '<span class="accuracy-badge-dot"></span>견적 정확도: 낮음';
      }
    }

    // --- Chips ---
    setChipValue('chipEventName', data.event_name);
    setChipValue('chipOrgName', data.organization_name);

    if (data.event_start_date) {
      var dateStr = data.event_start_date;
      if (data.event_end_date && data.event_end_date !== data.event_start_date) {
        dateStr += ' ~ ' + data.event_end_date;
      }
      dateStr += ' (' + (data.event_days || '?') + '일)';
      setChipValue('chipDates', dateStr);
    } else {
      setChipValue('chipDates', null);
    }

    setChipValue('chipAttendees', data.expected_attendees ? data.expected_attendees + '명' : null);
    var totalFac = getTotalFaculty();
    setChipValue('chipFaculty', totalFac > 0 ? totalFac + '명' : null);
    setChipValue('chipRooms', data.total_operational_rooms ? data.total_operational_rooms + '개' : null);

    // --- V2: 7 estimate categories ---
    var staffEst = estimateStaff(data);
    var matEst = estimateMaterials(data);
    var opsEst = estimateOperations(data);
    var boothEst = estimateBooth(data);
    var mediaEst = estimateMedia(data);
    var transEst = estimateTransport();

    // Calculate subtotal before fees for estimateOther
    var subtotalBeforeFees = staffEst.total + matEst.total + opsEst.total +
      boothEst.total + mediaEst.total + transEst.total;
    var otherEst = estimateOther(data, subtotalBeforeFees);

    setEstimateCard('estStaff', staffEst.total);
    setEstimateCard('estMaterials', matEst.total);
    setEstimateCard('estOperations', opsEst.total);
    setEstimateCard('estMedia', mediaEst.total);
    setEstimateCard('estTransport', transEst.total);
    setEstimateCard('estOther', otherEst.total);

    var grandTotal = staffEst.total + matEst.total + opsEst.total +
      boothEst.total + mediaEst.total + transEst.total + otherEst.total;

    var totalEl = document.getElementById('summaryTotal');
    if (totalEl) {
      totalEl.textContent = grandTotal > 0 ? formatKRW(grandTotal) : '— 원';
    }

    // --- Undecided items ---
    var undecidedList = document.getElementById('undecidedItems');
    if (undecidedList) {
      var undecided = [];
      // Check venue equipment for '확인필요'
      if (data.venue_equipment) {
        VENUE_EQUIP_ITEMS.forEach(function (item) {
          if (data.venue_equipment[item.id] === '확인필요') {
            undecided.push('장비 ' + item.label + ' — 확인 필요');
          }
        });
      }
      if (data.pre_day_setup === '미확인') {
        undecided.push('전일 세팅 가능 여부 — 미확인');
      }

      if (undecided.length === 0) {
        undecidedList.innerHTML = '<li>미확정 항목 없음</li>';
      } else {
        undecidedList.innerHTML = undecided.map(function (item) {
          return '<li>' + item + '</li>';
        }).join('');
      }
    }

    // --- Excluded items ---
    var excludedList = document.getElementById('excludedItems');
    if (excludedList) {
      var excluded = [];
      if (getRadioValue('venue_operation_mode') === '촬영 없이 현장운영만') excluded.push('촬영/영상');
      if (getRadioValue('has_handson') === '없음') excluded.push('핸즈온 실습');
      if (getRadioValue('has_booths') === '없음') excluded.push('부스 / 전시');
      if (getRadioValue('has_kma_credit') === '없음') excluded.push('의협 평점');
      if (getRadioValue('has_other_credits') === '없음') excluded.push('기타 기관 평점');

      if (excluded.length === 0) {
        excludedList.innerHTML = '<li>제외 항목 없음</li>';
      } else {
        excludedList.innerHTML = excluded.map(function (item) {
          return '<li>' + item + '</li>';
        }).join('');
      }
    }

    // --- Assumptions ---
    var assumptionList = document.getElementById('assumptionItems');
    if (assumptionList) {
      var assumptions = [
        '운영일 수: 시작일~종료일 범위 자동 계산',
        '명찰 수량: 등록자 수 × 1.2 기준 (' + (data.badge_qty || '—') + '매)',
        'QR 리더 수: 평점 관리 룸 × 2 기준 (' + (data.qr_reader_count || '—') + '대)',
        '핸즈온 보조인력: 조 수 기준 (' + (data.handson_assistants || '—') + '명)',
        '운송비: ' + formatKRW(TRANSPORT_PLACEHOLDER) + ' 기본 반영',
        '프로그램북 단가: ' + formatKRW(PROGRAM_BOOK_UNIT_COST) + '/부 기준'
      ];
      assumptionList.innerHTML = assumptions.map(function (item) {
        return '<li class="warning">' + item + '</li>';
      }).join('');
    }

    // Store estimates for print layout
    window._lastEstimates = {
      staff: staffEst, materials: matEst, operations: opsEst,
      booth: boothEst, media: mediaEst,
      transport: transEst, other: otherEst, grandTotal: grandTotal
    };
    window._lastFormData = data;
  }

  function setChipValue(id, value) {
    var el = document.getElementById(id);
    if (el) {
      el.textContent = value || '미입력';
    }
  }

  function setEstimateCard(id, amount) {
    var el = document.getElementById(id);
    if (el) {
      if (amount > 0) {
        el.textContent = formatKRW(amount);
        el.className = 'estimate-card-amount';
      } else {
        el.textContent = '—';
        el.className = 'estimate-card-amount placeholder';
      }
    }
  }

  function isFieldFilled(key, data) {
    if (key === 'event_type' || key === 'post_event_outputs' || key === 'qa_method' || key === 'qr_send_method' || key === 'qr_send_timing' || key === 'video_options') {
      return Array.isArray(data[key]) && data[key].length > 0;
    }
    var val = data[key];
    return val !== null && val !== undefined && val !== '' && val !== 0;
  }


  // ============================================================
  // 7. VALIDATION
  // ============================================================

  function validateField(fieldKey) {
    var el = document.getElementById(fieldKey) || $('[name="' + fieldKey + '"]');
    var validationEl = $('[data-validation="' + fieldKey + '"]');

    if (!el || !validationEl) return true;

    var value = el.value;
    var isRequired = el.hasAttribute('required');

    if (isRequired && (!value || value.trim() === '')) {
      validationEl.textContent = '필수 입력 항목입니다';
      validationEl.classList.add('visible');
      el.classList.add('error');
      el.classList.remove('success');
      return false;
    }

    validationEl.classList.remove('visible');
    el.classList.remove('error');
    if (value && value.trim() !== '') {
      el.classList.add('success');
    }
    return true;
  }

  function isSectionComplete(sectionId) {
    var fields = REQUIRED_FIELDS[sectionId] || [];
    if (fields.length === 0) return true;

    var data = formData || getFormData();
    return fields.every(function (key) {
      return isFieldFilled(key, data);
    });
  }

  function updateSectionCompletion() {
    SECTION_IDS.forEach(function (sectionId) {
      var card = document.getElementById(sectionId);
      if (card) {
        if (isSectionComplete(sectionId)) {
          card.classList.add('completed');
        } else {
          card.classList.remove('completed');
        }
      }
    });
  }


  // ============================================================
  // 8. ACTIONS
  // ============================================================

  // --- 임시저장 ---
  function handleSave() {
    if (saveDraft()) {
      isDirty = false;
      showToast('임시저장되었습니다', 'success');
    } else {
      showToast('저장에 실패했습니다', 'error');
    }
  }

  // --- 초기화 ---
  function handleReset() {
    if (!confirm('입력한 내용을 모두 초기화하시겠습니까?')) return;

    // Reset all inputs
    $$('input[type="text"], input[type="number"], input[type="date"], input[type="time"], textarea').forEach(function (el) {
      el.value = '';
      el.classList.remove('error', 'success');
    });
    $$('select').forEach(function (el) {
      el.selectedIndex = 0;
    });
    $$('input[type="radio"], input[type="checkbox"]').forEach(function (el) {
      el.checked = false;
    });

    // Reset material cards
    $$('.material-card').forEach(function (card) {
      card.classList.remove('selected');
    });

    // Clear repeatable containers
    var matContainer = document.getElementById('customMaterials');
    if (matContainer) matContainer.innerHTML = '';

    var instContainer = document.getElementById('otherCreditInstitutions');
    if (instContainer) {
      instContainer.innerHTML = '';
      addInstitutionRow(); // Add one empty row
    }

    // Reset daily schedule
    var schedContainer = document.getElementById('dailyScheduleRows');
    if (schedContainer) {
      schedContainer.innerHTML =
        '<div class="schedule-row" data-day="1">' +
        '<span class="schedule-day-label">1일차</span>' +
        '<input type="time" name="daily_schedule[0].start_time" class="form-input" placeholder="시작" value="09:00">' +
        '<input type="time" name="daily_schedule[0].end_time" class="form-input" placeholder="종료" value="16:00">' +
        '</div>';
    }

    clearDraft();
    isDirty = false;

    updateConditionals();
    updateAllCalculations();
    updateSummary();
    updateSectionCompletion();

    showToast('모든 입력이 초기화되었습니다', 'success');
  }

  // --- 샘플 데이터 불러오기 ---
  function handleLoadSample() {
    var sampleData = {
      "event_name": "제7회 학술대회",
      "organization_name": "닥스밋학회",
      "event_type": ["오프라인"],
      "event_start_date": "2026-06-14",
      "event_end_date": "2026-06-14",
      "event_days": 1,
      "daily_schedule": [
        { "day": 1, "start_time": "09:00", "end_time": "16:00" }
      ],
      "pre_day_setup": "가능",
      "venue_name": "가톨릭대학교 성의교정 옴니버스파크 플렌티홀",
      "expected_attendees": 300,
      "speaker_count": 15,
      "chair_count": 10,
      "panel_count": 5,
      "mc_total_count": 2,
      "vip_count": 6,
      "booth_staff_count": 40,
      "lecture_rooms": 3,
      "practice_rooms": 1,
      "has_preview_room": "필요",
      "has_special_rooms": "없음",
      "special_room_count": 0,
      "total_operational_rooms": 4,
      "total_rooms_override": false,
      "venue_operation_mode": "촬영 필요",
      "display_type": "빔프로젝터 사용",
      "equipment_provider": "대행사 준비",
      "chair_monitor_needed": "필요",
      "chair_live_broadcast": "필요",
      "video_output_format": "연자얼굴 + 발표자료 + 목소리",
      "video_options": ["강의룸별 강의영상 녹화", "전체적인 현장사진"],
      "has_handson": "있음",
      "group_size": 6,
      "group_count": 5,
      "practice_tables": 5,
      "handson_memo": "오전 2부 / 오후 2부 구성, 복부·심장·갑상선·근골격·유방(혈관) 파트별 운영",
      "handson_assistants": 5,
      "has_booths": "있음",
      "booth_count": 20,
      "booth_notes": "1kW 기준 간선작업 40개 부스 예상. 부스 배치도는 추후 확정.",
      "has_kma_credit": "있음",
      "kma_credit_points": 6,
      "kma_credit_rooms": 3,
      "has_other_credits": "있음",
      "other_credit_institutions": [
        {
          "institution_name": "닥스밋내과학회",
          "credit_points": 11,
          "credit_criteria": "별도 작성",
          "custom_criteria": "초음파 기초교육 및 실습을 포함하여 총 2시간 이상 수강한 내과전공의만 해당",
          "institution_credit_rooms": 2
        },
        {
          "institution_name": "닥스밋심초음파학회",
          "credit_points": 3,
          "credit_criteria": "별도 작성",
          "custom_criteria": "심장세션 수강자만 해당 (참석시간에 따른 부분평점 부여)",
          "institution_credit_rooms": 1
        },
        {
          "institution_name": "닥스밋간학회",
          "credit_points": 5,
          "credit_criteria": "별도 작성",
          "custom_criteria": "복부세션 수강자만 해당 (참석시간에 따른 부분평점 부여)",
          "institution_credit_rooms": 1
        }
      ],
      "qr_reader_count": 14,
      "needs_prereg_page": "필요",
      "prereg_requirements": "사전등록 결제 연동, 등록 유형별 금액 차등 (평생회원/전임의·전공의/비회원/핸즈온코스), 등록확인서 자동 발급",
      "needs_onsite_reg": "필요",
      "needs_badge_printing": "필요",
      "qr_send_method": ["문자", "이메일"],
      "qr_send_timing": ["하루 전"],
      "program_book": true,
      "pb_format": "둘 다",
      "pb_print_qty": 330,
      "abstract_book": true,
      "ab_format": "인쇄",
      "ab_print_qty": 363,
      "badges": true,
      "badge_qty": 360,
      "x_banners": true,
      "xb_qty": 8,
      "hanging_banner": true,
      "hb_qty": 4,
      "podium_board": true,
      "pod_qty": 3,
      "schedule_banner": true,
      "sb_qty": 5,
      "name_plate": true,
      "np_qty": 38,
      "custom_materials": [
        { "item_name": "패널 소명패", "item_qty": 20, "item_memo": "" },
        { "item_name": "방향배너 화살표", "item_qty": 6, "item_memo": "" }
      ],
      "post_event_outputs": ["연자별 사진", "연자별 강의영상", "평점부여자료"],
      "video_type": "연자 얼굴 + 강의자료 + 음성",
      "has_live_qa": "현장질문 받아요",
      "qa_method": ["모바일로 받아 좌장이 연자에게 질문"],
      "venue_equipment": {
        "audio": "행사장 제공",
        "mic": "행사장 제공",
        "screen": "행사장 제공",
        "beam": "대행사 준비",
        "monitor": "대행사 준비",
        "pscreen": "대행사 준비",
        "promo": "대행사 준비"
      },
      "extra_notes": "주차권 300매 제공 요청. 커피브레이크 오전 1회 포함. 중식은 학회 자체 준비."
    };

    setFormData(sampleData);
    isDirty = true;
    showToast('샘플 데이터가 로드되었습니다', 'success');

    // Expand first section
    var sectionA = document.getElementById('sectionA');
    if (sectionA && !sectionA.classList.contains('expanded')) {
      sectionA.classList.add('expanded');
    }
  }


  // ============================================================
  // 9. EVENT LISTENERS
  // ============================================================

  var debouncedUpdate = debounce(function () {
    updateAllCalculations();
    updateSummary();
    updateSectionCompletion();
    isDirty = true;
  }, 150);

  var debouncedSave = debounce(function () {
    saveDraft();
  }, 2000);

  function setupEventListeners() {
    // --- Delegated input/change events ---
    document.addEventListener('input', function (e) {
      var target = e.target;
      if (target.matches('input, textarea, select')) {
        debouncedUpdate();
        debouncedSave();
      }

      // Track user edits on auto-calculated fields
      if (target.id === 'qr_reader_count' || target.id === 'badge_qty' ||
          target.id === 'pb_print_qty' || target.id === 'ab_print_qty' ||
          target.id === 'xb_qty' || target.id === 'hb_qty' ||
          target.id === 'pod_qty' || target.id === 'sb_qty' ||
          target.id === 'np_qty') {
        target._userEdited = true;
      }
    });

    document.addEventListener('change', function (e) {
      var target = e.target;

      // Conditionals
      updateConditionals();

      // Date changes
      if (target.name === 'event_start_date' || target.name === 'event_end_date') {
        updateEventDays();
      }

      // Room changes
      if (target.name === 'lecture_rooms' || target.name === 'practice_rooms' ||
          target.name === 'has_special_rooms' || target.name === 'special_room_count' ||
          target.id === 'total_rooms_override' ||
          target.name === 'has_preview_room') {
        updateTotalRooms();
      }

      // Hands-on
      if (target.name === 'has_handson' || target.name === 'group_count') {
        updateHandsonDefaults();
        updateHandsonAssistants();
      }

      // Credit rooms
      if (target.name === 'has_kma_credit' || target.name === 'kma_credit_rooms' ||
          target.name === 'has_other_credits' || target.name && target.name.indexOf('institution_credit_rooms') > -1) {
        updateQRReaderCount();
      }

      // Attendees, booth count, lecture rooms -> material quantities
      if (target.name === 'expected_attendees' || target.name === 'booth_count' ||
          target.name === 'lecture_rooms' || target.name === 'speaker_count' ||
          target.name === 'chair_count' || target.name === 'panel_count' ||
          target.name === 'mc_total_count' || target.name === 'vip_count') {
        updateMaterialQuantities();
      }

      // Material cards
      if (target.closest('.material-card') && target.type === 'checkbox') {
        var card = target.closest('.material-card');
        setTimeout(function () {
          if (target.checked) {
            card.classList.add('selected');
          } else {
            card.classList.remove('selected');
          }
          // Update detail conditionals within card
          updateConditionals();
        }, 10);
      }

      // Override toggle
      if (target.id === 'total_rooms_override') {
        var roomsEl = document.getElementById('total_operational_rooms');
        if (target.checked) {
          roomsEl.readOnly = false;
          roomsEl.classList.remove('auto-calculated');
        } else {
          roomsEl.classList.add('auto-calculated');
          updateTotalRooms();
        }
      }

      debouncedUpdate();
      debouncedSave();
    });

    // --- Validation on blur ---
    document.addEventListener('focusout', function (e) {
      if (e.target.matches('input[required], select[required], textarea[required]')) {
        validateField(e.target.name || e.target.id);
      }
    });

    // --- Action button clicks ---
    var btnSave = document.getElementById('btnTempSave');
    if (btnSave) btnSave.addEventListener('click', handleSave);

    var btnReset = document.getElementById('btnReset');
    if (btnReset) btnReset.addEventListener('click', handleReset);

    var btnSample = document.getElementById('btnLoadSample');
    if (btnSample) btnSample.addEventListener('click', handleLoadSample);

    // --- beforeunload warning ---
    window.addEventListener('beforeunload', function (e) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '저장하지 않은 변경사항이 있습니다. 페이지를 떠나시겠습니까?';
        return e.returnValue;
      }
    });
  }


  // ============================================================
  // 10. INITIALIZATION
  // ============================================================

  function init() {
    // Check for saved draft
    var draft = loadDraft();
    if (draft) {
      var hasData = Object.keys(draft).some(function (key) {
        if (key === '_meta') return false;
        var val = draft[key];
        if (val === null || val === undefined) return false;
        if (typeof val === 'string' && val === '') return false;
        if (Array.isArray(val) && val.length === 0) return false;
        return true;
      });

      if (hasData) {
        var shouldRestore = confirm('이전에 작성하던 내용이 있습니다. 불러오시겠습니까?');
        if (shouldRestore) {
          setFormData(draft);
          showToast('이전 작성 내용을 불러왔습니다', 'success');
        } else {
          clearDraft();
        }
      }
    }

    // Initialize conditionals
    updateConditionals();

    // Initialize all auto-calculated fields
    updateAllCalculations();

    // Initialize summary
    updateSummary();

    // Section completion
    updateSectionCompletion();

    // Setup event listeners
    setupEventListeners();

    // Start auto-save
    startAutoSave();

    // Generate print summary data
    generatePrintData();
  }

  // --- Print data helper ---
  function generatePrintData() {
    // Create print-only elements if they don't exist yet
    if (!document.getElementById('printQuoteHeader')) {
      var printHeader = document.createElement('div');
      printHeader.id = 'printQuoteHeader';
      printHeader.className = 'print-only';
      document.body.insertBefore(printHeader, document.body.firstChild);
    }

    // Create print-only estimate table
    if (!document.getElementById('printEstimateTable')) {
      var printTable = document.createElement('div');
      printTable.id = 'printEstimateTable';
      printTable.className = 'print-only';

      var summaryPanel = document.querySelector('.summary-panel');
      if (summaryPanel) {
        summaryPanel.parentNode.insertBefore(printTable, summaryPanel.nextSibling);
      }
    }
  }

  // --- Update print content before printing ---
  window.addEventListener('beforeprint', function () {
    var data = getFormData();
    var estimates = window._lastEstimates || {};

    // Update print quote header
    var header = document.getElementById('printQuoteHeader');
    if (header) {
      header.innerHTML =
        '<div class="print-quote-title">견 적 서</div>' +
        '<div class="print-quote-meta">' +
          '<div class="print-meta-row"><span class="print-meta-label">행사명</span><span class="print-meta-value">' + (data.event_name || '—') + '</span></div>' +
          '<div class="print-meta-row"><span class="print-meta-label">학회명</span><span class="print-meta-value">' + (data.organization_name || '—') + '</span></div>' +
          '<div class="print-meta-row"><span class="print-meta-label">행사일</span><span class="print-meta-value">' + (data.event_start_date || '—') + (data.event_end_date && data.event_end_date !== data.event_start_date ? ' ~ ' + data.event_end_date : '') + ' (' + (data.event_days || '—') + '일간)' + '</span></div>' +
          '<div class="print-meta-row"><span class="print-meta-label">행사장</span><span class="print-meta-value">' + (data.venue_name || '—') + '</span></div>' +
          '<div class="print-meta-row"><span class="print-meta-label">예상 참석자</span><span class="print-meta-value">' + (data.expected_attendees ? data.expected_attendees + '명' : '—') + '</span></div>' +
          '<div class="print-meta-row"><span class="print-meta-label">운영 룸</span><span class="print-meta-value">' + (data.total_operational_rooms || '—') + '개</span></div>' +
        '</div>';
    }

    // Update print estimate table
    var table = document.getElementById('printEstimateTable');
    if (table && estimates.grandTotal !== undefined) {
      var allBreakdowns = [];
      var categories = [
        { name: '인력', est: estimates.staff },
        { name: '제작물', est: estimates.materials },
        { name: '운영', est: estimates.operations },
        { name: '사진 / 영상', est: estimates.media },
        { name: '운송 / 출장', est: estimates.transport },
        { name: '기타', est: estimates.other }
      ];

      var rows = '';
      categories.forEach(function (cat) {
        if (cat.est && cat.est.breakdown && cat.est.breakdown.length > 0) {
          var isFirst = true;
          cat.est.breakdown.forEach(function (item) {
            if (item.amount <= 0 && item.qty === 0) return;
            rows += '<tr>' +
              (isFirst ? '<td class="print-cat-cell" rowspan="' + cat.est.breakdown.filter(function(b){return b.amount > 0 || b.qty > 0;}).length + '">' + cat.name + '</td>' : '') +
              '<td>' + item.item + '</td>' +
              '<td class="print-num">' + (item.qty || '—') + '</td>' +
              '<td class="print-num">' + (item.unit ? item.unit.toLocaleString('ko-KR') : '—') + '</td>' +
              '<td class="print-num">' + (item.amount ? item.amount.toLocaleString('ko-KR') : '—') + '</td>' +
              '</tr>';
            isFirst = false;
          });
        }
      });

      table.innerHTML =
        '<div class="print-section-title">견적 내역</div>' +
        '<table class="print-table">' +
          '<thead><tr>' +
            '<th>분류</th><th>항목</th><th>수량</th><th>단가 (원)</th><th>금액 (원)</th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
          '<tfoot><tr class="print-total-row">' +
            '<td colspan="4">합계 (VAT 별도)</td>' +
            '<td class="print-num print-total-amount">' + estimates.grandTotal.toLocaleString('ko-KR') + '</td>' +
          '</tr></tfoot>' +
        '</table>' +
        '<div class="print-note">※ 위 견적은 임시 계산 기준이며, 실제 견적은 상세 협의 후 확정됩니다.</div>';
    }
  });

  // ============================================================
  // Async pricing refresh from Google Sheets
  // ============================================================
  function refreshPricingFromSheets() {
    if (!window.PricingConfig || !window.PricingConfig.isSheetsConfigured()) return;

    window.PricingConfig.loadFromSheets()
      .then(function (sheetsData) {
        if (sheetsData) {
          var keys = window.PricingConfig.PRICE_KEYS;
          for (var i = 0; i < keys.length; i++) {
            if (sheetsData.standard && sheetsData.standard[keys[i]] !== undefined) {
              pricingConfigs.standard[keys[i]] = sheetsData.standard[keys[i]];
            }
            if (sheetsData.budget && sheetsData.budget[keys[i]] !== undefined) {
              pricingConfigs.budget[keys[i]] = sheetsData.budget[keys[i]];
            }
          }
          // Re-point current tier and recalculate
          pricingConfig = pricingConfigs[currentTier];
          TRANSPORT_PLACEHOLDER = P('transport_default', 250000);
          PROGRAM_BOOK_UNIT_COST = P('mat_program_book', 8900);
          updateSummary();
        }
      })
      .catch(function () {
        // Silently fall back to defaults — already loaded
      });
  }

  // Expose tier switcher for external access (tier tab UI)
  window.setQuoteTier = setTier;
  window.getQuoteTier = function () { return currentTier; };

  // --- Run ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init();
      refreshPricingFromSheets();
    });
  } else {
    init();
    refreshPricingFromSheets();
  }

})();

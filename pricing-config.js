// ============================================================
// Conference Quote — Shared Pricing Configuration (Dual Tier)
// ============================================================
// This file is included by BOTH admin.html and index.html.
// Provides default prices for 'standard' and 'budget' tiers,
// and async load/save via Google Sheets Apps Script Web App.
// ============================================================

(function () {
  'use strict';

  // ============================================================
  // Google Sheets API Configuration
  // ============================================================
  // After deploying the Apps Script, paste the Web App URL here.
  // Leave empty string to use defaults only (offline mode).
  var SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbwax3dFUwFsdMGm8lPBbGqpqSVMBSbCmk2OPKPYY4ogAeDfJtzahgpfsIaKH0hEXQif/exec';

  // Safe in-memory storage (no browser storage APIs — sandboxed environment)
  var _pricingMemStore = {};
  var pricingStorage = {
    getItem: function (k) {
      return _pricingMemStore[k] || null;
    },
    setItem: function (k, v) {
      _pricingMemStore[k] = v;
    },
    removeItem: function (k) {
      delete _pricingMemStore[k];
    }
  };

  var STORAGE_KEY = 'conference_quote_pricing';

  // ============================================================
  // TIER NAMES
  // ============================================================
  var TIERS = ['standard', 'budget'];
  var TIER_LABELS = { standard: '일반', budget: '최저가' };

  // ============================================================
  // DEFAULT PRICES — single source of truth, per tier
  // 'standard' = 일반 (current prices)
  // 'budget'   = 최저가 (discounted / lower-bound prices)
  // ============================================================
  var DEFAULT_PRICES = {
    standard: {
      // Category 1: 인력 (Human Resources)
      staff_director: 250000,
      staff_operator: 200000,
      staff_reg_desk: 150000,
      staff_handson: 150000,
      staff_pre_setting: 130000,

      // Category 2: 등록 운영 (Registration Operations)
      reg_barcode_system: 400000,
      reg_badge_print_system: 80000,

      // Category 3: 평점 운영 (Credit/Accreditation Operations)
      credit_barcode_reader: 150000,

      // Category 4: 제작물 (Production Materials)
      mat_design_fee: 300000,
      mat_program_book: 8900,
      mat_abstract_book: 12000,
      mat_badge_paper: 1800,
      mat_badge_case: 1200,
      mat_badge_strap: 0,
      mat_x_banner: 80000,
      mat_hanging_banner: 50000,
      mat_podium_board: 50000,
      mat_schedule_banner: 80000,

      // Category 5: 부스 / 전시 (Booth / Exhibition)
      booth_electrical: 70000,

      // Category 6: 사진 / 영상 (Photo / Video)
      media_photo: 250000,
      media_video: 400000,

      // Category 7: 운송 / 출장 (Transport / Travel)
      transport_default: 250000,
      transport_chungcheong: 350000,
      transport_gyeongsang_jeonbuk: 500000,
      transport_gyeongnam_jeonnam: 600000,
      transport_jeju: 800000,

      // Category 8: 기타 (Others)
      other_staff_meal: 12000,
      other_staff_transport: 150000,
      other_staff_lodging: 150000,

      // Category 9: 장비 렌탈 (Equipment Rental)
      equip_lecture_system: 400000,
      equip_notebook: 80000,
      equip_printer: 80000,
      equip_monitor: 60000,
      equip_prompt: 400000,
      equip_timer: 120000,
      equip_switcher: 300000,
      equip_preview: 200000,
      equip_tablet: 110000,

      // Category 10: 수수료 (Fees)
      fee_agency_rate: 10,
      fee_vat_rate: 10
    },

    budget: {
      // Category 1: 인력 (Human Resources) — reduced rates
      staff_director: 200000,
      staff_operator: 170000,
      staff_reg_desk: 120000,
      staff_handson: 120000,
      staff_pre_setting: 100000,

      // Category 2: 등록 운영
      reg_barcode_system: 300000,
      reg_badge_print_system: 60000,

      // Category 3: 평점 운영
      credit_barcode_reader: 120000,

      // Category 4: 제작물
      mat_design_fee: 200000,
      mat_program_book: 6500,
      mat_abstract_book: 9000,
      mat_badge_paper: 1200,
      mat_badge_case: 800,
      mat_badge_strap: 0,
      mat_x_banner: 55000,
      mat_hanging_banner: 35000,
      mat_podium_board: 35000,
      mat_schedule_banner: 55000,

      // Category 5: 부스 / 전시
      booth_electrical: 50000,

      // Category 6: 사진 / 영상
      media_photo: 200000,
      media_video: 300000,

      // Category 7: 운송 / 출장
      transport_default: 200000,
      transport_chungcheong: 280000,
      transport_gyeongsang_jeonbuk: 400000,
      transport_gyeongnam_jeonnam: 480000,
      transport_jeju: 650000,

      // Category 8: 기타
      other_staff_meal: 10000,
      other_staff_transport: 120000,
      other_staff_lodging: 120000,

      // Category 9: 장비 렌탈
      equip_lecture_system: 300000,
      equip_notebook: 60000,
      equip_printer: 60000,
      equip_monitor: 45000,
      equip_prompt: 300000,
      equip_timer: 90000,
      equip_switcher: 220000,
      equip_preview: 150000,
      equip_tablet: 80000,

      // Category 10: 수수료 — same rates
      fee_agency_rate: 10,
      fee_vat_rate: 10
    }
  };

  // ============================================================
  // Flat key list (from standard tier — both tiers have same keys)
  // ============================================================
  var PRICE_KEYS = Object.keys(DEFAULT_PRICES.standard);

  // ============================================================
  // PUBLIC API — Synchronous (in-memory / fallback)
  // ============================================================

  /**
   * Load pricing config for a given tier from memory cache.
   * Falls back to defaults for any missing key.
   * @param {string} [tier='standard'] — 'standard' or 'budget'
   * @returns {object} A plain object with all pricing keys.
   */
  function loadPricingConfig(tier) {
    tier = tier || 'standard';
    var defaults = DEFAULT_PRICES[tier] || DEFAULT_PRICES.standard;
    var prices = {};
    // Start with all defaults
    for (var i = 0; i < PRICE_KEYS.length; i++) {
      prices[PRICE_KEYS[i]] = defaults[PRICE_KEYS[i]];
    }

    // Overlay saved values from memory
    var raw = pricingStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        var saved = JSON.parse(raw);
        if (saved && saved.prices && saved.prices[tier]) {
          var savedKeys = Object.keys(saved.prices[tier]);
          for (var j = 0; j < savedKeys.length; j++) {
            if (prices.hasOwnProperty(savedKeys[j])) {
              prices[savedKeys[j]] = saved.prices[tier][savedKeys[j]];
            }
          }
        }
        // BACKWARD COMPAT: if old flat format (no tier key), apply to standard
        if (saved && saved.prices && !saved.prices.standard && !saved.prices.budget && tier === 'standard') {
          var flatKeys = Object.keys(saved.prices);
          for (var k = 0; k < flatKeys.length; k++) {
            if (prices.hasOwnProperty(flatKeys[k])) {
              prices[flatKeys[k]] = saved.prices[flatKeys[k]];
            }
          }
        }
      } catch (e) {
        // Corrupt data — use defaults
      }
    }
    return prices;
  }

  /**
   * Save pricing config for BOTH tiers to in-memory store.
   * @param {object} standardPrices
   * @param {object} budgetPrices
   */
  function savePricingConfig(standardPrices, budgetPrices) {
    var payload = {
      version: '2.0.0',
      updated_at: new Date().toISOString(),
      prices: {
        standard: standardPrices,
        budget: budgetPrices
      }
    };
    pricingStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  /**
   * Get the raw saved config envelope (with version, updated_at).
   * @returns {object|null}
   */
  function getRawConfig() {
    var raw = pricingStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { return null; }
    }
    return null;
  }

  /**
   * Clear saved config (revert to defaults).
   */
  function clearPricingConfig() {
    pricingStorage.removeItem(STORAGE_KEY);
  }

  // ============================================================
  // ASYNC API — Google Sheets integration
  // ============================================================

  /**
   * Check if Sheets API is configured.
   * @returns {boolean}
   */
  function isSheetsConfigured() {
    return SHEETS_API_URL && SHEETS_API_URL.length > 0;
  }

  /**
   * Load prices from Google Sheets.
   * On success, caches into in-memory store and returns the prices.
   * On failure, returns null (caller should fall back to defaults).
   * @returns {Promise<{standard: object, budget: object, updated_at: string}|null>}
   */
  function loadFromSheets() {
    if (!isSheetsConfigured()) {
      return Promise.resolve(null);
    }

    return fetch(SHEETS_API_URL)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.status === 'ok' && data.prices) {
          // Cache in memory
          var payload = {
            version: '2.0.0',
            updated_at: data.updated_at || new Date().toISOString(),
            prices: data.prices
          };
          pricingStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
          return {
            standard: data.prices.standard || {},
            budget: data.prices.budget || {},
            updated_at: data.updated_at || ''
          };
        }
        // Sheet is empty or status is 'empty' — use defaults
        return null;
      })
      .catch(function (err) {
        console.warn('[PricingConfig] Failed to load from Sheets:', err);
        return null;
      });
  }

  /**
   * Save prices to Google Sheets via GET request (avoids CORS redirect issues).
   * Also saves to in-memory store.
   * @param {object} standardPrices
   * @param {object} budgetPrices
   * @returns {Promise<{ok: boolean, updated_at: string}>}
   */
  function saveToSheets(standardPrices, budgetPrices) {
    // Always save to memory first
    savePricingConfig(standardPrices, budgetPrices);

    if (!isSheetsConfigured()) {
      return Promise.resolve({ ok: true, updated_at: new Date().toISOString(), offline: true });
    }

    var dataPayload = encodeURIComponent(JSON.stringify({
      standard: standardPrices,
      budget: budgetPrices
    }));
    var url = SHEETS_API_URL + '?action=write&data=' + dataPayload;

    return fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.status === 'ok') {
          return { ok: true, updated_at: data.updated_at || new Date().toISOString() };
        }
        return { ok: false, error: data.message || 'Unknown error' };
      })
      .catch(function (err) {
        console.warn('[PricingConfig] Failed to save to Sheets:', err);
        return { ok: false, error: err.toString() };
      });
  }

  // ============================================================
  // Expose on window
  // ============================================================
  window.PricingConfig = {
    defaults: DEFAULT_PRICES,
    TIERS: TIERS,
    TIER_LABELS: TIER_LABELS,
    PRICE_KEYS: PRICE_KEYS,
    STORAGE_KEY: STORAGE_KEY,

    // Sync API (in-memory)
    load: loadPricingConfig,
    save: savePricingConfig,
    getRaw: getRawConfig,
    clear: clearPricingConfig,

    // Async API (Google Sheets)
    isSheetsConfigured: isSheetsConfigured,
    loadFromSheets: loadFromSheets,
    saveToSheets: saveToSheets,

    // Expose URL setter so admin can update at runtime if needed
    setSheetsUrl: function (url) { SHEETS_API_URL = url; },
    getSheetsUrl: function () { return SHEETS_API_URL; }
  };

})();

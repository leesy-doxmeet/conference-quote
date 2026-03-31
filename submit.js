// ============================================================
// Conference Quote — Submit Module
// Handles form submission via EmailJS + Google Sheets
// ============================================================

(function () {
  'use strict';

  // ============================================================
  // CONFIGURATION — Fill these in after setting up EmailJS & Google Sheets
  // ============================================================
  var CONFIG = {
    // EmailJS (https://www.emailjs.com)
    emailjs: {
      enabled: true,
      publicKey: 'xknWvWLAqoNflQ2gO',
      serviceId: 'service_1rf6nkv',
      templateId: 'template_4t67h6g',
      blockHeadless: true,
      limitRateMs: 10000
    },

    // Google Sheets via Apps Script Web App
    googleSheets: {
      enabled: false,                              // Set to true after setup
      webAppUrl: 'https://script.google.com/macros/s/AKfycbyyy-Vqhl733_c6Vw7T3k_q5_s3L4-h26xjNbkO0McMAsIik64415z-laniYdUaouTaZg/exec'  // Apps Script → Deploy → Web App URL
    },

    // Recipient info (for display purposes)
    recipientEmail: 'leesy@doxmeet.com'
  };

  // ============================================================
  // STATE
  // ============================================================
  var isSubmitting = false;
  var emailjsInitialized = false;

  // ============================================================
  // HELPERS
  // ============================================================

  // Collect the full form data + estimates for submission
  function collectSubmissionData() {
    var formData = {};

    // Gather all form fields
    var inputs = document.querySelectorAll('input[type="text"], input[type="number"], input[type="date"], input[type="time"], textarea, select');
    inputs.forEach(function (el) {
      if (el.name && el.name.indexOf('[') === -1 && el.name.indexOf('.') === -1) {
        formData[el.name] = el.value || '';
      }
    });

    // Radio buttons
    document.querySelectorAll('input[type="radio"]:checked').forEach(function (el) {
      if (el.name && el.name.indexOf('[') === -1 && !el.name.startsWith('venue_systems.')) {
        formData[el.name] = el.value;
      }
    });

    // Checkboxes (multi-select)
    ['event_type', 'video_options', 'qr_send_method', 'qr_send_timing', 'post_event_outputs', 'qa_method'].forEach(function (name) {
      var checked = [];
      document.querySelectorAll('input[name="' + name + '"]:checked').forEach(function (cb) {
        checked.push(cb.value);
      });
      formData[name] = checked.join(', ');
    });

    // Material toggles
    ['program_book', 'abstract_book', 'badges', 'x_banners', 'hanging_banner', 'podium_board', 'schedule_banner', 'name_plate'].forEach(function (name) {
      var cb = document.querySelector('input[name="' + name + '"]');
      formData[name] = cb && cb.checked ? '선택' : '미선택';
    });

    formData.faculty_count =
      (parseInt(formData.speaker_count, 10) || 0) +
      (parseInt(formData.chair_count, 10) || 0) +
      (parseInt(formData.panel_count, 10) || 0) +
      (parseInt(formData.mc_total_count, 10) || 0) +
      (parseInt(formData.vip_count, 10) || 0);

    // Get the current estimate total
    var totalEl = document.getElementById('summaryTotal');
    formData._estimate_total = totalEl ? totalEl.textContent : '—';

    // Current tier
    var tierLabel = document.getElementById('tierLabel');
    formData._estimate_tier = tierLabel ? tierLabel.textContent : '일반';

    // Estimate breakdown from window._lastEstimates
    if (window._lastEstimates) {
      var est = window._lastEstimates;
      var breakdown = [];
      var cats = [
        { name: '인력', key: 'staff' },
        { name: '운영', key: 'operations' },
        { name: '제작물', key: 'materials' },
        { name: '사진/영상', key: 'media' },
        { name: '운송/출장', key: 'transport' },
        { name: '기타', key: 'other' }
      ];
      cats.forEach(function (c) {
        if (est[c.key] && est[c.key].total > 0) {
          breakdown.push(c.name + ': ' + est[c.key].total.toLocaleString('ko-KR') + '원');
        }
      });
      formData._estimate_breakdown = breakdown.join('\n');
    }

    // Submission metadata
    formData._submission_id = 'DQ-' + Date.now();
    formData._submitted_at = new Date().toISOString();
    formData._submitted_at_kr = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    formData._source_origin = window.location.origin || 'local-file';
    formData._source_url = window.location.href || 'local-file';

    return formData;
  }

  function getEnabledSubmissionTargets() {
    var labels = [];
    if (CONFIG.emailjs.enabled) labels.push('이메일');
    if (CONFIG.googleSheets.enabled) labels.push('Google Sheets');
    return labels;
  }

  // Build a readable email body from the form data
  function buildEmailBody(data) {
    var lines = [];
    lines.push('═══════════════════════════════════════');
    lines.push('학술대회 견적 입력 — 신규 제출');
    lines.push('═══════════════════════════════════════');
    lines.push('');
    lines.push('■ 기본 정보');
    lines.push('  행사명: ' + (data.event_name || '—'));
    lines.push('  학회명: ' + (data.organization_name || '—'));
    lines.push('  행사유형: ' + (data.event_type || '—'));
    lines.push('  일정: ' + (data.event_start_date || '—') + ' ~ ' + (data.event_end_date || '—'));
    lines.push('  운영일수: ' + (data.event_days || '—') + '일');
    lines.push('  행사장: ' + (data.venue_name || '—'));
    lines.push('  주소: ' + (data.venue_address || '—'));
    lines.push('');
    lines.push('■ 참석 정보');
    lines.push('  예상 참석자: ' + (data.expected_attendees || '—') + '명');
    lines.push('  패컬티: ' + (data.faculty_count || '—') + '명');
    lines.push('  연자 / 좌장 / 패널 / MC / VIP: ' +
      (data.speaker_count || '0') + ' / ' +
      (data.chair_count || '0') + ' / ' +
      (data.panel_count || '0') + ' / ' +
      (data.mc_total_count || '0') + ' / ' +
      (data.vip_count || '0'));
    lines.push('');
    lines.push('■ 공간 구성');
    lines.push('  강의실: ' + (data.lecture_rooms || '—') + '개');
    lines.push('  실습실: ' + (data.practice_rooms || '0') + '개');
    lines.push('  총 운영룸: ' + (data.total_operational_rooms || '—') + '개');
    lines.push('  촬영 운영: ' + (data.venue_operation_mode || '—'));
    lines.push('  QR 발송 방식 / 시점: ' + (data.qr_send_method || '—') + ' / ' + (data.qr_send_timing || '—'));
    lines.push('');
    lines.push('■ 견적 요약 (' + (data._estimate_tier || '일반') + ')');
    lines.push('  총 견적: ' + (data._estimate_total || '—'));
    if (data._estimate_breakdown) {
      lines.push('');
      lines.push('  [내역]');
      data._estimate_breakdown.split('\n').forEach(function (line) {
        lines.push('  ' + line);
      });
    }
    lines.push('');
    lines.push('───────────────────────────────────────');
    lines.push('접수번호: ' + (data._submission_id || '—'));
    lines.push('제출 시각: ' + (data._submitted_at_kr || '—'));
    lines.push('제출 출처: ' + (data._source_origin || '—'));
    lines.push('───────────────────────────────────────');

    return lines.join('\n');
  }

  function buildSubmissionTasks(data) {
    var tasks = [];

    if (CONFIG.emailjs.enabled) {
      tasks.push({
        key: 'emailjs',
        label: '이메일',
        run: function () {
          return sendEmailJS(data);
        }
      });
    }

    if (CONFIG.googleSheets.enabled) {
      tasks.push({
        key: 'googleSheets',
        label: 'Google Sheets',
        run: function () {
          return sendToGoogleSheets(data);
        }
      });
    }

    return tasks;
  }

  function normalizeSubmissionError(err) {
    if (!err) return { status: 0, text: 'Unknown error' };
    return {
      status: err.status || 0,
      text: err.text || err.message || String(err)
    };
  }

  function getSubmitErrorMessage(failedTargets) {
    var first = failedTargets[0];
    if (!first) {
      return '제출 중 오류가 발생했습니다. 다시 시도해주세요.';
    }

    var text = (first.error && first.error.text ? first.error.text : '').toLowerCase();
    var status = first.error ? first.error.status : 0;

    if (status === 429) {
      return '너무 빠르게 연속 제출되었습니다. 10초 후 다시 시도해주세요.';
    }

    if (status === 451) {
      return '보안 설정으로 인해 현재 브라우저 환경에서는 전송할 수 없습니다.';
    }

    if (text.indexOf('domain') !== -1 || text.indexOf('origin') !== -1 || text.indexOf('allowlist') !== -1) {
      return 'EmailJS 도메인 허용 목록 설정을 확인해주세요.';
    }

    return first.label + ' 전송에 실패했습니다. 설정을 확인해주세요.';
  }

  // ============================================================
  // EmailJS — Send email notification
  // ============================================================
  function sendEmailJS(data) {
    if (!CONFIG.emailjs.enabled) {
      console.log('[Submit] EmailJS disabled — skipping email send');
      return Promise.resolve({ skipped: true });
    }

    if (typeof emailjs === 'undefined') {
      console.warn('[Submit] EmailJS SDK not loaded');
      return Promise.resolve({ skipped: true });
    }

    var templateParams = {
      submission_id: data._submission_id || '',
      event_name: data.event_name || '(미입력)',
      organization_name: data.organization_name || '(미입력)',
      event_dates: (data.event_start_date || '—') + ' ~ ' + (data.event_end_date || '—'),
      venue: data.venue_name || '(미입력)',
      attendees: data.expected_attendees || '—',
      estimate_total: data._estimate_total || '—',
      estimate_tier: data._estimate_tier || '일반',
      submitted_at: data._submitted_at_kr || '—',
      source_origin: data._source_origin || '',
      source_url: data._source_url || '',
      message: buildEmailBody(data),
      to_email: CONFIG.recipientEmail
    };

    return emailjs.send(
      CONFIG.emailjs.serviceId,
      CONFIG.emailjs.templateId,
      templateParams
    );
  }

  // ============================================================
  // Google Sheets — POST data to Apps Script Web App
  // ============================================================
  function sendToGoogleSheets(data) {
    if (!CONFIG.googleSheets.enabled) {
      console.log('[Submit] Google Sheets disabled — skipping');
      return Promise.resolve({ skipped: true });
    }

    // Flatten data for spreadsheet row
    var row = {
      submitted_at: data._submitted_at_kr,
      event_name: data.event_name || '',
      organization_name: data.organization_name || '',
      event_type: data.event_type || '',
      event_start_date: data.event_start_date || '',
      event_end_date: data.event_end_date || '',
      event_days: data.event_days || '',
      venue_name: data.venue_name || '',
      venue_address: data.venue_address || '',
      expected_attendees: data.expected_attendees || '',
      faculty_count: data.faculty_count || '',
      lecture_rooms: data.lecture_rooms || '',
      practice_rooms: data.practice_rooms || '',
      total_rooms: data.total_operational_rooms || '',
      has_handson: data.has_handson || '',
      has_booths: data.has_booths || '',
      booth_count: data.booth_count || '',
      has_kma_credit: data.has_kma_credit || '',
      needs_badge_printing: data.needs_badge_printing || '',
      program_book: data.program_book || '',
      abstract_book: data.abstract_book || '',
      badges: data.badges || '',
      estimate_tier: data._estimate_tier || '일반',
      estimate_total: data._estimate_total || '',
      estimate_breakdown: data._estimate_breakdown || ''
    };

    return fetch(CONFIG.googleSheets.webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row)
    });
  }

  // ============================================================
  // SUBMIT HANDLER
  // ============================================================
  function handleSubmit() {
    if (isSubmitting) return;

    // Basic validation: at least event name
    var data = collectSubmissionData();
    if (!data.event_name || data.event_name.trim() === '') {
      showSubmitToast('행사명을 입력해주세요.', 'error');
      return;
    }

    var tasks = buildSubmissionTasks(data);
    if (tasks.length === 0) {
      showSubmitToast('제출 연동이 비활성화되어 있습니다. submit.js에서 EmailJS 또는 Google Sheets 설정을 활성화해주세요.', 'error');
      return;
    }

    isSubmitting = true;
    updateSubmitButton(true);

    Promise.allSettled(tasks.map(function (task) {
      return task.run();
    })).then(function (results) {
      var successTargets = [];
      var failedTargets = [];

      results.forEach(function (result, idx) {
        var task = tasks[idx];

        if (result.status === 'fulfilled' && !result.value.skipped) {
          successTargets.push(task.label);
          return;
        }

        if (result.status === 'rejected') {
          failedTargets.push({
            key: task.key,
            label: task.label,
            error: normalizeSubmissionError(result.reason)
          });
        }
      });

      isSubmitting = false;
      updateSubmitButton(false);

      if (successTargets.length > 0) {
        showSubmitSuccess(data, successTargets);
        if (failedTargets.length > 0) {
          showSubmitToast('일부 채널 전송 실패: ' + failedTargets.map(function (item) { return item.label; }).join(', '), 'error');
          console.warn('[Submit] Partial submission failure:', failedTargets);
        }
        return;
      }

      console.error('[Submit] All submission targets failed:', failedTargets);
      showSubmitToast(getSubmitErrorMessage(failedTargets), 'error');
    });
  }

  // ============================================================
  // UI HELPERS
  // ============================================================

  function updateSubmitButton(loading) {
    var btn = document.getElementById('btnSubmitQuote');
    if (!btn) return;
    if (loading) {
      btn.disabled = true;
      btn.innerHTML = '<span class="submit-spinner"></span> 제출 중...';
    } else {
      btn.disabled = false;
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg><span class="btn-text">견적 제출</span>';
    }
  }

  function showSubmitSuccess(data, deliveredTargets) {
    var deliveryText = deliveredTargets && deliveredTargets.length > 0
      ? '입력하신 내용이 ' + deliveredTargets.join(' 및 ') + '로 전달되었습니다.'
      : '입력하신 내용이 저장되었습니다.';

    // Show success modal overlay
    var overlay = document.getElementById('submitSuccessOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'submitSuccessOverlay';
      overlay.className = 'submit-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML =
      '<div class="submit-success-card">' +
        '<div class="submit-success-icon">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>' +
            '<polyline points="22 4 12 14.01 9 11.01"/>' +
          '</svg>' +
        '</div>' +
        '<div class="submit-success-title">견적이 제출되었습니다</div>' +
        '<div class="submit-success-details">' +
          '<div class="submit-detail-row"><span class="submit-detail-label">행사명</span><span>' + (data.event_name || '—') + '</span></div>' +
          '<div class="submit-detail-row"><span class="submit-detail-label">학회명</span><span>' + (data.organization_name || '—') + '</span></div>' +
          '<div class="submit-detail-row"><span class="submit-detail-label">견적 금액</span><span class="submit-detail-amount">' + (data._estimate_total || '—') + '</span></div>' +
          '<div class="submit-detail-row"><span class="submit-detail-label">적용 단가</span><span>' + (data._estimate_tier || '일반') + '</span></div>' +
        '</div>' +
        '<div class="submit-success-note">' + deliveryText + '<br>확인 후 연락드리겠습니다.</div>' +
        '<div class="submit-success-actions">' +
          '<button type="button" class="btn btn-primary" onclick="document.getElementById(\'submitSuccessOverlay\').classList.remove(\'visible\')">확인</button>' +
          '<button type="button" class="btn btn-ghost" onclick="window.print()">견적서 인쇄 / PDF</button>' +
        '</div>' +
      '</div>';

    // Animate in
    requestAnimationFrame(function () {
      overlay.classList.add('visible');
    });
  }

  function showSubmitToast(msg, type) {
    // Reuse existing toast or create one
    var toast = document.getElementById('submitToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'submitToast';
      toast.className = 'admin-toast';
      toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--color-text);color:#fff;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,0.15);opacity:0;pointer-events:none;transition:all 300ms cubic-bezier(0.16,1,0.3,1);z-index:9999;';
      document.body.appendChild(toast);
    }
    if (type === 'error') {
      toast.style.background = 'var(--color-error)';
    } else {
      toast.style.background = 'var(--color-text)';
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 3000);
  }

  // ============================================================
  // INIT
  // ============================================================
  function initEmailJS() {
    if (emailjsInitialized || !CONFIG.emailjs.enabled) return;
    if (typeof emailjs === 'undefined' || !CONFIG.emailjs.publicKey) return;

    emailjs.init({
      publicKey: CONFIG.emailjs.publicKey,
      blockHeadless: !!CONFIG.emailjs.blockHeadless,
      limitRate: {
        id: 'conference-quote-submit',
        throttle: CONFIG.emailjs.limitRateMs || 0
      }
    });
    emailjsInitialized = true;
  }

  function initSubmit() {
    initEmailJS();

    var btn = document.getElementById('btnSubmitQuote');
    if (btn) {
      btn.addEventListener('click', handleSubmit);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSubmit);
  } else {
    initSubmit();
  }

  // Expose config for easy updates
  window.SubmitConfig = CONFIG;

})();

// ============================================================
// Google Apps Script — 단가 관리 API (읽기 + 쓰기)
//
// [설치 방법]
// 1. Google Sheets 새 파일 생성 (이름: "견적 단가표")
// 2. 시트 탭 이름을 "pricing" 으로 변경
// 3. 확장 프로그램 → Apps Script
// 4. 이 코드를 전체 붙여넣기
// 5. 배포 → 새 배포 → 유형: 웹 앱
//    - 실행할 사용자: 나
//    - 엑세스 권한: 모든 사용자
// 6. 배포 URL 복사 → pricing-config.js 의 SHEETS_API_URL 에 붙여넣기
// ============================================================

// doGet handles BOTH read and write operations.
// - Read:  GET ?action=read  (or no params)
// - Write: GET ?action=write&data={...json...}
// This avoids CORS/redirect issues with POST from the browser.
function doGet(e) {
  try {
    var action = (e.parameter && e.parameter.action) ? e.parameter.action : 'read';
    
    if (action === 'write') {
      return handleWrite(e);
    }
    return handleRead();
    
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

// Also keep doPost for compatibility (e.g. server-side calls)
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    return writeToSheet(payload.standard || {}, payload.budget || {});
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

// ============================================================
// READ — Load prices from the 'pricing' sheet
// ============================================================
function handleRead() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('pricing');
  
  if (!sheet || sheet.getLastRow() < 2) {
    return jsonResponse({ status: 'empty', prices: null });
  }
  
  var data = sheet.getDataRange().getValues();
  var standard = {};
  var budget = {};
  var updatedAt = '';
  
  for (var i = 1; i < data.length; i++) {
    var key = data[i][0];
    if (!key || key === '') continue;
    
    if (key === '_updated_at') {
      updatedAt = data[i][1] || '';
      continue;
    }
    
    standard[key] = parseNum(data[i][1]);
    budget[key] = parseNum(data[i][2]);
  }
  
  return jsonResponse({
    status: 'ok',
    updated_at: updatedAt,
    prices: { standard: standard, budget: budget }
  });
}

// ============================================================
// WRITE — Save prices to the 'pricing' sheet
// ============================================================
function handleWrite(e) {
  var raw = e.parameter.data;
  if (!raw) {
    return jsonResponse({ status: 'error', message: 'Missing data parameter' });
  }
  
  var payload = JSON.parse(decodeURIComponent(raw));
  return writeToSheet(payload.standard || {}, payload.budget || {});
}

function writeToSheet(standardPrices, budgetPrices) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('pricing');
  
  if (!sheet) {
    sheet = ss.insertSheet('pricing');
  }
  
  // Clear and rebuild
  sheet.clear();
  
  // Header row
  sheet.getRange(1, 1, 1, 3).setValues([['key', 'standard', 'budget']]);
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold')
    .setBackground('#1a6b5a').setFontColor('#ffffff');
  
  // Data rows
  var keys = Object.keys(standardPrices);
  var rows = [];
  for (var i = 0; i < keys.length; i++) {
    rows.push([
      keys[i],
      standardPrices[keys[i]] || 0,
      budgetPrices[keys[i]] || 0
    ]);
  }
  
  // Add timestamp row
  var now = new Date();
  var kst = Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
  rows.push(['_updated_at', kst, '']);
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  }
  
  // Auto-resize
  sheet.autoResizeColumns(1, 3);
  sheet.setFrozenRows(1);
  
  return jsonResponse({ status: 'ok', updated_at: kst, count: keys.length });
}

// ============================================================
// Helpers
// ============================================================
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function parseNum(val) {
  if (val === null || val === undefined || val === '') return 0;
  var n = Number(val);
  return isNaN(n) ? 0 : n;
}

// ============================================================
// Google Apps Script — 견적 데이터 자동 수집용 웹앱
// 
// 설치 방법:
// 1. Google Sheets 새 파일 생성
// 2. 확장 프로그램 → Apps Script 클릭
// 3. 아래 코드를 전체 복사해서 붙여넣기
// 4. 배포 → 새 배포 → 유형: 웹 앱
//    - 실행할 사용자: 나
//    - 엑세스 권한: 모든 사용자
// 5. 배포 URL 복사
// 6. submit.js의 CONFIG.googleSheets.webAppUrl에 붙여넣기
//    CONFIG.googleSheets.enabled = true 로 변경
// ============================================================

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // 첫 번째 행이 비어있으면 헤더 생성
    if (sheet.getLastRow() === 0) {
      var headers = [
        '제출일시', '행사명', '학회명', '행사유형',
        '시작일', '종료일', '운영일수',
        '행사장', '주소',
        '예상 참석자', '패컬티 수',
        '강의실', '실습실', '총 운영룸',
        '핸즈온', '부스', '부스 수',
        '의협 평점', '명찰 출력',
        '프로그램북', '초록집', '명찰',
        '적용단가', '총 견적', '견적 내역'
      ];
      sheet.appendRow(headers);
      
      // 헤더 스타일링
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#1f63d2');
      headerRange.setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
    
    // 데이터 행 추가
    var row = [
      data.submitted_at || '',
      data.event_name || '',
      data.organization_name || '',
      data.event_type || '',
      data.event_start_date || '',
      data.event_end_date || '',
      data.event_days || '',
      data.venue_name || '',
      data.venue_address || '',
      data.expected_attendees || '',
      data.faculty_count || '',
      data.lecture_rooms || '',
      data.practice_rooms || '',
      data.total_rooms || '',
      data.has_handson || '',
      data.has_booths || '',
      data.booth_count || '',
      data.has_kma_credit || '',
      data.needs_badge_printing || '',
      data.program_book || '',
      data.abstract_book || '',
      data.badges || '',
      data.estimate_tier || '',
      data.estimate_total || '',
      data.estimate_breakdown || ''
    ];
    
    sheet.appendRow(row);
    
    // 열 너비 자동 조정 (첫 5행 기준)
    if (sheet.getLastRow() <= 2) {
      sheet.autoResizeColumns(1, row.length);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// GET 요청 처리 (테스트용)
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: '견적 데이터 수집 웹앱이 정상 작동중입니다.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

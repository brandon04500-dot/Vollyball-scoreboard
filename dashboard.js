// 배구 스코어보드 대시보드 관리
// 로그인 상태 확인 및 페이지 이동 관리

let currentLogin = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

// 로그인 상태 확인
function checkLoginStatus() {
    try {
        const loginData = localStorage.getItem('volleyball_login');
        if (!loginData) {
            console.log('로그인 정보가 없습니다. 로그인 페이지로 이동합니다.');
            window.location.href = 'login.html';
            return null;
        }
        
        const login = JSON.parse(loginData);
        console.log('로그인 상태 확인:', login);
        return login;
    } catch (error) {
        console.error('로그인 상태 확인 오류:', error);
        localStorage.removeItem('volleyball_login');
        window.location.href = 'login.html';
        return null;
    }
}

// 로그아웃
function logout() {
    try {
        console.log('로그아웃 시작');
        localStorage.removeItem('volleyball_login');
        currentLogin = null;
        window.location.href = 'login.html';
    } catch (error) {
        console.error('로그아웃 오류:', error);
        window.location.href = 'login.html';
    }
}

// 대시보드 초기화
function initializeDashboard() {
    console.log('대시보드 초기화 시작');
    
    // 로그인 상태 확인
    currentLogin = checkLoginStatus();
    if (!currentLogin) {
        return; // checkLoginStatus에서 이미 리다이렉트됨
    }
    
    // URL 파라미터에서 구장 ID 확인
    const urlParams = new URLSearchParams(window.location.search);
    const courtFromUrl = urlParams.get('court');
    
    if (courtFromUrl && courtFromUrl !== currentLogin.courtId) {
        alert('로그인된 구장과 요청한 구장이 다릅니다.');
        logout();
        return;
    }
    
    // 대시보드 정보 업데이트
    updateDashboardInfo();
    
    console.log('대시보드 초기화 완료');
}

// 대시보드 정보 업데이트
function updateDashboardInfo() {
    if (!currentLogin) return;
    
    // 헤더 정보 업데이트
    document.getElementById('courtInfo').textContent = `${currentLogin.courtName} 대시보드`;
    
    // 환영 메시지 업데이트
    document.getElementById('welcomeMessage').textContent = `${currentLogin.courtName}에 오신 것을 환영합니다!`;
    
    // 로그인 시간 표시
    const loginTime = currentLogin.loginTime || new Date().toLocaleString('ko-KR');
    document.getElementById('loginTime').textContent = `로그인 시간: ${loginTime}`;
    
    // 상태 정보 업데이트
    document.getElementById('statusCourt').textContent = currentLogin.courtName;
    document.getElementById('statusLoginTime').textContent = loginTime;
}

// 컨트롤패널 열기
function openControlPanel() {
    if (!currentLogin) {
        alert('로그인 상태를 확인할 수 없습니다.');
        return;
    }
    
    const courtId = currentLogin.courtId;
    // courtId가 "001"이면 "1"로 변환
    const courtNumber = parseInt(courtId).toString();
    const controlPanelUrl = `courts/${courtNumber}/courts/${courtId}/control.html`;
    
    // 새 탭에서 컨트롤패널 열기
    const newWindow = window.open(controlPanelUrl, '_blank');
    
    if (!newWindow) {
        alert('팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.');
    } else {
        // 새 창이 성공적으로 열렸을 때 포커스
        newWindow.focus();
    }
}

// 송출용 페이지 열기
function openDisplayPage() {
    if (!currentLogin) {
        alert('로그인 상태를 확인할 수 없습니다.');
        return;
    }
    
    const courtId = currentLogin.courtId;
    // courtId가 "001"이면 "1"로 변환
    const courtNumber = parseInt(courtId).toString();
    const displayPageUrl = `courts/${courtNumber}/courts/${courtId}/display.html`;
    
    // 새 탭에서 송출용 페이지 열기
    const newWindow = window.open(displayPageUrl, '_blank');
    
    if (!newWindow) {
        alert('팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.');
    } else {
        // 새 창이 성공적으로 열렸을 때 포커스
        newWindow.focus();
    }
}

// 키보드 단축키 설정 (메모리 관리 강화)
globalMemoryManager.addEventListener(document, 'keydown', function(event) {
    try {
        // Ctrl + 1: 컨트롤패널 열기
        if (event.ctrlKey && event.key === '1') {
            event.preventDefault();
            openControlPanel();
        }
        
        // Ctrl + 2: 송출용 페이지 열기
        if (event.ctrlKey && event.key === '2') {
            event.preventDefault();
            openDisplayPage();
        }
        
        // Ctrl + L: 로그아웃
        if (event.ctrlKey && event.key === 'l') {
            event.preventDefault();
            logout();
        }
    } catch (error) {
        ErrorHandler.logError('키보드 단축키 처리', error);
    }
});

// 페이지 가시성 변경 시 로그인 상태 재확인 (메모리 관리 강화)
globalMemoryManager.addEventListener(document, 'visibilitychange', function() {
    try {
        if (!document.hidden) {
            // 페이지가 다시 보일 때 로그인 상태 확인
            const loginStatus = checkLoginStatus();
            if (!loginStatus) {
                return; // checkLoginStatus에서 이미 리다이렉트됨
            }
            
            // 로그인 정보가 변경되었는지 확인
            if (currentLogin && loginStatus.courtId !== currentLogin.courtId) {
                alert('다른 구장에서 로그인되었습니다. 페이지를 새로고침합니다.');
                location.reload();
            }
        }
    } catch (error) {
        ErrorHandler.logError('페이지 가시성 변경 처리', error);
    }
});

// 주기적으로 로그인 상태 확인 (5분마다, 메모리 관리)
const loginCheckInterval = globalMemoryManager.addInterval(function() {
    try {
        if (currentLogin) {
            const loginStatus = checkLoginStatus();
            if (!loginStatus) {
                return; // checkLoginStatus에서 이미 리다이렉트됨
            }
        }
    } catch (error) {
        ErrorHandler.logError('로그인 상태 확인', error);
    }
}, 5 * 60 * 1000); // 5분

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', function() {
    // 필요한 경우 정리 작업 수행
    console.log('대시보드 페이지 언로드');
});

// 전역 함수로 내보내기
window.openControlPanel = openControlPanel;
window.openDisplayPage = openDisplayPage;

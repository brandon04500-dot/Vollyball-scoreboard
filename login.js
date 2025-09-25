// 배구 스코어보드 로그인 시스템
// 구장별 계정 관리 및 인증 (보안 강화 버전)

// 구장별 계정 정보 (개발용 - 간단한 비밀번호)
const courtAccounts = {
    '001': { password: 'court001', name: '1구장' },
    '002': { password: 'court002', name: '2구장' },
    '003': { password: 'court003', name: '3구장' },
    '004': { password: 'court004', name: '4구장' },
    '005': { password: 'court005', name: '5구장' },
    '006': { password: 'court006', name: '6구장' },
    '007': { password: 'court007', name: '7구장' },
    '008': { password: 'court008', name: '8구장' }
};

// DOM 요소들 (DOM 로드 후 초기화)
let loginForm, courtSelect, passwordInput, loginMessage, loginBtn;

// 리다이렉트 방지 플래그
let isRedirecting = false;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 로드 완료, 로그인 시스템 초기화 시작');
    
    // DOM이 완전히 로드된 후 약간의 지연을 두고 초기화
    setTimeout(() => {
        try {
            initializeLogin();
            setupEventListeners();
            
            // 이미 로그인된 상태인지 확인
            checkExistingLogin();
            console.log('로그인 시스템 초기화 완료');
        } catch (error) {
            console.error('로그인 시스템 초기화 중 오류:', error);
        }
    }, 100);
});

// 로그인 시스템 초기화
function initializeLogin() {
    console.log('배구 스코어보드 로그인 시스템 초기화');
    
    // DOM 요소들 초기화
    loginForm = document.getElementById('loginForm');
    courtSelect = document.getElementById('courtId');
    passwordInput = document.getElementById('password');
    loginMessage = document.getElementById('loginMessage');
    loginBtn = document.querySelector('.login-btn');
    
    // DOM 요소들이 제대로 로드되었는지 확인
    if (!loginForm || !courtSelect || !passwordInput || !loginMessage || !loginBtn) {
        console.error('필수 DOM 요소를 찾을 수 없습니다:', {
            loginForm: !!loginForm,
            courtSelect: !!courtSelect,
            passwordInput: !!passwordInput,
            loginMessage: !!loginMessage,
            loginBtn: !!loginBtn
        });
        return;
    }
    
    // 구장 선택 시 비밀번호 자동 입력 (안전한 처리)
    if (courtSelect) {
        courtSelect.addEventListener('change', function() {
            try {
                const selectedCourt = this.value;
                if (selectedCourt && courtAccounts[selectedCourt] && passwordInput) {
                    passwordInput.value = courtAccounts[selectedCourt].password;
                    passwordInput.focus();
                }
            } catch (error) {
                console.error('구장 선택 처리 오류:', error);
            }
        });
    }
}

// 이벤트 리스너 설정 (메모리 관리 강화)
function setupEventListeners() {
    try {
        // 로그인 폼 제출
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
        
        // 키보드 이벤트
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' && loginBtn && !loginBtn.disabled) {
                handleLogin(event);
            }
        });
        
        // 로그인 버튼 클릭 이벤트 (추가 보장)
        if (loginBtn) {
            loginBtn.addEventListener('click', function(event) {
                event.preventDefault();
                if (!loginBtn.disabled) {
                    handleLogin(event);
                }
            });
        }
    } catch (error) {
        console.error('로그인 이벤트 리스너 설정 오류:', error);
    }
}

// 기존 로그인 상태 확인 (에러 처리 강화)
function checkExistingLogin() {
    try {
        const savedLogin = localStorage.getItem('volleyball_login');
        if (!savedLogin) {
            return;
        }

        const loginData = JSON.parse(savedLogin);
        if (!loginData) {
            localStorage.removeItem('volleyball_login');
            return;
        }

        const now = new Date().getTime();
        
        // 24시간 이내 로그인인지 확인
        if (now - loginData.timestamp < 24 * 60 * 60 * 1000) {
            // 이미 리다이렉트 중이면 중복 실행 방지
            if (isRedirecting) {
                return;
            }
            
            isRedirecting = true;
            showMessage(`이미 ${loginData.courtName}에 로그인되어 있습니다.`, 'success');
            
            // 3초 후 대시보드로 이동
            setTimeout(() => {
                redirectToDashboard(loginData.courtId);
            }, 3000);
        } else {
            // 만료된 로그인 정보 삭제
            localStorage.removeItem('volleyball_login');
        }
    } catch (error) {
        console.error('기존 로그인 확인 오류:', error);
        localStorage.removeItem('volleyball_login');
    }
}

// 로그인 처리
function handleLogin(event) {
    console.log('handleLogin 함수 호출됨');
    event.preventDefault();
    
    const courtId = courtSelect.value.trim();
    const password = passwordInput.value.trim();
    
    console.log('로그인 시도:', { courtId, password: password ? '***' : 'empty' });
    
    // 입력값 검증
    if (!courtId) {
        showMessage('구장을 선택해주세요.', 'error');
        courtSelect.focus();
        return;
    }
    
    if (!password) {
        showMessage('비밀번호를 입력해주세요.', 'error');
        passwordInput.focus();
        return;
    }
    
    // 로그인 버튼 로딩 상태
    setLoadingState(true);
    
    // 인증 처리 (개발용 - 간단한 처리)
    setTimeout(() => {
        authenticateUser(courtId, password);
    }, 1000); // 로딩 효과를 위한 지연
}

// 사용자 인증 (개발용 - 간단한 처리)
function authenticateUser(courtId, password) {
    console.log('authenticateUser 함수 호출됨:', { courtId, password: password ? '***' : 'empty' });
    let account; // account 변수를 함수 스코프에서 선언
    
    try {
        account = courtAccounts[courtId];
        console.log('찾은 계정 정보:', account);
        
        if (!account) {
            console.log('계정을 찾을 수 없음:', courtId);
            showMessage('존재하지 않는 구장입니다.', 'error');
            setLoadingState(false);
            return;
        }
        
        // 간단한 비밀번호 검증
        console.log('비밀번호 비교:', { 입력: password, 저장: account.password, 일치: account.password === password });
        if (account.password !== password) {
            console.log('비밀번호 불일치');
            showMessage('비밀번호가 올바르지 않습니다.', 'error');
            setLoadingState(false);
            passwordInput.focus();
            return;
        }
        
        // 로그인 성공
        console.log('로그인 성공!', { courtId, accountName: account.name });
        
        const loginData = {
            courtId: courtId,
            courtName: account.name,
            timestamp: new Date().getTime(),
            loginTime: new Date().toLocaleString('ko-KR')
        };
        
        // 로그인 정보 저장
        localStorage.setItem('volleyball_login', JSON.stringify(loginData));
        console.log('로그인 정보 저장 완료:', loginData);
        
        showMessage(`${account.name} 로그인 성공!`, 'success');
        
        // 즉시 대시보드로 이동
        console.log('대시보드로 리다이렉트 시작...', courtId);
        const targetUrl = `./dashboard.html?court=${courtId}`;
        console.log('이동할 URL:', targetUrl);
        
        // 로딩 상태 해제
        setLoadingState(false);
        
        // 페이지 이동
        window.location.href = targetUrl;
        
    } catch (error) {
        console.error('사용자 인증 오류:', error);
        showMessage('인증 중 오류가 발생했습니다.', 'error');
        setLoadingState(false);
        return;
    }
}

// 대시보드로 리다이렉트
function redirectToDashboard(courtId) {
    console.log('redirectToDashboard 호출됨:', courtId);
    
    // 이미 리다이렉트 중이면 중복 실행 방지
    if (isRedirecting) {
        console.log('이미 리다이렉트 중입니다.');
        return;
    }
    
    isRedirecting = true;
    
    try {
        // 대시보드 페이지로 이동 (구장 ID 파라미터 포함)
        const targetUrl = `./dashboard.html?court=${courtId}`;
        console.log('이동할 URL:', targetUrl);
        
        // 직접 이동
        window.location.href = targetUrl;
        
    } catch (error) {
        console.error('리다이렉트 오류:', error);
        isRedirecting = false; // 에러 시 플래그 리셋
        showMessage('페이지 이동 중 오류가 발생했습니다.', 'error');
    }
}

// 로딩 상태 설정
function setLoadingState(loading) {
    if (loading) {
        loginBtn.disabled = true;
        loginBtn.classList.add('loading');
        loginBtn.innerHTML = '<span class="btn-icon">⏳</span> 로그인 중...';
    } else {
        loginBtn.disabled = false;
        loginBtn.classList.remove('loading');
        loginBtn.innerHTML = '<span class="btn-icon">🏐</span> 로그인';
    }
}

// 메시지 표시
function showMessage(message, type) {
    if (!loginMessage) {
        console.error('loginMessage 요소를 찾을 수 없습니다.');
        return;
    }
    
    try {
        loginMessage.textContent = message;
        loginMessage.className = `message ${type}`;
        loginMessage.style.display = 'block';
        
        // 5초 후 메시지 숨기기
        setTimeout(() => {
            if (loginMessage) {
                loginMessage.style.display = 'none';
            }
        }, 5000);
    } catch (error) {
        console.error('메시지 표시 오류:', error);
    }
}

// 로그아웃 함수 (다른 페이지에서 사용)
function logout() {
    localStorage.removeItem('volleyball_login');
    window.location.href = 'login.html';
}

// 현재 로그인된 구장 정보 가져오기 (에러 처리 강화)
function getCurrentLogin() {
    try {
        const savedLogin = localStorage.getItem('volleyball_login');
        if (!savedLogin) {
            return null;
        }

        const loginData = JSON.parse(savedLogin);
        if (!loginData) {
            localStorage.removeItem('volleyball_login');
            return null;
        }

        return loginData;
    } catch (error) {
        console.error('로그인 정보 가져오기 오류:', error);
        localStorage.removeItem('volleyball_login');
        return null;
    }
}

// 로그인 상태 확인 함수 (다른 페이지에서 사용)
function checkLoginStatus() {
    const loginData = getCurrentLogin();
    if (!loginData) {
        window.location.href = 'login.html';
        return null;
    }
    
    // 24시간 이내 로그인인지 확인
    const now = new Date().getTime();
    if (now - loginData.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('volleyball_login');
        window.location.href = 'login.html';
        return null;
    }
    
    return loginData;
}

// 전역 함수로 내보내기
window.logout = logout;
window.getCurrentLogin = getCurrentLogin;
window.checkLoginStatus = checkLoginStatus;

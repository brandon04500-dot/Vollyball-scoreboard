// 구장 관리자 초기화 (court-manager.js가 로드된 후)
let courtManager, courtInfo;

// court-manager.js가 로드되었는지 확인하고 초기화
function initializeCourtManager() {
    if (window.CourtManager) {
        courtManager = new CourtManager();
        courtInfo = courtManager.retrieveCourtInfo();
    } else {
        // fallback for standalone usage
        courtManager = { generateStorageKey: () => 'volleyballScoreData_004' };
        courtInfo = { id: '004', name: '4구장' };
    }
}

// 스코어보드 데이터 관리
let scoreData = {
    tournamentName: "대회 이름",
    teamA: {
        name: "Home",
        points: 0,
        timeouts: [false, false]
    },
    teamB: {
        name: "Away", 
        points: 0,
        timeouts: [false, false]
    },
    setScore: [0, 0],
    currentSet: 1, // 현재 세트
    servingTeam: null, // 'A', 'B' 또는 null (서브권 없음)
    courtSwapped: false, // 코트 체인지 상태
    videoReviewActive: false, // 비디오판독 상태
    videoReviewType: null // 비디오판독 유형
};

// 이전 상태 추적 (애니메이션 제어용)
let previousServingTeam = null;
// 코트체인지 모션 제거로 인해 불필요한 변수

// DOM 요소들
const elements = {
    tournamentName: document.getElementById('tournament-name-display'),
    teamAName: document.getElementById('teamA-name-display'),
    teamBName: document.getElementById('teamB-name-display'),
    teamAPoints: document.getElementById('teamA-point-display'),
    teamBPoints: document.getElementById('teamB-point-display'),
    setScore: document.getElementById('set-score-display'),
    teamATimeouts: [
        document.getElementById('display-teamA-timeout-1'),
        document.getElementById('display-teamA-timeout-2')
    ],
    teamBTimeouts: [
        document.getElementById('display-teamB-timeout-1'),
        document.getElementById('display-teamB-timeout-2')
    ],
    serveTriangle: document.getElementById('serve-triangle-display'),
    currentSet: document.getElementById('current-set-display'),
    videoReviewOverlay: document.getElementById('video-review-overlay')
};

// 디스플레이 업데이트 (공통 함수 사용)
function updateDisplay() {
    try {
        if (!elements.tournamentName) return; // DOM이 아직 로드되지 않은 경우
        
        console.log('updateDisplay 호출됨, scoreData:', scoreData);
        
        // 대회명 업데이트
        elements.tournamentName.textContent = scoreData.tournamentName;
        
        // 공통 디스플레이 업데이트 함수 사용
        DisplayUtils.updateTeamDisplay('teamA-name-display', 'teamB-name-display', 'teamA-point-display', 'teamB-point-display', scoreData);
        DisplayUtils.updateSetScoreDisplay('set-score-display', scoreData);
        DisplayUtils.updateCurrentSetDisplay('current-set-display', scoreData);
        
        console.log('화면 업데이트 완료 - A팀 점수:', elements.teamAPoints?.textContent, 'B팀 점수:', elements.teamBPoints?.textContent);
        
        // 타임아웃 표시 업데이트
        updateTimeoutDisplay();
        
        // 서브권 표시 업데이트
        updateServeIndicator();
        
        // 비디오판독 상태 업데이트
        updateVideoReviewDisplay();
    } catch (error) {
        ErrorHandler.logError('디스플레이 업데이트', error);
    }
}

// 타임아웃 표시 업데이트 (공통 함수 사용)
function updateTimeoutDisplay() {
    try {
        const timeoutAElementIds = ['display-teamA-timeout-1', 'display-teamA-timeout-2'];
        const timeoutBElementIds = ['display-teamB-timeout-1', 'display-teamB-timeout-2'];
        
        DisplayUtils.updateTimeoutDisplay(timeoutAElementIds, timeoutBElementIds, scoreData);
    } catch (error) {
        ErrorHandler.logError('타임아웃 표시 업데이트', error);
    }
}

// 서브 삼각형 업데이트
function updateServeTriangle(data) {
    try {
        if (!elements.serveTriangle) {
            console.log('serveTriangle 요소를 찾을 수 없습니다.');
            return;
        }
        
        console.log('서브 삼각형 업데이트:', data.servingTeam, '코트체인지:', data.courtSwapped);
        
        // 기존 클래스 제거
        elements.serveTriangle.classList.remove('active', 'team-a', 'team-b');
        
        if (data.servingTeam === 'A') {
            // A팀 서브: 코트체인지 상태에 따라 방향 결정
            if (data.courtSwapped) {
                // 코트체인지된 상태: A팀 서브 → 왼쪽 방향 (A팀 위치)
                elements.serveTriangle.classList.add('active', 'team-a');
                console.log('A팀 서브 (코트체인지): ◀ 삼각형 표시 (왼쪽을 향함)');
            } else {
                // 일반 상태: A팀 서브 → 오른쪽 방향 (B팀을 향함)
                elements.serveTriangle.classList.add('active', 'team-b');
                console.log('A팀 서브 (일반): ▶ 삼각형 표시 (오른쪽을 향함)');
            }
            elements.serveTriangle.textContent = '▲';
        } else if (data.servingTeam === 'B') {
            // B팀 서브: 코트체인지 상태에 따라 방향 결정
            if (data.courtSwapped) {
                // 코트체인지된 상태: B팀 서브 → 오른쪽 방향 (B팀 위치)
                elements.serveTriangle.classList.add('active', 'team-b');
                console.log('B팀 서브 (코트체인지): ▶ 삼각형 표시 (오른쪽을 향함)');
            } else {
                // 일반 상태: B팀 서브 → 왼쪽 방향 (A팀을 향함)
                elements.serveTriangle.classList.add('active', 'team-a');
                console.log('B팀 서브 (일반): ◀ 삼각형 표시 (왼쪽을 향함)');
            }
            elements.serveTriangle.textContent = '▲';
        } else {
            // 서브권이 없을 때는 삼각형 숨김
            elements.serveTriangle.classList.remove('active');
            console.log('서브권 없음: 삼각형 숨김');
        }
    } catch (error) {
        ErrorHandler.logError('서브 삼각형 업데이트', error);
    }
}

// 서브권 표시 업데이트 (공통 함수 사용)
function updateServeIndicator() {
    try {
        updateServeTriangle(scoreData);
        previousServingTeam = scoreData.servingTeam;
    } catch (error) {
        ErrorHandler.logError('서브권 표시 업데이트', error);
    }
}

// 서브권 애니메이션
function animateServeIndicator(team) {
    const indicator = team === 'A' ? elements.serveIndicatorA : elements.serveIndicatorB;
    if (!indicator) return;
    
    // CSS 애니메이션이 자동으로 적용되므로 별도 처리 불필요
    // active 클래스가 추가되면 자동으로 pulse 애니메이션이 실행됨
}

// 비디오판독 상태 표시 업데이트
function updateVideoReviewDisplay() {
    if (!elements.videoReviewOverlay) return;
    
    if (scoreData.videoReviewActive) {
        elements.videoReviewOverlay.style.display = 'flex';
    } else {
        elements.videoReviewOverlay.style.display = 'none';
    }
}

// 점수 업데이트 애니메이션
function animateScoreUpdate(team) {
    const pointElement = team === 'A' ? elements.teamAPoints : elements.teamBPoints;
    if (!pointElement) return;
    
    pointElement.style.animation = 'none';
    setTimeout(() => {
        pointElement.style.animation = 'scoreUpdate 0.3s ease-out';
    }, 10);
}

// LocalStorage에서 데이터 로드 (에러 처리 강화)
function loadFromStorage() {
    try {
        const storageKey = courtManager ? courtManager.generateStorageKey() : 'volleyballScoreData_004';
        const savedData = localStorage.getItem(storageKey);
        console.log('OBS loadFromStorage 호출됨:', storageKey, savedData ? '데이터 있음' : '데이터 없음');
        
        if (savedData) {
            const parsedData = ErrorHandler.safeJSONParse(savedData);
            if (parsedData && SecurityUtils.validateScoreboardData(parsedData)) {
                scoreData = DataValidator.normalizeScoreboardData(parsedData);
                console.log('OBS 데이터 업데이트됨:', parsedData);
                updateDisplay();
            } else {
                ErrorHandler.logError('OBS 데이터 로드', new Error('유효하지 않은 데이터'), { savedData });
                // 기본 데이터로 초기화
                scoreData = DataValidator.normalizeScoreboardData({});
                updateDisplay();
            }
        }
    } catch (error) {
        ErrorHandler.logError('OBS 데이터 로드', error);
        // 기본 데이터로 초기화
        scoreData = DataValidator.normalizeScoreboardData({});
        updateDisplay();
    }
}

// Storage 이벤트 처리 (에러 처리 강화)
function handleStorageChange(event) {
    try {
        const storageKey = courtManager ? courtManager.generateStorageKey() : 'volleyballScoreData_004';
        if (event.key === storageKey) {
            console.log('Storage 이벤트 수신:', event.key, event.newValue);
            
            const newData = ErrorHandler.safeJSONParse(event.newValue);
            if (newData && SecurityUtils.validateScoreboardData(newData)) {
                scoreData = DataValidator.normalizeScoreboardData(newData);
                updateDisplay();
            } else {
                ErrorHandler.logError('Storage 이벤트 처리', new Error('유효하지 않은 데이터'), { newValue: event.newValue });
            }
        }
    } catch (error) {
        ErrorHandler.logError('Storage 이벤트 처리', error, { event });
    }
}

// 비디오 판독 표시
function showVideoReview() {
    if (elements.videoReviewOverlay) {
        elements.videoReviewOverlay.style.display = 'flex';
    }
}

// 비디오 판독 숨기기
function hideVideoReview() {
    if (elements.videoReviewOverlay) {
        elements.videoReviewOverlay.style.display = 'none';
    }
}

// 비디오 판독 상태 확인
function checkVideoReviewStatus() {
    if (scoreData.videoReviewActive) {
        showVideoReview();
    } else {
        hideVideoReview();
    }
}

// 초기화 함수
function init() {
    console.log('display.js 초기화 시작');
    initializeCourtManager();
    updateDisplay();
    setupEventListeners();
    loadFromStorage();
    console.log('display.js 초기화 완료');
}

// 이벤트 리스너 설정 (메모리 관리 강화)
function setupEventListeners() {
    try {
        // LocalStorage에서 데이터 로드
        globalMemoryManager.addEventListener(window, 'storage', handleStorageChange);
        
        // OBS 브라우저 소스용 서버 폴링 (메모리 관리)
        let lastDataString = '';
        let pollCount = 0;
        
        const pollingInterval = globalMemoryManager.addInterval(() => {
            try {
                pollCount++;
                
                // localStorage와 서버 폴링 병행
                const storageKey = courtManager ? courtManager.generateStorageKey() : 'volleyballScoreData_004';
                const storedData = localStorage.getItem(storageKey);
                
                // 디버깅 정보 업데이트
                updateDebugInfo(pollCount, storedData ? '데이터 있음' : '데이터 없음');
                
                if (storedData && storedData !== lastDataString) {
                    lastDataString = storedData;
                    loadFromStorage();
                    console.log('OBS 폴링: localStorage 데이터 변경 감지됨');
                    updateDebugInfo(pollCount, 'localStorage 변경됨!');
                } else {
                    // localStorage가 비어있거나 변경이 없으면 서버에서 데이터 가져오기 시도 (2초마다)
                    if (pollCount % 2 === 0) { // 2초마다
                        fetchServerData();
                    }
                }
            } catch (error) {
                ErrorHandler.logError('OBS 폴링', error);
                updateDebugInfo(pollCount, '오류: ' + error.message);
            }
        }, 1000); // 1초로 조정 (localStorage 변경 감지용)
        
        // 폴링 인터벌 ID 저장 (필요시 정리용)
        window.pollingInterval = pollingInterval;
    } catch (error) {
        ErrorHandler.logError('이벤트 리스너 설정', error);
    }
}

// 서버에서 데이터 가져오기 (OBS용, 에러 처리 강화)
function fetchServerData() {
    try {
        const courtId = courtManager ? courtManager.courtId : '004';
        fetch(`/api/scoreboard/${courtId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (data && data.tournamentName && SecurityUtils.validateScoreboardData(data)) {
                    // 기존 데이터와 비교하여 변경사항이 있을 때만 업데이트
                    const normalizedData = DataValidator.normalizeScoreboardData(data);
                    const dataString = ErrorHandler.safeJSONStringify(normalizedData);
                    const currentString = ErrorHandler.safeJSONStringify(scoreData);
                    
                    if (dataString && dataString !== currentString) {
                        scoreData = normalizedData;
                        updateDisplay();
                        updateDebugInfo(0, '서버 데이터 업데이트됨!');
                        console.log('OBS 서버 데이터 업데이트:', data);
                        console.log('현재 scoreData:', scoreData);
                    } else {
                        updateDebugInfo(0, '서버 데이터 동일');
                    }
                } else {
                    ErrorHandler.logError('서버 데이터 검증', new Error('유효하지 않은 서버 데이터'), { data });
                    updateDebugInfo(0, '서버 데이터 없음');
                }
            })
            .catch(error => {
                ErrorHandler.logError('서버 데이터 가져오기', error, { courtId });
                updateDebugInfo(0, '서버 연결 실패');
            });
    } catch (error) {
        ErrorHandler.logError('fetchServerData', error, { courtId: courtManager ? courtManager.courtId : '004' });
        updateDebugInfo(0, 'fetch 오류');
    }
}

// OBS 디버깅 정보 업데이트
function updateDebugInfo(pollCount, status) {
    try {
        const debugStatus = document.getElementById('debug-status');
        const debugTime = document.getElementById('debug-time');
        
        if (debugStatus) {
            debugStatus.textContent = `상태: ${status}`;
        }
        if (debugTime) {
            debugTime.textContent = `폴링: ${pollCount}회 (${new Date().toLocaleTimeString()})`;
        }
    } catch (error) {
        // 디버깅 요소가 없으면 무시
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', init);
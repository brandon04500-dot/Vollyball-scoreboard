// 구장 관리자 초기화 (court-manager.js가 로드된 후)
let courtManager, courtInfo;

// BroadcastChannel 초기화
let broadcastChannel;

// court-manager.js가 로드되었는지 확인하고 초기화
function initializeCourtManager() {
    if (window.CourtManager) {
        courtManager = new CourtManager();
        courtInfo = courtManager.retrieveCourtInfo();
    } else {
        // fallback for standalone usage
        courtManager = { generateStorageKey: () => 'volleyballScoreData' };
        courtInfo = { id: '008', name: '8구장' };
    }
}

// 스코어보드 데이터 관리
let scoreData = {
    tournamentName: "대회 이름",
    teamA: {
        name: "Home",
        points: 0,
        timeouts: [false, false, false], // 3개의 타임아웃
        setsWon: 0 // 이긴 세트 수
    },
    teamB: {
        name: "Away", 
        points: 0,
        timeouts: [false, false, false], // 3개의 타임아웃
        setsWon: 0 // 이긴 세트 수
    },
    currentSet: 1, // 현재 세트
    servingTeam: null, // 'A', 'B' 또는 null (서브권 없음)
    courtSwapped: false, // 코트 체인지 상태
    videoReviewActive: false, // 비디오판독 상태
    videoReviewType: null // 비디오판독 유형
};

// 이전 상태 추적 (애니메이션 제어용)
let previousServingTeam = null;
let previousCourtSwapped = false; // 코트 체인지 상태 추적

// DOM 요소들 (초기화 시점에 null로 설정)
let elements = {
    tournamentName: null,
    teamAName: null,
    teamBName: null,
    teamAPoints: null,
    teamBPoints: null,
    teamASets: [null, null, null],
    teamBSets: [null, null, null],
    serveTriangle: null,
    currentSet: null,
    videoReviewOverlay: null
};

// DOM 요소 초기화 함수
function initializeElements() {
    elements.tournamentName = document.getElementById('tournament-name-display');
    elements.teamAName = document.getElementById('teamA-name-display');
    elements.teamBName = document.getElementById('teamB-name-display');
    elements.teamAPoints = document.getElementById('teamA-point-display');
    elements.teamBPoints = document.getElementById('teamB-point-display');
    elements.teamASets = [
        document.getElementById('display-teamA-set-1'),
        document.getElementById('display-teamA-set-2'),
        document.getElementById('display-teamA-set-3')
    ];
    elements.teamBSets = [
        document.getElementById('display-teamB-set-1'),
        document.getElementById('display-teamB-set-2'),
        document.getElementById('display-teamB-set-3')
    ];
    elements.serveTriangle = document.getElementById('serve-triangle-display');
    elements.currentSet = document.getElementById('current-set-display');
    elements.videoReviewOverlay = document.getElementById('video-review-overlay');
    
    console.log('DOM 요소 초기화 완료:', {
        teamASets: elements.teamASets,
        teamBSets: elements.teamBSets
    });
}

// 디스플레이 업데이트 (공통 함수 사용)
function updateDisplay() {
    try {
        if (!elements.tournamentName) return; // DOM이 아직 로드되지 않은 경우
        
        console.log('updateDisplay 호출됨, scoreData:', scoreData);
        
        // 대회명 업데이트
        elements.tournamentName.textContent = scoreData.tournamentName;
        
        // 공통 디스플레이 업데이트 함수 사용
        DisplayUtils.updateTeamDisplay('teamA-name-display', 'teamB-name-display', 'teamA-point-display', 'teamB-point-display', scoreData);
        DisplayUtils.updateCurrentSetDisplay('current-set-display', scoreData);
        
        console.log('화면 업데이트 완료 - A팀 점수:', elements.teamAPoints?.textContent, 'B팀 점수:', elements.teamBPoints?.textContent);
        
        // 세트 아이콘 업데이트
        updateSetDisplay();
        
        // 작전타임 표시 업데이트
        updateTimeoutDisplay();
        
        // 서브권 표시 업데이트
        updateServeIndicator();
        
        // 비디오판독 상태 업데이트
        updateVideoReviewDisplay();
    } catch (error) {
        ErrorHandler.logError('디스플레이 업데이트', error);
    }
}

// 타임아웃 표시 업데이트 (3개 타임아웃 지원)
function updateTimeoutDisplay() {
    try {
        // A팀 타임아웃 표시 업데이트
        if (elements.teamATimeouts) {
            elements.teamATimeouts.forEach((element, index) => {
                if (element) {
                    if (scoreData.teamA.timeouts && scoreData.teamA.timeouts[index]) {
                        element.classList.add('used');
                    } else {
                        element.classList.remove('used');
                    }
                }
            });
        }
        
        // B팀 타임아웃 표시 업데이트
        if (elements.teamBTimeouts) {
            elements.teamBTimeouts.forEach((element, index) => {
                if (element) {
                    if (scoreData.teamB.timeouts && scoreData.teamB.timeouts[index]) {
                        element.classList.add('used');
                    } else {
                        element.classList.remove('used');
                    }
                }
            });
        }
    } catch (error) {
        ErrorHandler.logError('타임아웃 표시 업데이트', error);
    }
}

// 세트 아이콘 업데이트 (3개 세트 지원)
function updateSetDisplay() {
    try {
        console.log('=== 세트 아이콘 업데이트 시작 ===');
        console.log('A팀 세트 수:', scoreData.teamA.setsWon);
        console.log('B팀 세트 수:', scoreData.teamB.setsWon);
        console.log('A팀 세트 요소들:', elements.teamASets);
        console.log('B팀 세트 요소들:', elements.teamBSets);
        
        // A팀 세트 아이콘 업데이트
        for (let i = 0; i < 3; i++) {
            const element = elements.teamASets[i];
            if (element) {
                const shouldBeOn = scoreData.teamA.setsWon && scoreData.teamA.setsWon >= i + 1;
                console.log(`A팀 세트 아이콘 ${i + 1} 체크:`, {
                    element: element,
                    setsWon: scoreData.teamA.setsWon,
                    shouldBeOn: shouldBeOn,
                    currentClass: element.className
                });
                
                if (shouldBeOn) {
                    element.classList.add('won');
                    console.log(`A팀 세트 아이콘 ${i + 1} 켜짐 (총 ${scoreData.teamA.setsWon}세트)`);
                } else {
                    element.classList.remove('won');
                    console.log(`A팀 세트 아이콘 ${i + 1} 꺼짐`);
                }
                
                // 업데이트 후 클래스 확인
                console.log(`A팀 세트 아이콘 ${i + 1} 업데이트 후 클래스:`, element.className);
            } else {
                console.log(`A팀 세트 아이콘 ${i + 1} 요소 없음`);
            }
        }
        
        // B팀 세트 아이콘 업데이트
        for (let i = 0; i < 3; i++) {
            const element = elements.teamBSets[i];
            if (element) {
                const shouldBeOn = scoreData.teamB.setsWon && scoreData.teamB.setsWon >= i + 1;
                console.log(`B팀 세트 아이콘 ${i + 1} 체크:`, {
                    element: element,
                    setsWon: scoreData.teamB.setsWon,
                    shouldBeOn: shouldBeOn,
                    currentClass: element.className
                });
                
                if (shouldBeOn) {
                    element.classList.add('won');
                    console.log(`B팀 세트 아이콘 ${i + 1} 켜짐 (총 ${scoreData.teamB.setsWon}세트)`);
                } else {
                    element.classList.remove('won');
                    console.log(`B팀 세트 아이콘 ${i + 1} 꺼짐`);
                }
                
                // 업데이트 후 클래스 확인
                console.log(`B팀 세트 아이콘 ${i + 1} 업데이트 후 클래스:`, element.className);
            } else {
                console.log(`B팀 세트 아이콘 ${i + 1} 요소 없음`);
            }
        }
        
        console.log('=== 세트 아이콘 업데이트 완료 ===');
    } catch (error) {
        ErrorHandler.logError('세트 아이콘 업데이트', error);
    }
}

// 세트 승리 처리 함수
function winSet(team) {
    try {
        console.log(`=== ${team}팀 세트 승리 시작 ===`);
        console.log('승리 전 상태:', {
            A팀세트: scoreData.teamA.setsWon,
            B팀세트: scoreData.teamB.setsWon,
            현재세트: scoreData.currentSet
        });
        
        if (team === 'A') {
            scoreData.teamA.setsWon = (scoreData.teamA.setsWon || 0) + 1;
            console.log('A팀 세트 승리! 총 세트:', scoreData.teamA.setsWon);
        } else if (team === 'B') {
            scoreData.teamB.setsWon = (scoreData.teamB.setsWon || 0) + 1;
            console.log('B팀 세트 승리! 총 세트:', scoreData.teamB.setsWon);
        }
        
        // 다음 세트로 이동
        scoreData.currentSet = (scoreData.currentSet || 1) + 1;
        
        // 점수 초기화 (새 세트 시작)
        scoreData.teamA.points = 0;
        scoreData.teamB.points = 0;
        
        // 작전타임 초기화 (새 세트에서는 작전타임 리셋)
        scoreData.teamA.timeouts = [false, false];
        scoreData.teamB.timeouts = [false, false];
        
        // 서브권 초기화 (새 세트에서는 서브권 없음)
        scoreData.servingTeam = null;
        
        // 코트 체인지 상태는 유지 (작전타임과 스코어 보존)
        // scoreData.courtSwapped는 그대로 유지
        
        console.log('승리 후 상태:', {
            A팀세트: scoreData.teamA.setsWon,
            B팀세트: scoreData.teamB.setsWon,
            현재세트: scoreData.currentSet
        });
        
        // 화면 업데이트
        updateDisplay();
        
        // 데이터 저장
        saveToStorage();
        
        console.log(`세트 승리 처리 완료 - A팀: ${scoreData.teamA.setsWon}세트, B팀: ${scoreData.teamB.setsWon}세트, 현재: ${scoreData.currentSet}세트`);
    } catch (error) {
        ErrorHandler.logError('세트 승리 처리', error);
    }
}

// 세트 승리 취소 함수 (실수로 클릭했을 때)
function undoSetWin(team) {
    try {
        if (team === 'A' && scoreData.teamA.setsWon > 0) {
            scoreData.teamA.setsWon -= 1;
            scoreData.currentSet = Math.max(1, scoreData.currentSet - 1);
            console.log('A팀 세트 승리 취소! 총 세트:', scoreData.teamA.setsWon);
        } else if (team === 'B' && scoreData.teamB.setsWon > 0) {
            scoreData.teamB.setsWon -= 1;
            scoreData.currentSet = Math.max(1, scoreData.currentSet - 1);
            console.log('B팀 세트 승리 취소! 총 세트:', scoreData.teamB.setsWon);
        }
        
        // 화면 업데이트
        updateDisplay();
        
        // 데이터 저장
        saveToStorage();
    } catch (error) {
        ErrorHandler.logError('세트 승리 취소', error);
    }
}


// 코트 체인지 함수 (작전타임과 스코어 보존)
function toggleCourtChange() {
    try {
        console.log('=== 코트 체인지 시작 ===');
        console.log('체인지 전 상태:', {
            A팀세트: scoreData.teamA.setsWon,
            B팀세트: scoreData.teamB.setsWon,
            A팀점수: scoreData.teamA.points,
            B팀점수: scoreData.teamB.points,
            A팀타임아웃: scoreData.teamA.timeouts,
            B팀타임아웃: scoreData.teamB.timeouts
        });
        
        // 팀 A와 팀 B의 데이터를 임시 저장
        const tempTeamA = { ...scoreData.teamA };
        const tempTeamB = { ...scoreData.teamB };
        
        console.log('임시 저장된 데이터:');
        console.log('tempTeamA:', tempTeamA);
        console.log('tempTeamB:', tempTeamB);
        
        // 팀 데이터 교체 (세트 스코어, 점수, 타임아웃 모두 보존)
        scoreData.teamA = {
            ...tempTeamB,
            name: tempTeamA.name // 팀명은 그대로 유지
        };
        scoreData.teamB = {
            ...tempTeamA,
            name: tempTeamB.name // 팀명은 그대로 유지
        };
        
        console.log('교체 후 데이터:');
        console.log('scoreData.teamA:', scoreData.teamA);
        console.log('scoreData.teamB:', scoreData.teamB);
        
        console.log('팀 데이터 교체 완료:', {
            'A팀(원래B팀)': {
                name: scoreData.teamA.name,
                setsWon: scoreData.teamA.setsWon,
                points: scoreData.teamA.points,
                timeouts: scoreData.teamA.timeouts
            },
            'B팀(원래A팀)': {
                name: scoreData.teamB.name,
                setsWon: scoreData.teamB.setsWon,
                points: scoreData.teamB.points,
                timeouts: scoreData.teamB.timeouts
            }
        });
        
        // 코트 체인지 상태 토글
        scoreData.courtSwapped = !scoreData.courtSwapped;
        
        console.log('체인지 후 상태:', {
            A팀세트: scoreData.teamA.setsWon,
            B팀세트: scoreData.teamB.setsWon,
            A팀점수: scoreData.teamA.points,
            B팀점수: scoreData.teamB.points,
            A팀타임아웃: scoreData.teamA.timeouts,
            B팀타임아웃: scoreData.teamB.timeouts
        });
        
        // 서브권 표시 업데이트 (방향 변경)
        updateServeIndicator();
        
        // 화면 업데이트
        updateDisplay();
        
        // 현재 표시 중인 작전타임이 있다면 위치 업데이트
        const area = document.getElementById('timeout-display-area');
        if (area && area.style.opacity === '1' && area.style.visibility === 'visible') {
            const visibleIndicator = area.querySelector('.timeout-indicator.show');
            if (visibleIndicator) {
                const team = visibleIndicator.id.includes('teamA') ? 'A' : 'B';
                console.log(`코트체인지로 인한 작전타임 위치 업데이트: ${team}팀`);
                
                // 코트체인지 상태에 따라 올바른 컨테이너 선택
                const isCourtSwapped = scoreData.courtSwapped;
                let teamContainer;
                if (team === 'A') {
                    teamContainer = document.querySelector(isCourtSwapped ? '.team-score-container:last-child' : '.team-score-container:first-child');
                } else {
                    teamContainer = document.querySelector(isCourtSwapped ? '.team-score-container:first-child' : '.team-score-container:last-child');
                }
                
                if (teamContainer) {
                    const rect = teamContainer.getBoundingClientRect();
                    area.style.position = 'fixed';
                    area.style.top = (rect.bottom + 10) + 'px';
                    area.style.left = (rect.left + rect.width / 2) + 'px';
                    area.style.transform = 'translateX(-50%)';
                    console.log(`${team}팀 작전타임 위치 업데이트 완료 (${isCourtSwapped ? '코트체인지됨' : '일반상태'})`);
                }
            }
        }
        
        // 데이터 저장
        saveToStorage();
        
        console.log('코트 체인지 완료 - 세트 스코어, 점수, 타임아웃 모두 보존됨');
    } catch (error) {
        ErrorHandler.logError('코트 체인지', error);
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

// LocalStorage에 데이터 저장
function saveToStorage() {
    try {
        const storageKey = courtManager ? courtManager.generateStorageKey() : 'volleyballScoreData';
        const dataString = ErrorHandler.safeJSONStringify(scoreData);
        if (dataString) {
            localStorage.setItem(storageKey, dataString);
            console.log('데이터 저장 완료:', scoreData);
        }
    } catch (error) {
        ErrorHandler.logError('데이터 저장', error);
    }
}

// 기존 setScore를 setsWon으로 변환하는 함수 (코트 체인지 상태 고려)
function convertSetScoreToSetsWon(data) {
    try {
        // 기존 setScore가 있으면 setsWon으로 변환
        if (data.setScore && Array.isArray(data.setScore) && data.setScore.length >= 2) {
            const [originalTeamASets, originalTeamBSets] = data.setScore;
            
            // teamA와 teamB 객체가 없으면 생성
            if (!data.teamA) data.teamA = {};
            if (!data.teamB) data.teamB = {};
            
            // 코트 체인지 상태에 따라 setsWon 할당
            if (data.courtSwapped) {
                // 코트 체인지된 상태: setScore의 순서가 바뀜
                data.teamA.setsWon = originalTeamBSets || 0; // 원래 B팀 세트를 A팀에
                data.teamB.setsWon = originalTeamASets || 0; // 원래 A팀 세트를 B팀에
                console.log('setScore를 setsWon으로 변환 (코트체인지됨):', {
                    기존: data.setScore,
                    A팀세트: data.teamA.setsWon,
                    B팀세트: data.teamB.setsWon,
                    코트체인지: data.courtSwapped
                });
            } else {
                // 일반 상태: setScore 순서 그대로
                data.teamA.setsWon = originalTeamASets || 0;
                data.teamB.setsWon = originalTeamBSets || 0;
                console.log('setScore를 setsWon으로 변환 (일반상태):', {
                    기존: data.setScore,
                    A팀세트: data.teamA.setsWon,
                    B팀세트: data.teamB.setsWon,
                    코트체인지: data.courtSwapped
                });
            }
        }
        
        // setsWon이 없으면 0으로 초기화
        if (!data.teamA) data.teamA = {};
        if (!data.teamB) data.teamB = {};
        if (data.teamA.setsWon === undefined) data.teamA.setsWon = 0;
        if (data.teamB.setsWon === undefined) data.teamB.setsWon = 0;
        
        return data;
    } catch (error) {
        ErrorHandler.logError('setScore 변환', error);
        return data;
    }
}

// LocalStorage에서 데이터 로드 (에러 처리 강화)
function loadFromStorage() {
    try {
        const storageKey = courtManager ? courtManager.generateStorageKey() : 'volleyballScoreData';
        const savedData = localStorage.getItem(storageKey);
        console.log('OBS loadFromStorage 호출됨:', storageKey, savedData ? '데이터 있음' : '데이터 없음');
        
        if (savedData) {
            const parsedData = ErrorHandler.safeJSONParse(savedData);
            if (parsedData && SecurityUtils.validateScoreboardData(parsedData)) {
                // setScore를 setsWon으로 변환
                const convertedData = convertSetScoreToSetsWon(parsedData);
                
                // DataValidator를 우회하고 직접 할당 (setsWon 속성 보존)
                scoreData = {
                    ...DataValidator.normalizeScoreboardData(convertedData),
                    teamA: {
                        ...DataValidator.normalizeScoreboardData(convertedData).teamA,
                        setsWon: convertedData.teamA.setsWon || 0
                    },
                    teamB: {
                        ...DataValidator.normalizeScoreboardData(convertedData).teamB,
                        setsWon: convertedData.teamB.setsWon || 0
                    }
                };
                
                console.log('OBS 데이터 업데이트됨 (변환 후):', scoreData);
                console.log('A팀 setsWon:', scoreData.teamA.setsWon);
                console.log('B팀 setsWon:', scoreData.teamB.setsWon);
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
        const storageKey = courtManager ? courtManager.generateStorageKey() : 'volleyballScoreData';
        if (event.key === storageKey) {
            console.log('Storage 이벤트 수신:', event.key, event.newValue);
            
            const newData = ErrorHandler.safeJSONParse(event.newValue);
            if (newData && SecurityUtils.validateScoreboardData(newData)) {
                // setScore를 setsWon으로 변환
                const convertedData = convertSetScoreToSetsWon(newData);
                
                // DataValidator를 우회하고 직접 할당 (setsWon 속성 보존)
                scoreData = {
                    ...DataValidator.normalizeScoreboardData(convertedData),
                    teamA: {
                        ...DataValidator.normalizeScoreboardData(convertedData).teamA,
                        setsWon: convertedData.teamA.setsWon || 0
                    },
                    teamB: {
                        ...DataValidator.normalizeScoreboardData(convertedData).teamB,
                        setsWon: convertedData.teamB.setsWon || 0
                    }
                };
                
                console.log('Storage 이벤트 데이터 변환 후:', scoreData);
                console.log('A팀 setsWon:', scoreData.teamA.setsWon);
                console.log('B팀 setsWon:', scoreData.teamB.setsWon);
                
                // 코트 체인지 상태 확인
                if (newData.courtSwapped !== previousCourtSwapped) {
                    console.log('코트 체인지 감지됨!');
                    console.log('이전 코트체인지:', previousCourtSwapped, '현재 코트체인지:', newData.courtSwapped);
                }
                
                // 이전 상태 업데이트
                previousCourtSwapped = newData.courtSwapped;
                
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
    initializeElements(); // DOM 요소 초기화 추가
    updateDisplay();
    setupEventListeners();
    loadFromStorage();
    
    // BroadcastChannel 초기화
    try {
        broadcastChannel = new BroadcastChannel('scoreboard_updates');
        broadcastChannel.addEventListener('message', handleBroadcastMessage);
        console.log('BroadcastChannel 초기화 완료');
    } catch (error) {
        console.log('BroadcastChannel 지원하지 않음:', error);
    }
    
    // 작전타임 영역 확인 및 디버깅
    setTimeout(() => {
        console.log('=== 작전타임 영역 확인 ===');
        const area = document.getElementById('timeout-display-area');
        const indicatorA = document.getElementById('timeout-teamA');
        const indicatorB = document.getElementById('timeout-teamB');
        
        console.log('timeout-display-area:', area);
        console.log('timeout-teamA:', indicatorA);
        console.log('timeout-teamB:', indicatorB);
        
        if (!area) {
            console.error('작전타임 영역이 없습니다!');
        }
        if (!indicatorA) {
            console.error('A팀 작전타임 아이콘이 없습니다!');
        }
        if (!indicatorB) {
            console.error('B팀 작전타임 아이콘이 없습니다!');
        }
    }, 1000);
    
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
                const storageKey = courtManager ? courtManager.generateStorageKey() : 'volleyballScoreData';
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
        const courtId = courtManager ? courtManager.courtId : '001';
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
        ErrorHandler.logError('fetchServerData', error, { courtId: courtManager ? courtManager.courtId : '001' });
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

// 전역 함수로 노출 (다른 파일에서 사용 가능)
// 작전타임 표시 함수들
function showTimeoutIndicator(team, timeoutNumber = null) {
    console.log(`작전타임 표시 시도: ${team}팀`);
    
    // timeoutNumber가 제공되지 않은 경우 오류
    if (timeoutNumber === null) {
        console.error(`${team}팀 작전타임 번호가 제공되지 않음 - 테스트용으로는 testTimeout1() 또는 testTimeout2() 사용`);
        return;
    }
    
    console.log(`${team}팀 작전타임 번호: ${timeoutNumber}번째`);
    
    // timeoutNumber가 0이거나 3 이상인 경우 처리하지 않음
    if (timeoutNumber === 0) {
        console.log(`${team}팀 작전타임 리셋됨 - 표시하지 않음`);
        return;
    }
    
    if (timeoutNumber > 2) {
        console.log(`${team}팀 작전타임 번호가 잘못됨: ${timeoutNumber} - 표시하지 않음`);
        return;
    }
    
    // 작전타임 영역을 해당 팀 밑에 표시
    const area = document.getElementById('timeout-display-area');
    if (area) {
        console.log(`작전타임 위치 계산: 팀=${team}`);
        
        // 팀별 컨테이너 선택 (코트체인지 상태 고려)
        let teamContainer;
        const isCourtSwapped = scoreData.courtSwapped;
        console.log(`코트체인지 상태: ${isCourtSwapped}`);
        
        if (team === 'A') {
            // A팀: 코트체인지되지 않으면 왼쪽, 코트체인지되면 오른쪽
            teamContainer = document.querySelector(isCourtSwapped ? '.team-score-container:last-child' : '.team-score-container:first-child');
            console.log('A팀 컨테이너 선택:', teamContainer, `(${isCourtSwapped ? '오른쪽' : '왼쪽'})`);
        } else if (team === 'B') {
            // B팀: 코트체인지되지 않으면 오른쪽, 코트체인지되면 왼쪽
            teamContainer = document.querySelector(isCourtSwapped ? '.team-score-container:first-child' : '.team-score-container:last-child');
            console.log('B팀 컨테이너 선택:', teamContainer, `(${isCourtSwapped ? '왼쪽' : '오른쪽'})`);
        }
        
        if (teamContainer) {
            const rect = teamContainer.getBoundingClientRect();
            area.style.position = 'fixed';
            area.style.top = (rect.bottom + 10) + 'px';
            area.style.left = (rect.left + rect.width / 2) + 'px';
            area.style.transform = 'translateX(-50%)';
            console.log(`${team}팀 컨테이너 위치:`, rect);
        } else {
            console.log(`${team}팀 컨테이너를 찾을 수 없음, 백업 위치 사용`);
            // 백업: 스코어보드 하단 중앙에 표시
            const scoreboard = document.querySelector('.display-board');
            if (scoreboard) {
                const rect = scoreboard.getBoundingClientRect();
                area.style.position = 'fixed';
                area.style.top = (rect.bottom + 20) + 'px';
                area.style.left = '50%';
                area.style.transform = 'translateX(-50%)';
            }
        }
        
        area.style.opacity = '1';
        area.style.visibility = 'visible';
        console.log(`${team}팀 작전타임 영역 표시됨`);
    }
    
    // 먼저 모든 작전타임 숨기기
    const allIndicators = document.querySelectorAll('.timeout-indicator');
    allIndicators.forEach(indicator => {
        indicator.classList.remove('show');
        indicator.style.display = 'none';
    });
    
    const indicator = document.getElementById(`timeout-team${team}`);
    console.log('작전타임 요소 찾기:', indicator);
    
    if (indicator) {
        // 작전타임 번호에 따라 텍스트 업데이트
        indicator.textContent = `TIME OUT ${timeoutNumber}`;
        
        // CSS 클래스와 스타일로 표시
        indicator.style.display = 'flex';
        indicator.classList.add('show');
        indicator.style.animation = 'timeoutFadeIn 0.3s ease-in-out';
        
        console.log(`${team}팀 작전타임 ${timeoutNumber} 표시됨`);
        
        // 5초 후 자동으로 사라지게 설정
        setTimeout(() => {
            hideTimeoutIndicator(team);
        }, 5000);
    } else {
        console.error(`작전타임 요소를 찾을 수 없음: timeout-team${team}`);
    }
}

function hideTimeoutIndicator(team) {
    const indicator = document.getElementById(`timeout-team${team}`);
    if (indicator) {
        indicator.style.animation = 'timeoutFadeOut 0.3s ease-in-out';
        indicator.classList.remove('show');
        
        setTimeout(() => {
            indicator.style.display = 'none';
            
            // 모든 작전타임이 숨겨지면 영역 자체도 숨기기
            const allIndicators = document.querySelectorAll('.timeout-indicator');
            const visibleIndicators = Array.from(allIndicators).filter(ind => 
                ind.style.display !== 'none'
            );
            
            if (visibleIndicators.length === 0) {
                const area = document.getElementById('timeout-display-area');
                if (area) {
                    area.style.opacity = '0';
                    area.style.visibility = 'hidden';
                    console.log('작전타임 영역 숨김');
                }
            }
        }, 300);
    }
}

// 작전타임 표시 업데이트 (기존 timeout 로직과 연동)
function updateTimeoutDisplay() {
    // A팀 작전타임 확인
    const aTeamTimeouts = scoreData.teamA.timeouts || [];
    const aTeamActiveTimeouts = aTeamTimeouts.filter(timeout => timeout === true).length;
    
    // B팀 작전타임 확인
    const bTeamTimeouts = scoreData.teamB.timeouts || [];
    const bTeamActiveTimeouts = bTeamTimeouts.filter(timeout => timeout === true).length;
    
    // 작전타임이 활성화되면 표시
    if (aTeamActiveTimeouts > 0) {
        showTimeoutIndicator('A');
    }
    
    if (bTeamActiveTimeouts > 0) {
        showTimeoutIndicator('B');
    }
}

window.winSet = winSet;
window.undoSetWin = undoSetWin;
window.toggleCourtChange = toggleCourtChange;
window.showTimeoutIndicator = showTimeoutIndicator;
window.hideTimeoutIndicator = hideTimeoutIndicator;

// BroadcastChannel 메시지 핸들러
function handleBroadcastMessage(event) {
    try {
        const message = event.data;
        console.log('BroadcastChannel 메시지 수신:', message);
        console.log('현재 구장 ID:', courtInfo.id);
        
        // 현재 구장과 일치하는지 확인
        if (message.courtId && message.courtId !== courtInfo.id) {
            console.log('다른 구장의 메시지, 무시:', message.courtId);
            return; // 다른 구장의 메시지는 무시
        }
        
        // 작전타임 표시 요청 처리
        if (message.type === 'showTimeout' && message.team) {
            console.log(`${message.team}팀 작전타임 표시 요청 처리, 번호: ${message.timeoutNumber}`);
            
            if (message.timeoutNumber === 0) {
                // 작전타임이 리셋된 경우 숨기기
                hideTimeoutIndicator(message.team);
            } else {
                // 작전타임 표시
                showTimeoutIndicator(message.team, message.timeoutNumber);
            }
        } else {
            console.log('알 수 없는 메시지 타입:', message.type);
        }
    } catch (error) {
        console.error('BroadcastChannel 메시지 처리 오류:', error);
    }
}

// 작전타임 테스트 함수 (기본값 1번)
window.testTimeout = function(team) {
    console.log(`${team}팀 작전타임 1번 테스트`);
    showTimeoutIndicator(team, 1);
};

// 1번 작전타임 테스트 (강제)
window.testTimeout1 = function(team) {
    console.log(`${team}팀 작전타임 1번 테스트 (강제)`);
    showTimeoutIndicator(team, 1);
};

// 2번 작전타임 테스트 (강제)
window.testTimeout2 = function(team) {
    console.log(`${team}팀 작전타임 2번 테스트 (강제)`);
    showTimeoutIndicator(team, 2);
};

// 작전타임 디버깅 함수
window.debugTimeout = function() {
    console.log('=== 작전타임 디버깅 ===');
    console.log('timeout-display-area:', document.getElementById('timeout-display-area'));
    console.log('현재 scoreData:', scoreData);
    console.log('A팀 timeouts:', scoreData.teamA.timeouts);
    console.log('B팀 timeouts:', scoreData.teamB.timeouts);
};

// scoreData 초기화 함수
window.resetScoreData = function() {
    console.log('scoreData 초기화 중...');
    scoreData.teamA.timeouts = [false, false];
    scoreData.teamB.timeouts = [false, false];
    console.log('초기화 완료:', scoreData);
};

// 코트체인지 테스트 함수
window.testCourtChange = function() {
    console.log('=== 코트체인지 테스트 ===');
    console.log('체인지 전 상태:');
    console.log('A팀:', scoreData.teamA);
    console.log('B팀:', scoreData.teamB);
    
    toggleCourtChange();
    
    console.log('체인지 후 상태:');
    console.log('A팀:', scoreData.teamA);
    console.log('B팀:', scoreData.teamB);
};

// 작전타임 보존 테스트 함수
window.testTimeoutPreservation = function() {
    console.log('=== 작전타임 보존 테스트 ===');
    
    // 1. 초기 상태 설정
    scoreData.teamA.timeouts = [true, false]; // A팀 1번 작전타임 사용
    scoreData.teamB.timeouts = [false, true]; // B팀 2번 작전타임 사용
    console.log('초기 설정:');
    console.log('A팀 timeouts:', scoreData.teamA.timeouts);
    console.log('B팀 timeouts:', scoreData.teamB.timeouts);
    
    // 2. 코트체인지 실행
    console.log('코트체인지 실행...');
    toggleCourtChange();
    
    // 3. 결과 확인
    console.log('코트체인지 후:');
    console.log('A팀 timeouts:', scoreData.teamA.timeouts, '(원래 B팀 데이터여야 함)');
    console.log('B팀 timeouts:', scoreData.teamB.timeouts, '(원래 A팀 데이터여야 함)');
    
    // 4. 예상 결과 확인
    const expectedA = [false, true]; // 원래 B팀 데이터
    const expectedB = [true, false]; // 원래 A팀 데이터
    
    console.log('예상 결과:');
    console.log('A팀 예상:', expectedA, '실제:', scoreData.teamA.timeouts, '일치:', JSON.stringify(scoreData.teamA.timeouts) === JSON.stringify(expectedA));
    console.log('B팀 예상:', expectedB, '실제:', scoreData.teamB.timeouts, '일치:', JSON.stringify(scoreData.teamB.timeouts) === JSON.stringify(expectedB));
};

// 코트체인지 후 작전타임 위치 테스트
window.testTimeoutAfterCourtChange = function() {
    console.log('=== 코트체인지 후 작전타임 위치 테스트 ===');
    
    // 1. 초기 상태에서 작전타임 표시
    console.log('1. 초기 상태에서 A팀 작전타임 표시');
    testTimeout1('A');
    
    // 2. 코트체인지 실행
    console.log('2. 코트체인지 실행');
    toggleCourtChange();
    
    // 3. 코트체인지 후 A팀 작전타임 표시 (위치가 바뀌어야 함)
    console.log('3. 코트체인지 후 A팀 작전타임 표시 (오른쪽에 표시되어야 함)');
    testTimeout1('A');
    
    // 4. B팀 작전타임도 테스트
    console.log('4. 코트체인지 후 B팀 작전타임 표시 (왼쪽에 표시되어야 함)');
    testTimeout1('B');
};

// 간단한 작전타임 테스트
window.simpleTimeout = function(team) {
    console.log(`간단한 작전타임 테스트: ${team}팀`);
    const indicator = document.getElementById(`timeout-team${team}`);
    if (indicator) {
        indicator.style.display = 'flex';
        indicator.style.background = 'red';
        indicator.style.color = 'white';
        indicator.style.border = '3px solid yellow';
        indicator.style.fontSize = '20px';
        indicator.style.fontWeight = 'bold';
        indicator.style.width = '100px';
        indicator.style.height = '50px';
        indicator.textContent = `작전타임${team}`;
        console.log(`${team}팀 작전타임 강제 표시 완료`);
    } else {
        console.error(`요소를 찾을 수 없음: timeout-team${team}`);
    }
};

// 강제로 작전타임 영역을 보이게 하는 테스트
window.forceTimeout = function(team) {
    console.log(`강제 작전타임 테스트: ${team}팀`);
    
    // 영역 강제 표시
    const area = document.getElementById('timeout-display-area');
    if (area) {
        area.style.display = 'block';
        area.style.position = 'fixed';
        area.style.top = '50%';
        area.style.left = '50%';
        area.style.transform = 'translate(-50%, -50%)';
        area.style.zIndex = '9999';
        area.style.background = 'yellow';
        area.style.padding = '20px';
        area.style.border = '5px solid red';
        console.log('작전타임 영역 강제 표시됨');
    }
    
    // 아이콘 강제 표시
    const indicator = document.getElementById(`timeout-team${team}`);
    if (indicator) {
        indicator.style.display = 'flex';
        indicator.style.background = 'red';
        indicator.style.color = 'white';
        indicator.style.fontSize = '24px';
        indicator.style.fontWeight = 'bold';
        indicator.style.padding = '20px';
        indicator.style.border = '3px solid yellow';
        indicator.textContent = `TIME OUT ${team}`;
        console.log(`${team}팀 작전타임 강제 표시 완료`);
    } else {
        console.error(`요소를 찾을 수 없음: timeout-team${team}`);
    }
};

// 작전타임 영역 자체를 보이게 하는 테스트
window.showTimeoutArea = function() {
    console.log('작전타임 영역 표시 테스트');
    const area = document.getElementById('timeout-display-area');
    if (area) {
        area.style.display = 'flex';
        area.style.background = 'red';
        area.style.border = '3px solid yellow';
        area.style.padding = '20px';
        area.innerHTML = '<div style="color: white; font-size: 20px; font-weight: bold;">작전타임 영역 테스트</div>';
        console.log('작전타임 영역 표시됨');
    } else {
        console.error('timeout-display-area 요소를 찾을 수 없음');
    }
};

// 모든 작전타임 요소 확인
window.checkTimeoutElements = function() {
    console.log('=== 작전타임 요소 전체 확인 ===');
    console.log('timeout-display-area:', document.getElementById('timeout-display-area'));
    console.log('timeout-teamA:', document.getElementById('timeout-teamA'));
    console.log('timeout-teamB:', document.getElementById('timeout-teamB'));
    
    // 모든 timeout 관련 요소 찾기
    const allTimeoutElements = document.querySelectorAll('[id*="timeout"]');
    console.log('모든 timeout 요소들:', allTimeoutElements);
    
    allTimeoutElements.forEach((element, index) => {
        console.log(`요소 ${index}:`, element.id, element);
    });
};

// 가장 기본적인 테스트 - 화면에 텍스트 표시
window.basicTest = function() {
    console.log('=== 기본 테스트 시작 ===');
    
    // 1. DOM이 로드되었는지 확인
    console.log('document.readyState:', document.readyState);
    console.log('document.body:', document.body);
    
    // 2. 스코어보드 요소 확인
    const scoreboard = document.querySelector('.display-board');
    console.log('스코어보드:', scoreboard);
    
    // 3. 작전타임 영역 강제 생성
    let area = document.getElementById('timeout-display-area');
    if (!area) {
        console.log('작전타임 영역이 없음, 강제 생성');
        area = document.createElement('div');
        area.id = 'timeout-display-area';
        area.className = 'timeout-display-area';
        if (scoreboard) {
            scoreboard.appendChild(area);
        }
    }
    
    // 4. 작전타임 아이콘 강제 생성
    let indicator = document.getElementById('timeout-teamA');
    if (!indicator) {
        console.log('A팀 작전타임 아이콘이 없음, 강제 생성');
        indicator = document.createElement('div');
        indicator.id = 'timeout-teamA';
        indicator.className = 'timeout-indicator timeout-teamA';
        indicator.textContent = 'TIME OUT 1';
        if (area) {
            area.appendChild(indicator);
        }
    }
    
    // 5. 강제 표시
    if (area && indicator) {
        area.style.display = 'block';
        area.style.position = 'fixed';
        area.style.top = '50%';
        area.style.left = '50%';
        area.style.transform = 'translate(-50%, -50%)';
        area.style.zIndex = '99999';
        area.style.background = 'red';
        area.style.padding = '20px';
        area.style.border = '5px solid yellow';
        
        indicator.style.display = 'flex';
        indicator.style.background = 'white';
        indicator.style.color = 'black';
        indicator.style.fontSize = '24px';
        indicator.style.fontWeight = 'bold';
        indicator.style.padding = '20px';
        
        console.log('강제 표시 완료!');
    } else {
        console.error('요소 생성 실패');
    }
};

// 테스트 함수들 (개발용)
window.testSetWin = function() {
    console.log('=== 세트 승리 테스트 ===');
    console.log('현재 상태:', {
        A팀세트: scoreData.teamA.setsWon,
        B팀세트: scoreData.teamB.setsWon,
        현재세트: scoreData.currentSet
    });
    
    // A팀 세트 승리 테스트
    winSet('A');
    
    setTimeout(() => {
        console.log('A팀 세트 승리 후:', {
            A팀세트: scoreData.teamA.setsWon,
            B팀세트: scoreData.teamB.setsWon,
            현재세트: scoreData.currentSet
        });
    }, 100);
};

window.testCourtChange = function() {
    console.log('=== 코트 체인지 테스트 ===');
    console.log('체인지 전 상태:', {
        A팀세트: scoreData.teamA.setsWon,
        B팀세트: scoreData.teamB.setsWon,
        A팀점수: scoreData.teamA.points,
        B팀점수: scoreData.teamB.points,
        코트체인지: scoreData.courtSwapped
    });
    
    toggleCourtChange();
    
    console.log('체인지 후 상태:', {
        A팀세트: scoreData.teamA.setsWon,
        B팀세트: scoreData.teamB.setsWon,
        A팀점수: scoreData.teamA.points,
        B팀점수: scoreData.teamB.points,
        코트체인지: scoreData.courtSwapped
    });
};

// 간단한 세트 승리 테스트
window.testSetWinSimple = function() {
    console.log('=== 간단한 세트 승리 테스트 ===');
    
    // A팀 세트 수를 1로 설정
    scoreData.teamA.setsWon = 1;
    console.log('A팀 세트 수 설정:', scoreData.teamA.setsWon);
    
    // 세트 아이콘 업데이트
    updateSetDisplay();
    
    // 결과 확인
    console.log('A팀 첫 번째 아이콘 클래스:', elements.teamASets[0]?.className);
    console.log('A팀 두 번째 아이콘 클래스:', elements.teamASets[1]?.className);
    console.log('A팀 세 번째 아이콘 클래스:', elements.teamASets[2]?.className);
};

// 현재 데이터 변환 테스트
window.testDataConversion = function() {
    console.log('=== 데이터 변환 테스트 ===');
    console.log('현재 scoreData:', scoreData);
    
    // 수동으로 변환
    const convertedData = convertSetScoreToSetsWon(scoreData);
    console.log('변환 후 데이터:', convertedData);
    
    // scoreData 업데이트
    scoreData = convertedData;
    updateDisplay();
};

// 수동으로 setsWon 설정하는 테스트
window.testManualSetsWon = function() {
    console.log('=== 수동 setsWon 설정 테스트 ===');
    
    // A팀 1세트, B팀 2세트로 설정
    scoreData.teamA.setsWon = 1;
    scoreData.teamB.setsWon = 2;
    
    console.log('설정 후:', {
        A팀세트: scoreData.teamA.setsWon,
        B팀세트: scoreData.teamB.setsWon
    });
    
    // 화면 업데이트
    updateDisplay();
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', init);
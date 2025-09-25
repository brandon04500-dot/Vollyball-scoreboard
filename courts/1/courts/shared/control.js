// 배구 스코어보드 컨트롤패널 공통 JavaScript
// 구장 관리자 초기화 (court-manager.js가 로드된 후)
let courtManager, courtInfo;

// 구장 관리자 초기화 함수
function initializeCourtManager() {
    // CourtManager 인스턴스 생성
    courtManager = new CourtManager();
    courtInfo = courtManager.retrieveCourtInfo();
}

// 현재 스코어보드 데이터
let scoreBoardData = {
    tournamentName: "대회 이름을 클릭하여 수정하세요",
    teamA: { name: "Home", points: 0, timeouts: [false, false] },
    teamB: { name: "Away", points: 0, timeouts: [false, false] },
    setScore: [0, 0],
    servingTeam: null,
    currentSet: 1,
    isPaused: false,
    courtSwapped: false, // 코트 체인지 상태
    videoReviewActive: false, // 비디오판독 상태
    videoReviewType: null, // 비디오판독 유형
    actionHistory: []
};

// 현재 편집 타입 추적
let currentEditType = 'tournament';

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeCourtManager();
    initializeScoreboardData();
    loadScoreboardData();
    refreshControlPanelDisplay();
    configureInlineEditListeners();
    
    // BroadcastChannel 초기화
    try {
        broadcastChannel = new BroadcastChannel('scoreboard_updates');
    } catch (error) {
        console.log('BroadcastChannel 지원하지 않음:', error);
    }
});

// 스코어보드 데이터 초기화
function initializeScoreboardData() {
    // courtManager가 초기화되지 않은 경우 초기화
    if (!courtManager) {
        initializeCourtManager();
    }
    
    // 기본 데이터가 없으면 초기화
    if (!localStorage.getItem(courtManager.generateStorageKey())) {
        saveDataToStorage();
    }
}

// 현재 스코어보드 데이터 로드 (에러 처리 강화)
function loadScoreboardData() {
    try {
        // courtManager가 초기화되지 않은 경우 초기화
        if (!courtManager) {
            initializeCourtManager();
        }
        
        const savedData = localStorage.getItem(courtManager.generateStorageKey());
        if (savedData) {
            const parsedData = ErrorHandler.safeJSONParse(savedData);
            if (parsedData && SecurityUtils.validateScoreboardData(parsedData)) {
                scoreBoardData = DataValidator.normalizeScoreboardData(parsedData);
            } else {
                ErrorHandler.logError('스코어보드 데이터 로드', new Error('유효하지 않은 데이터'), { savedData });
                // 기본 데이터로 초기화
                scoreBoardData = DataValidator.normalizeScoreboardData({});
            }
        }
    } catch (error) {
        ErrorHandler.logError('스코어보드 데이터 로드', error);
        // 기본 데이터로 초기화
        scoreBoardData = DataValidator.normalizeScoreboardData({});
    }
}

// 컨트롤 패널 디스플레이 업데이트 (공통 함수 사용)
function refreshControlPanelDisplay() {
    try {
        // 대회명 업데이트
        const tournamentElement = ErrorHandler.safeGetElement('current-tournament');
        if (tournamentElement) {
            tournamentElement.textContent = scoreBoardData.tournamentName;
        }
        
        // 공통 디스플레이 업데이트 함수 사용
        DisplayUtils.updateTeamDisplay('current-team-a', 'current-team-b', 'current-score-a', 'current-score-b', scoreBoardData);
        DisplayUtils.updateSetScoreDisplay('current-set-score', scoreBoardData);
        DisplayUtils.updateCurrentSetDisplay('current-set-display', scoreBoardData);
        updateDisplayTimeoutIndicators();
        updateServeIndicator();
        refreshButtonTexts();
    } catch (error) {
        ErrorHandler.logError('컨트롤 패널 디스플레이 업데이트', error);
    }
}

// 타임아웃 표시 업데이트 (공통 함수 사용)
function updateDisplayTimeoutIndicators() {
    try {
        const timeoutAElementIds = ['team-a-timeout-1', 'team-a-timeout-2'];
        const timeoutBElementIds = ['team-b-timeout-1', 'team-b-timeout-2'];
        
        DisplayUtils.updateTimeoutDisplay(timeoutAElementIds, timeoutBElementIds, scoreBoardData);
    } catch (error) {
        ErrorHandler.logError('타임아웃 표시 업데이트', error);
    }
}

// 서브 인디케이터 업데이트 (공통 함수 사용)
function updateServeIndicator() {
    try {
        const serveElement = ErrorHandler.safeGetElement('current-serve');
        if (!serveElement) return;
        
        if (scoreBoardData.servingTeam) {
            // 실제 서브권을 가진 팀의 이름을 표시 (코트체인지 상태와 관계없이)
            const servingTeamName = scoreBoardData.servingTeam === 'A' ? scoreBoardData.teamA.name : scoreBoardData.teamB.name;
            serveElement.textContent = `서브: ${servingTeamName}`;
        } else {
            serveElement.textContent = '서브: -';
        }
    } catch (error) {
        ErrorHandler.logError('서브 인디케이터 업데이트', error);
    }
}


// 버튼 텍스트 업데이트
function refreshButtonTexts() {
    // 코트 체인지 버튼 텍스트는 항상 '코트체인지'로 유지
    const courtChangeBtn = document.querySelector('.btn-court-change');
    if (courtChangeBtn) {
        courtChangeBtn.textContent = '코트체인지';
    }
}

// 데이터 저장 및 동기화 (에러 처리 강화)
function saveDataToStorage() {
    try {
        // courtManager가 초기화되지 않은 경우 초기화
        if (!courtManager) {
            initializeCourtManager();
        }
        
        // 데이터 검증
        if (!SecurityUtils.validateScoreboardData(scoreBoardData)) {
            ErrorHandler.logError('데이터 저장', new Error('유효하지 않은 스코어보드 데이터'), { scoreBoardData });
            return;
        }
        
        // 데이터 정규화
        const normalizedData = DataValidator.normalizeScoreboardData(scoreBoardData);
        
        // localStorage에 안전하게 저장
        const jsonString = ErrorHandler.safeJSONStringify(normalizedData);
        if (jsonString) {
            localStorage.setItem(courtManager.generateStorageKey(), jsonString);
            window.dispatchEvent(new StorageEvent('storage', {
                key: courtManager.generateStorageKey(),
                newValue: jsonString
            }));
        }
        
        // 서버에도 전송 (OBS용)
        sendToServer();
    } catch (error) {
        ErrorHandler.logError('데이터 저장', error, { scoreBoardData });
    }
}

// BroadcastChannel 초기화
let broadcastChannel;

// 서버로 데이터 전송 (OBS용, 에러 처리 강화)
function sendToServer() {
    try {
        const courtId = courtManager ? courtManager.courtId : '001';
        const jsonData = ErrorHandler.safeJSONStringify(scoreBoardData);
        
        if (!jsonData) {
            ErrorHandler.logError('서버 전송', new Error('데이터 직렬화 실패'), { scoreBoardData });
            return;
        }
        
        fetch(`/api/scoreboard/${courtId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: jsonData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('서버 전송 성공:', data);
            // BroadcastChannel로 다른 탭에 알림
            if (broadcastChannel) {
                broadcastChannel.postMessage({
                    type: 'scoreboard_update',
                    courtId: courtId,
                    data: scoreBoardData
                });
            }
        })
        .catch(error => {
            ErrorHandler.logError('서버 전송', error, { courtId, scoreBoardData });
        });
    } catch (error) {
        ErrorHandler.logError('서버 전송', error, { scoreBoardData });
    }
}

// 빠른 점수 추가
function handleQuickScore(team, points) {
    // 코트체인지 상태에 따라 실제 팀 결정
    let actualTeam;
    if (scoreBoardData.courtSwapped) {
        // 코트체인지된 상태: A 버튼은 B팀, B 버튼은 A팀
        actualTeam = team === 'A' ? 'B' : 'A';
    } else {
        // 일반 상태: A 버튼은 A팀, B 버튼은 B팀
        actualTeam = team;
    }
    
    if (actualTeam === 'A') {
        scoreBoardData.teamA.points += points;
    } else {
        scoreBoardData.teamB.points += points;
    }
    
    // 득점한 경우에만 서브권 설정 (실제 득점한 팀)
    if (points > 0) {
        scoreBoardData.servingTeam = actualTeam;
    }
    
    // 액션 히스토리에 추가
    scoreBoardData.actionHistory.push({
        action: 'score',
        team: team,
        points: points,
        timestamp: new Date().toISOString()
    });
    
    refreshControlPanelDisplay();
    saveDataToStorage();
}

// 현재 세트 점수 및 타임아웃 초기화
function resetCurrentSetScoresAndTimeouts() {
    if (confirm('현재 세트의 점수와 작전타임을 초기화하시겠습니까?\n(세트 점수는 유지됩니다)')) {
        scoreBoardData.teamA.points = 0;
        scoreBoardData.teamB.points = 0;
        scoreBoardData.teamA.timeouts = [false, false];
        scoreBoardData.teamB.timeouts = [false, false];
        scoreBoardData.servingTeam = null;
        scoreBoardData.videoReviewActive = false;
        scoreBoardData.videoReviewType = null;
        
        // 액션 히스토리에 추가
        scoreBoardData.actionHistory.push({
            action: 'reset',
            timestamp: new Date().toISOString()
        });
        
        refreshControlPanelDisplay();
        saveDataToStorage();
    }
}

// 코트 체인지 토글
function toggleCourtSwap() {
    scoreBoardData.courtSwapped = !scoreBoardData.courtSwapped;
    
    // 코트체인지 시 서브권은 그대로 유지 (배구 룰)
    // 서브권을 바꾸지 않음 - 현재 서브권을 가진 팀이 그대로 유지
    
    // 액션 히스토리에 추가
    scoreBoardData.actionHistory.push({
        action: 'court_change',
        courtSwapped: scoreBoardData.courtSwapped,
        servingTeam: scoreBoardData.servingTeam,
        timestamp: new Date().toISOString()
    });
    
    refreshControlPanelDisplay();
    saveDataToStorage();
}

// 세트 종료 (배구 룰 적용)
function finalizeSet() {
    // 현재 세트의 승자 결정
    const teamAPoints = scoreBoardData.teamA.points;
    const teamBPoints = scoreBoardData.teamB.points;
    
    if (teamAPoints > teamBPoints) {
        scoreBoardData.setScore[0]++;
    } else {
        scoreBoardData.setScore[1]++;
    }
    
    // 배구는 최대 5세트까지만 진행
    if (scoreBoardData.setScore[0] < 3 && scoreBoardData.setScore[1] < 3) {
        // 다음 세트로 이동 (5세트까지)
        if (scoreBoardData.currentSet < 5) {
            scoreBoardData.currentSet++;
        }
        
        // 점수 초기화
        scoreBoardData.teamA.points = 0;
        scoreBoardData.teamB.points = 0;
        scoreBoardData.teamA.timeouts = [false, false];
        scoreBoardData.teamB.timeouts = [false, false];
        scoreBoardData.servingTeam = null;
        
        // 액션 히스토리에 추가
        scoreBoardData.actionHistory.push({
            action: 'end_set',
            setScore: [...scoreBoardData.setScore],
            currentSet: scoreBoardData.currentSet,
            timestamp: new Date().toISOString()
        });
    } else {
        // 게임 종료 (3세트 이상 승리)
        scoreBoardData.actionHistory.push({
            action: 'game_end',
            setScore: [...scoreBoardData.setScore],
            winner: scoreBoardData.setScore[0] >= 3 ? 'A' : 'B',
            timestamp: new Date().toISOString()
        });
        
        alert(`게임 종료! 최종 결과: ${scoreBoardData.teamA.name} ${scoreBoardData.setScore[0]}세트 - ${scoreBoardData.setScore[1]}세트 ${scoreBoardData.teamB.name}`);
    }
    
    refreshControlPanelDisplay();
    saveDataToStorage();
}

// 세트 점수 조정 (배구 룰 적용)
function adjustSetScore(team, change) {
    // 코트체인지 상태에 따라 실제 팀 결정
    let actualTeam;
    if (scoreBoardData.courtSwapped) {
        // 코트체인지된 상태: A 버튼은 B팀, B 버튼은 A팀
        actualTeam = team === 'A' ? 'B' : 'A';
    } else {
        // 일반 상태: A 버튼은 A팀, B 버튼은 B팀
        actualTeam = team;
    }
    
    if (actualTeam === 'A') {
        const newScore = scoreBoardData.setScore[0] + change;
        // 배구는 최대 5세트까지만 있음
        if (newScore >= 0 && newScore <= 5) {
            scoreBoardData.setScore[0] = newScore;
            
            // 현재 세트도 조정 (세트 점수에 맞춰, 최대 5세트)
            const totalSets = scoreBoardData.setScore[0] + scoreBoardData.setScore[1];
            if (totalSets >= 0) {
                scoreBoardData.currentSet = Math.min(5, Math.max(1, totalSets + 1));
            }
        }
    } else {
        const newScore = scoreBoardData.setScore[1] + change;
        // 배구는 최대 5세트까지만 있음
        if (newScore >= 0 && newScore <= 5) {
            scoreBoardData.setScore[1] = newScore;
            
            // 현재 세트도 조정 (세트 점수에 맞춰, 최대 5세트)
            const totalSets = scoreBoardData.setScore[0] + scoreBoardData.setScore[1];
            if (totalSets >= 0) {
                scoreBoardData.currentSet = Math.min(5, Math.max(1, totalSets + 1));
            }
        }
    }
    
    refreshControlPanelDisplay();
    saveDataToStorage();
}

// 설정 모달 열기
function openConfigurationModal() {
    document.getElementById('setupModal').style.display = 'block';
    // 현재 데이터로 모달 필드 채우기
    document.getElementById('modal-tournament-name').value = scoreBoardData.tournamentName;
    document.getElementById('modal-team-a-name').value = scoreBoardData.teamA.name;
    document.getElementById('modal-team-b-name').value = scoreBoardData.teamB.name;
    
    // 길이 경고 초기화
    updateTournamentNameLength(scoreBoardData.tournamentName);
    updateTeamNameLength(scoreBoardData.teamA.name, 'A');
    updateTeamNameLength(scoreBoardData.teamB.name, 'B');
}

// 설정 모달 닫기
function closeConfigurationModal() {
    document.getElementById('setupModal').style.display = 'none';
}

// 설정 저장 및 모든 데이터 초기화
function saveConfigurationAndResetAll() {
    const tournamentName = document.getElementById('modal-tournament-name').value.trim();
    const teamAName = document.getElementById('modal-team-a-name').value.trim();
    const teamBName = document.getElementById('modal-team-b-name').value.trim();

    if (!tournamentName || !teamAName || !teamBName) {
        alert('모든 필드를 입력해주세요.');
        return;
    }

    if (tournamentName.length > 30) {
        alert('대회 이름은 30자 이하로 입력해주세요.');
        return;
    }

    if (teamAName.length > 8) {
        alert('홈팀 이름은 8자 이하로 입력해주세요.');
        return;
    }

    if (teamBName.length > 8) {
        alert('어웨이팀 이름은 8자 이하로 입력해주세요.');
        return;
    }

    // 모든 데이터 초기화
    scoreBoardData = {
        tournamentName: tournamentName,
        teamA: { name: teamAName, points: 0, timeouts: [false, false] },
        teamB: { name: teamBName, points: 0, timeouts: [false, false] },
        setScore: [0, 0],
        servingTeam: null,
        currentSet: 1,
        isPaused: false,
        courtSwapped: false,
        videoReviewActive: false,
        videoReviewType: null,
        actionHistory: []
    };

    refreshControlPanelDisplay();
    saveDataToStorage();
    closeConfigurationModal();
}

// 인라인 편집 모달 열기
function openInlineEditModal(editType = 'tournament', team = null) {
    currentEditType = editType;
    document.getElementById('editModal').style.display = 'block';
    
    // 편집할 데이터에 따라 모달 필드 채우기
    let currentValue = '';
    let maxLength = 30;
    let labelText = '항목:';
    
    if (editType === 'tournament') {
        currentValue = scoreBoardData.tournamentName;
        maxLength = 30;
        labelText = '대회 이름:';
    } else if (editType === 'team' && team) {
        // 현재 편집 중인 팀 정보를 여러 방법으로 저장
        window.currentEditingTeam = team;
        document.getElementById('editModal').setAttribute('data-editing-team', team);
        document.getElementById('editModalInput').setAttribute('data-editing-team', team);
        
        console.log('모달 열기 - 팀:', team, '코트체인지:', scoreBoardData.courtSwapped);
        
        // 화면에 표시된 팀명을 모달에 표시 (DisplayUtils와 동일한 로직)
        if (team === 'A') {
            // 화면 왼쪽(A)에 표시된 팀명
            if (scoreBoardData.courtSwapped) {
                currentValue = scoreBoardData.teamB.name; // 코트체인지 시 왼쪽 = 팀B
                console.log('왼쪽 팀(A) 클릭 - 코트체인지 상태에서 팀B 이름 표시:', currentValue);
            } else {
                currentValue = scoreBoardData.teamA.name; // 일반 시 왼쪽 = 팀A
                console.log('왼쪽 팀(A) 클릭 - 일반 상태에서 팀A 이름 표시:', currentValue);
            }
        } else if (team === 'B') {
            // 화면 오른쪽(B)에 표시된 팀명
            if (scoreBoardData.courtSwapped) {
                currentValue = scoreBoardData.teamA.name; // 코트체인지 시 오른쪽 = 팀A
                console.log('오른쪽 팀(B) 클릭 - 코트체인지 상태에서 팀A 이름 표시:', currentValue);
            } else {
                currentValue = scoreBoardData.teamB.name; // 일반 시 오른쪽 = 팀B
                console.log('오른쪽 팀(B) 클릭 - 일반 상태에서 팀B 이름 표시:', currentValue);
            }
        }
        maxLength = 8;
        labelText = `${team === 'A' ? '홈팀' : '어웨이팀'} 이름:`;
    }
    
    document.getElementById('editModalInput').value = currentValue;
    document.getElementById('editModalInput').maxLength = maxLength;
    document.getElementById('editModalLabel').textContent = labelText;
    
    // 길이 경고 초기화
    updateEditModalLength();
}

// 인라인 편집 모달 닫기
function closeInlineEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

// 비디오 판독 시작
function initiateVideoReview() {
    scoreBoardData.videoReviewActive = true;
    scoreBoardData.videoReviewType = '기타 판독';
    
    // 비디오 판독 오버레이 표시
    document.getElementById('videoReviewOverlay').style.display = 'flex';
    
    // 액션 히스토리에 추가
    scoreBoardData.actionHistory.push({
        action: 'video_review_start',
        timestamp: new Date().toISOString()
    });
    
    saveDataToStorage();
}

// 비디오 판독 종료
function concludeVideoReview() {
    scoreBoardData.videoReviewActive = false;
    scoreBoardData.videoReviewType = null;
    
    // 비디오 판독 오버레이 숨기기
    document.getElementById('videoReviewOverlay').style.display = 'none';
    
    // 액션 히스토리에 추가
    scoreBoardData.actionHistory.push({
        action: 'video_review_end',
        timestamp: new Date().toISOString()
    });
    
    saveDataToStorage();
}

// 인라인 편집 저장
function saveInlineEdit() {
    const editValue = document.getElementById('editModalInput').value.trim();
    const maxLength = parseInt(document.getElementById('editModalInput').maxLength);

    if (!editValue) {
        alert('내용을 입력해주세요.');
        return;
    }

    if (editValue.length > maxLength) {
        alert(`내용은 ${maxLength}자 이하로 입력해주세요.`);
        return;
    }

    // 편집 타입에 따라 데이터 업데이트
    if (currentEditType === 'tournament') {
        scoreBoardData.tournamentName = editValue;
    } else if (currentEditType === 'team') {
        // 팀명 편집: 화면에 표시된 팀을 수정 (모달에 표시된 팀과 동일)
        const clickedTeam = window.currentEditingTeam || 
                           document.getElementById('editModal').getAttribute('data-editing-team') ||
                           document.getElementById('editModalInput').getAttribute('data-editing-team');
        
        console.log('저장 시 - 편집 중인 팀:', clickedTeam, '코트체인지 상태:', scoreBoardData.courtSwapped);
        console.log('저장할 값:', editValue);
        
        if (clickedTeam === 'A') {
            // 화면 왼쪽(A)에 표시된 팀 수정
            if (scoreBoardData.courtSwapped) {
                scoreBoardData.teamB.name = editValue; // 코트체인지 시 왼쪽 = 팀B
                console.log('✅ 팀B 이름을', editValue, '로 변경 (코트체인지 상태)');
            } else {
                scoreBoardData.teamA.name = editValue; // 일반 시 왼쪽 = 팀A
                console.log('✅ 팀A 이름을', editValue, '로 변경 (일반 상태)');
            }
        } else if (clickedTeam === 'B') {
            // 화면 오른쪽(B)에 표시된 팀 수정
            if (scoreBoardData.courtSwapped) {
                scoreBoardData.teamA.name = editValue; // 코트체인지 시 오른쪽 = 팀A
                console.log('✅ 팀A 이름을', editValue, '로 변경 (코트체인지 상태)');
            } else {
                scoreBoardData.teamB.name = editValue; // 일반 시 오른쪽 = 팀B
                console.log('✅ 팀B 이름을', editValue, '로 변경 (일반 상태)');
            }
        } else {
            console.error('❌ 편집 중인 팀 정보를 찾을 수 없습니다:', clickedTeam);
            console.log('사용 가능한 값들:', {
                window_currentEditingTeam: window.currentEditingTeam,
                modal_data_editing_team: document.getElementById('editModal').getAttribute('data-editing-team'),
                input_data_editing_team: document.getElementById('editModalInput').getAttribute('data-editing-team')
            });
        }
    }

    refreshControlPanelDisplay();
    saveDataToStorage();
    closeInlineEditModal();
}

// 팀 클릭 핸들러 (코트체인지 상태 고려) - 전역 스코프에 정의
window.handleTeamClick = function(team) {
    console.log(`팀${team} 클릭됨 (onclick)`);
    
    // scoreBoardData가 로드되지 않은 경우 대기
    if (typeof scoreBoardData === 'undefined') {
        console.log('scoreBoardData가 아직 로드되지 않음, 잠시 후 다시 시도');
        setTimeout(() => window.handleTeamClick(team), 100);
        return;
    }
    
    // 코트체인지 상태에 따라 실제 편집할 팀 결정
    let actualTeam = team;
    if (scoreBoardData.courtSwapped) {
        // 코트체인지 상태에서는 A와 B가 바뀜
        actualTeam = team === 'A' ? 'B' : 'A';
        console.log(`코트체인지 상태 - 화면의 팀${team}은 실제로는 팀${actualTeam}`);
    } else {
        console.log(`일반 상태 - 화면의 팀${team}은 실제로도 팀${actualTeam}`);
    }
    
    window.currentEditingTeam = actualTeam;
    // 화면상의 위치(team)를 전달하여 올바른 팀명을 모달에 표시
    openInlineEditModal('team', team);
};

// 인라인 편집 리스너 설정 (메모리 관리 강화)
function configureInlineEditListeners() {
    try {
        console.log('🔧 인라인 편집 리스너 설정 시작');
        
        // 대회명 클릭 시 편집 모달 열기
        const tournamentElement = document.getElementById('current-tournament');
        console.log('대회명 요소 찾기:', tournamentElement);
        if (tournamentElement) {
            tournamentElement.addEventListener('click', function() {
                console.log('대회명 클릭됨');
                openInlineEditModal('tournament');
            });
            console.log('✅ 대회명 이벤트 리스너 연결됨');
        } else {
            console.error('❌ 대회명 요소를 찾을 수 없음');
        }
        
        // 팀명 클릭 시 편집 모달 열기 (코트체인지 상태 고려)
        const teamAElement = document.getElementById('current-team-a');
        console.log('팀A 요소 찾기:', teamAElement);
        if (teamAElement) {
            teamAElement.addEventListener('click', function() {
                handleTeamClick('A');
            });
            console.log('✅ 팀A 이벤트 리스너 연결됨');
        } else {
            console.error('❌ 팀A 요소를 찾을 수 없음');
        }
        
        const teamBElement = document.getElementById('current-team-b');
        console.log('팀B 요소 찾기:', teamBElement);
        if (teamBElement) {
            teamBElement.addEventListener('click', function() {
                handleTeamClick('B');
            });
            console.log('✅ 팀B 이벤트 리스너 연결됨');
        } else {
            console.error('❌ 팀B 요소를 찾을 수 없음');
        }
        
        console.log('🔧 인라인 편집 리스너 설정 완료');
    } catch (error) {
        console.error('❌ 인라인 편집 리스너 설정 오류:', error);
        ErrorHandler.logError('인라인 편집 리스너 설정', error);
    }
}

// 팀 클릭 핸들러 (코트체인지 상태 고려)
function handleTeamClick(team) {
    console.log(`팀${team} 클릭됨`);
    
    // scoreBoardData가 로드되지 않은 경우 대기
    if (typeof scoreBoardData === 'undefined') {
        console.log('scoreBoardData가 아직 로드되지 않음, 잠시 후 다시 시도');
        setTimeout(() => handleTeamClick(team), 100);
        return;
    }
    
    // 코트체인지 상태에 따라 실제 편집할 팀 결정
    let actualTeam = team;
    if (scoreBoardData.courtSwapped) {
        // 코트체인지 상태에서는 A와 B가 바뀜
        actualTeam = team === 'A' ? 'B' : 'A';
        console.log(`코트체인지 상태 - 화면의 팀${team}은 실제로는 팀${actualTeam}`);
    } else {
        console.log(`일반 상태 - 화면의 팀${team}은 실제로도 팀${actualTeam}`);
    }
    
    window.currentEditingTeam = actualTeam;
    // 화면상의 위치(team)를 전달하여 올바른 팀명을 모달에 표시
    openInlineEditModal('team', team);
}

// 점수 조정
function adjustScore(team, points) {
    if (team === 'A') {
        scoreBoardData.teamA.points = Math.max(0, scoreBoardData.teamA.points + points);
    } else {
        scoreBoardData.teamB.points = Math.max(0, scoreBoardData.teamB.points + points);
    }
    
    refreshControlPanelDisplay();
    saveDataToStorage();
}

// 팀 타임아웃 토글
function toggleTeamTimeout(team) {
    // 코트체인지 상태에 따라 실제 팀 결정
    let actualTeam;
    if (scoreBoardData.courtSwapped) {
        // 코트체인지된 상태: A 버튼은 B팀, B 버튼은 A팀
        actualTeam = team === 'A' ? 'B' : 'A';
    } else {
        // 일반 상태: A 버튼은 A팀, B 버튼은 B팀
        actualTeam = team;
    }
    
    // 첫 번째 사용 가능한 타임아웃을 토글하고 번호 추적
    let timeoutNumber = 0;
    
    if (actualTeam === 'A') {
        if (!scoreBoardData.teamA.timeouts[0]) {
            scoreBoardData.teamA.timeouts[0] = true;
            timeoutNumber = 1; // 1번째 작전타임
        } else if (!scoreBoardData.teamA.timeouts[1]) {
            scoreBoardData.teamA.timeouts[1] = true;
            timeoutNumber = 2; // 2번째 작전타임
        } else {
            // 모두 사용된 경우 초기화
            scoreBoardData.teamA.timeouts = [false, false];
            timeoutNumber = 0; // 리셋
        }
    } else {
        if (!scoreBoardData.teamB.timeouts[0]) {
            scoreBoardData.teamB.timeouts[0] = true;
            timeoutNumber = 1; // 1번째 작전타임
        } else if (!scoreBoardData.teamB.timeouts[1]) {
            scoreBoardData.teamB.timeouts[1] = true;
            timeoutNumber = 2; // 2번째 작전타임
        } else {
            // 모두 사용된 경우 초기화
            scoreBoardData.teamB.timeouts = [false, false];
            timeoutNumber = 0; // 리셋
        }
    }
    
    refreshControlPanelDisplay();
    saveDataToStorage();
    
    // 작전타임 상태에 따라 송출용 스코어보드에 표시
    if (broadcastChannel) {
        const message = {
            type: 'showTimeout',
            team: actualTeam,
            timeoutNumber: timeoutNumber,
            courtId: courtInfo.id
        };
        console.log(`${actualTeam}팀 작전타임 BroadcastChannel 메시지 전송:`, message);
        broadcastChannel.postMessage(message);
    } else {
        console.log('BroadcastChannel이 초기화되지 않음');
    }
}

// 모든 스코어보드 데이터 초기화
function resetAllScoreboardData() {
    if (confirm('정말로 모든 데이터를 초기화하시겠습니까?')) {
        scoreBoardData = {
            tournamentName: "대회 이름을 클릭하여 수정하세요",
            teamA: { name: "Home", points: 0, timeouts: [false, false] },
            teamB: { name: "Away", points: 0, timeouts: [false, false] },
            setScore: [0, 0],
            servingTeam: null,
            currentSet: 1,
            isPaused: false,
            courtSwapped: false,
            actionHistory: []
        };
        
        refreshControlPanelDisplay();
        saveDataToStorage();
    }
}

// 상태 메시지 표시
function displayStatusMessage(message) {
    console.log('상태:', message);
}

// 대회명 길이 경고 업데이트
function updateTournamentNameLength(value) {
    const warning = document.getElementById('tournament-length-warning');
    if (warning) {
        if (value.length > 30) {
            warning.textContent = `대회 이름은 30자 이하로 입력해주세요. (현재: ${value.length}자)`;
            warning.style.display = 'block';
        } else {
            warning.style.display = 'none';
        }
    }
}

// 팀명 길이 경고 업데이트
function updateTeamNameLength(value, team) {
    const warning = document.getElementById(`team-${team.toLowerCase()}-length-warning`);
    if (warning) {
        if (value.length > 8) {
            warning.textContent = `팀명은 8자 이하로 입력해주세요. (현재: ${value.length}자)`;
            warning.style.display = 'block';
        } else {
            warning.style.display = 'none';
        }
    }
}

// 편집 모달 길이 경고 업데이트
function updateEditModalLength() {
    const editValue = document.getElementById('editModalInput').value;
    const maxLength = parseInt(document.getElementById('editModalInput').maxLength);
    const warning = document.getElementById('edit-length-warning');
    if (warning) {
        if (editValue.length > maxLength) {
            warning.textContent = `내용은 ${maxLength}자 이하로 입력해주세요. (현재: ${editValue.length}자)`;
            warning.style.display = 'block';
        } else {
            warning.style.display = 'none';
        }
    }
}

// 모달 외부 클릭 시 닫기
window.onclick = function(event) {
    const setupModal = document.getElementById('setupModal');
    const editModal = document.getElementById('editModal');
    
    if (event.target === setupModal) {
        closeConfigurationModal();
    }
    if (event.target === editModal) {
        closeInlineEditModal();
    }
}

// 레거시 함수명 호환성을 위한 별칭
const quickScore = handleQuickScore;
const resetCurrentScore = resetCurrentSetScoresAndTimeouts;
const changeCourt = toggleCourtSwap;
const endSet = finalizeSet;
const updateSetScore = adjustSetScore;
const openSetupModal = openConfigurationModal;
const closeSetupModal = closeConfigurationModal;
const saveSetup = saveConfigurationAndResetAll;
const openEditModal = openInlineEditModal;
const closeEditModal = closeInlineEditModal;
const requestVideoReview = initiateVideoReview;
const endVideoReview = concludeVideoReview;
const saveEdit = saveInlineEdit;
const setupInlineEditListeners = configureInlineEditListeners;
const handleEditClick = openInlineEditModal;
const updateDisplayOnly = refreshControlPanelDisplay;
const updateScore = adjustScore;
const toggleTimeout = toggleTeamTimeout;
const resetScore = resetAllScoreboardData;
const showStatus = displayStatusMessage;
const loadCurrentData = loadScoreboardData;
const initializeData = initializeScoreboardData;
const updateDisplay = refreshControlPanelDisplay;
const updateTimeoutIndicators = updateDisplayTimeoutIndicators;
const updateControlTimeoutIndicators = updateDisplayTimeoutIndicators;
const updateButtonTexts = refreshButtonTexts;

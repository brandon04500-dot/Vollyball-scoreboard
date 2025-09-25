// 배구 스코어보드 공통 유틸리티 함수
// 보안, 에러 처리, 데이터 검증 등을 담당

class SecurityUtils {
    // 간단한 해싱 함수 (실제 환경에서는 bcrypt 등 사용 권장)
    static async hashPassword(password) {
        // 간단한 해싱 (실제 환경에서는 서버사이드에서 처리)
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'volleyball_salt_2024');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // 비밀번호 검증
    static async verifyPassword(password, hashedPassword) {
        const hashed = await this.hashPassword(password);
        return hashed === hashedPassword;
    }

    // 안전한 데이터 검증
    static validateScoreboardData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }

        const requiredFields = ['tournamentName', 'teamA', 'teamB', 'setScore', 'currentSet'];
        for (const field of requiredFields) {
            if (!(field in data)) {
                return false;
            }
        }

        // 팀 데이터 검증
        if (!this.validateTeamData(data.teamA) || !this.validateTeamData(data.teamB)) {
            return false;
        }

        // 세트 점수 검증
        if (!Array.isArray(data.setScore) || data.setScore.length !== 2) {
            return false;
        }

        // 점수 범위 검증
        if (data.teamA.points < 0 || data.teamA.points > 100 || 
            data.teamB.points < 0 || data.teamB.points > 100) {
            return false;
        }

        return true;
    }

    // 팀 데이터 검증
    static validateTeamData(team) {
        if (!team || typeof team !== 'object') {
            return false;
        }

        if (typeof team.name !== 'string' || team.name.length > 20) {
            return false;
        }

        if (typeof team.points !== 'number' || team.points < 0) {
            return false;
        }

        if (!Array.isArray(team.timeouts) || team.timeouts.length !== 2) {
            return false;
        }

        return true;
    }
}

class ErrorHandler {
    // 안전한 JSON 파싱
    static safeJSONParse(jsonString, defaultValue = null) {
        try {
            if (!jsonString || typeof jsonString !== 'string') {
                return defaultValue;
            }
            const parsed = JSON.parse(jsonString);
            return parsed;
        } catch (error) {
            console.error('JSON 파싱 오류:', error);
            return defaultValue;
        }
    }

    // 안전한 JSON 문자열화
    static safeJSONStringify(obj, defaultValue = '{}') {
        try {
            return JSON.stringify(obj);
        } catch (error) {
            console.error('JSON 문자열화 오류:', error);
            return defaultValue;
        }
    }

    // 에러 로깅
    static logError(context, error, additionalData = {}) {
        const errorInfo = {
            context: context,
            message: error.message || error,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            additionalData: additionalData
        };
        
        console.error('에러 발생:', errorInfo);
        
        // 실제 환경에서는 서버로 에러 전송
        // this.sendErrorToServer(errorInfo);
    }

    // DOM 요소 안전하게 가져오기
    static safeGetElement(id) {
        try {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`요소를 찾을 수 없습니다: ${id}`);
            }
            return element;
        } catch (error) {
            this.logError('DOM 요소 가져오기', error, { elementId: id });
            return null;
        }
    }
}

class DataValidator {
    // 스코어보드 데이터 정규화
    static normalizeScoreboardData(data) {
        const defaultData = {
            tournamentName: "대회 이름",
            teamA: { name: "Home", points: 0, timeouts: [false, false] },
            teamB: { name: "Away", points: 0, timeouts: [false, false] },
            setScore: [0, 0],
            currentSet: 1,
            servingTeam: null,
            courtSwapped: false,
            videoReviewActive: false,
            videoReviewType: null,
            actionHistory: []
        };

        if (!data || typeof data !== 'object') {
            return defaultData;
        }

        // 각 필드별로 안전하게 병합
        return {
            tournamentName: typeof data.tournamentName === 'string' ? data.tournamentName : defaultData.tournamentName,
            teamA: this.normalizeTeamData(data.teamA, defaultData.teamA),
            teamB: this.normalizeTeamData(data.teamB, defaultData.teamB),
            setScore: Array.isArray(data.setScore) && data.setScore.length === 2 ? 
                data.setScore.map(score => Math.max(0, Math.min(5, parseInt(score) || 0))) : defaultData.setScore,
            currentSet: Math.max(1, Math.min(5, parseInt(data.currentSet) || 1)),
            servingTeam: data.servingTeam === 'A' || data.servingTeam === 'B' ? data.servingTeam : null,
            courtSwapped: Boolean(data.courtSwapped),
            videoReviewActive: Boolean(data.videoReviewActive),
            videoReviewType: data.videoReviewType || null,
            actionHistory: Array.isArray(data.actionHistory) ? data.actionHistory : []
        };
    }

    // 팀 데이터 정규화
    static normalizeTeamData(team, defaultTeam) {
        if (!team || typeof team !== 'object') {
            return defaultTeam;
        }

        return {
            name: typeof team.name === 'string' ? team.name.substring(0, 20) : defaultTeam.name,
            points: Math.max(0, Math.min(100, parseInt(team.points) || 0)),
            timeouts: Array.isArray(team.timeouts) && team.timeouts.length === 2 ? 
                team.timeouts.map(timeout => Boolean(timeout)) : defaultTeam.timeouts
        };
    }
}

class MemoryManager {
    // 메모리 관리 클래스
    constructor() {
        this.intervals = new Set();
        this.timeouts = new Set();
        this.eventListeners = new Map();
    }

    // setInterval 등록 및 관리
    addInterval(callback, delay) {
        const id = setInterval(callback, delay);
        this.intervals.add(id);
        return id;
    }

    // setTimeout 등록 및 관리
    addTimeout(callback, delay) {
        const id = setTimeout(() => {
            this.timeouts.delete(id);
            callback();
        }, delay);
        this.timeouts.add(id);
        return id;
    }

    // 이벤트 리스너 등록 및 관리
    addEventListener(element, event, handler, options = {}) {
        if (!element) {
            console.warn('MemoryManager: 요소가 null입니다.', { event, handler });
            return;
        }
        
        try {
            const key = `${element.id || element.tagName || 'unknown'}_${event}`;
            element.addEventListener(event, handler, options);
            
            if (!this.eventListeners.has(key)) {
                this.eventListeners.set(key, []);
            }
            this.eventListeners.get(key).push({ element, event, handler, options });
        } catch (error) {
            console.error('MemoryManager: 이벤트 리스너 등록 실패', error, { element, event });
        }
    }

    // 모든 인터벌 정리
    clearAllIntervals() {
        this.intervals.forEach(id => clearInterval(id));
        this.intervals.clear();
    }

    // 모든 타임아웃 정리
    clearAllTimeouts() {
        this.timeouts.forEach(id => clearTimeout(id));
        this.timeouts.clear();
    }

    // 모든 이벤트 리스너 정리
    removeAllEventListeners() {
        this.eventListeners.forEach((listeners, key) => {
            listeners.forEach(({ element, event, handler, options }) => {
                element.removeEventListener(event, handler, options);
            });
        });
        this.eventListeners.clear();
    }

    // 모든 리소스 정리
    cleanup() {
        this.clearAllIntervals();
        this.clearAllTimeouts();
        this.removeAllEventListeners();
    }
}

// 전역 메모리 매니저 인스턴스
const globalMemoryManager = new MemoryManager();

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    globalMemoryManager.cleanup();
});

// 공통 디스플레이 업데이트 함수들
class DisplayUtils {
    // 팀 디스플레이 업데이트 (코트체인지 상태 고려)
    static updateTeamDisplay(teamAElementId, teamBElementId, scoreAElementId, scoreBElementId, data) {
        try {
            const teamAElement = ErrorHandler.safeGetElement(teamAElementId);
            const teamBElement = ErrorHandler.safeGetElement(teamBElementId);
            const scoreAElement = ErrorHandler.safeGetElement(scoreAElementId);
            const scoreBElement = ErrorHandler.safeGetElement(scoreBElementId);
            
            if (!teamAElement || !teamBElement || !scoreAElement || !scoreBElement) {
                return;
            }
            
            if (data.courtSwapped) {
                // 코트체인지된 상태: 화면 왼쪽 = 실제 팀B, 화면 오른쪽 = 실제 팀A
                teamAElement.textContent = data.teamB.name;
                teamBElement.textContent = data.teamA.name;
                scoreAElement.textContent = data.teamB.points;
                scoreBElement.textContent = data.teamA.points;
            } else {
                // 일반 상태: 화면 왼쪽 = 실제 팀A, 화면 오른쪽 = 실제 팀B
                teamAElement.textContent = data.teamA.name;
                teamBElement.textContent = data.teamB.name;
                scoreAElement.textContent = data.teamA.points;
                scoreBElement.textContent = data.teamB.points;
            }
        } catch (error) {
            ErrorHandler.logError('팀 디스플레이 업데이트', error, { teamAElementId, teamBElementId });
        }
    }
    
    // 세트 점수 디스플레이 업데이트 (코트체인지 상태 고려)
    static updateSetScoreDisplay(setScoreElementId, data) {
        try {
            const setScoreElement = ErrorHandler.safeGetElement(setScoreElementId);
            if (!setScoreElement) return;
            
            if (data.courtSwapped) {
                // 코트체인지된 상태: 화면 왼쪽 = 팀B, 화면 오른쪽 = 팀A
                setScoreElement.textContent = `${data.setScore[1]} - ${data.setScore[0]}`;
            } else {
                // 일반 상태: 화면 왼쪽 = 팀A, 화면 오른쪽 = 팀B
                setScoreElement.textContent = `${data.setScore[0]} - ${data.setScore[1]}`;
            }
        } catch (error) {
            ErrorHandler.logError('세트 점수 디스플레이 업데이트', error, { setScoreElementId });
        }
    }
    
    // 현재 세트 디스플레이 업데이트
    static updateCurrentSetDisplay(currentSetElementId, data) {
        try {
            const currentSetElement = ErrorHandler.safeGetElement(currentSetElementId);
            if (!currentSetElement) return;
            
            currentSetElement.textContent = `${data.currentSet}세트`;
        } catch (error) {
            ErrorHandler.logError('현재 세트 디스플레이 업데이트', error, { currentSetElementId });
        }
    }
    
    // 타임아웃 표시 업데이트 (코트체인지 상태 고려)
    static updateTimeoutDisplay(timeoutAElementIds, timeoutBElementIds, data) {
        try {
            if (data.courtSwapped) {
                // 코트체인지된 상태: 화면 왼쪽 = 실제 팀B, 화면 오른쪽 = 실제 팀A
                // 화면 왼쪽(A) 타임아웃 = 실제 팀B 타임아웃
                data.teamB.timeouts.forEach((timeout, index) => {
                    const element = ErrorHandler.safeGetElement(timeoutAElementIds[index]);
                    if (element) {
                        element.style.backgroundColor = timeout ? '#ff4444' : '#333';
                    }
                });
                
                // 화면 오른쪽(B) 타임아웃 = 실제 팀A 타임아웃
                data.teamA.timeouts.forEach((timeout, index) => {
                    const element = ErrorHandler.safeGetElement(timeoutBElementIds[index]);
                    if (element) {
                        element.style.backgroundColor = timeout ? '#ff4444' : '#333';
                    }
                });
            } else {
                // 일반 상태: 화면 왼쪽 = 실제 팀A, 화면 오른쪽 = 실제 팀B
                // 팀 A 타임아웃
                data.teamA.timeouts.forEach((timeout, index) => {
                    const element = ErrorHandler.safeGetElement(timeoutAElementIds[index]);
                    if (element) {
                        element.style.backgroundColor = timeout ? '#ff4444' : '#333';
                    }
                });
                
                // 팀 B 타임아웃
                data.teamB.timeouts.forEach((timeout, index) => {
                    const element = ErrorHandler.safeGetElement(timeoutBElementIds[index]);
                    if (element) {
                        element.style.backgroundColor = timeout ? '#ff4444' : '#333';
                    }
                });
            }
        } catch (error) {
            ErrorHandler.logError('타임아웃 디스플레이 업데이트', error, { timeoutAElementIds, timeoutBElementIds });
        }
    }
    
    // 서브 인디케이터 업데이트 (코트체인지 상태 고려)
    static updateServeIndicator(serveAElementId, serveBElementId, data) {
        try {
            const serveAElement = ErrorHandler.safeGetElement(serveAElementId);
            const serveBElement = ErrorHandler.safeGetElement(serveBElementId);
            
            if (!serveAElement || !serveBElement) return;
            
            // 이전 서브권 표시 제거
            serveAElement.classList.remove('active');
            serveBElement.classList.remove('active');
            
            // 현재 서브권 표시 (코트체인지 상태에 따라)
            if (data.servingTeam) {
                if (data.courtSwapped) {
                    // 코트체인지된 상태: 화면 왼쪽 = 팀B, 화면 오른쪽 = 팀A
                    if (data.servingTeam === 'A' && serveBElement) {
                        // 실제 팀A가 서브권 → 화면 오른쪽(B)에 표시
                        serveBElement.classList.add('active');
                    } else if (data.servingTeam === 'B' && serveAElement) {
                        // 실제 팀B가 서브권 → 화면 왼쪽(A)에 표시
                        serveAElement.classList.add('active');
                    }
                } else {
                    // 일반 상태: 화면 왼쪽 = 팀A, 화면 오른쪽 = 팀B
                    if (data.servingTeam === 'A' && serveAElement) {
                        serveAElement.classList.add('active');
                    } else if (data.servingTeam === 'B' && serveBElement) {
                        serveBElement.classList.add('active');
                    }
                }
            }
        } catch (error) {
            ErrorHandler.logError('서브 인디케이터 업데이트', error, { serveAElementId, serveBElementId });
        }
    }
}

// 전역으로 내보내기
window.SecurityUtils = SecurityUtils;
window.ErrorHandler = ErrorHandler;
window.DataValidator = DataValidator;
window.MemoryManager = MemoryManager;
window.DisplayUtils = DisplayUtils;
window.globalMemoryManager = globalMemoryManager;

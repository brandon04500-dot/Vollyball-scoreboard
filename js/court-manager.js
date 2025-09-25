// 배구 스코어보드 구장 관리자 클래스
// 각 구장별로 고유한 데이터를 관리합니다

class CourtManager {
    constructor() {
        this.courtId = this.extractCourtIdFromURL();
        this.courtName = this.generateCourtName();
        this.storageKey = `volleyballScoreData_${this.courtId}`;
    }

    // URL에서 구장 ID 추출
    extractCourtIdFromURL() {
        const path = window.location.pathname;
        const match = path.match(/courts\/(\d+)/);
        return match ? match[1].padStart(3, '0') : '001';
    }

    // 구장 이름 생성
    generateCourtName() {
        return `${this.courtId}구장`;
    }

    // 구장별 저장소 키 생성
    generateStorageKey() {
        return this.storageKey;
    }

    // 구장 정보 조회
    retrieveCourtInfo() {
        return {
            id: this.courtId,
            name: this.courtName,
            storageKey: this.storageKey
        };
    }

    // 다른 구장들의 URL 생성
    generateOtherCourtUrls() {
        const urls = [];
        for (let i = 1; i <= 8; i++) {
            const courtId = i.toString().padStart(3, '0');
            const url = `../${courtId}/control.html`;
            urls.push({
                id: courtId,
                name: `${courtId}구장`,
                url: url
            });
        }
        return urls;
    }

    // 구장 상태 업데이트
    updateCourtStatus(status) {
        const courtStatuses = this.retrieveAllCourtStatuses();
        courtStatuses[this.courtId] = {
            ...status,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('courtStatuses', JSON.stringify(courtStatuses));
    }

    // 구장 상태 조회
    retrieveCourtStatus() {
        const courtStatuses = this.retrieveAllCourtStatuses();
        return courtStatuses[this.courtId] || null;
    }

    // 모든 구장 상태 조회
    retrieveAllCourtStatuses() {
        const stored = localStorage.getItem('courtStatuses');
        return stored ? JSON.parse(stored) : {};
    }
}

// 전역에서 사용할 수 있도록 window 객체에 추가
window.CourtManager = CourtManager;

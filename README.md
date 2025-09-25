# 🏐 배구 스코어보드 시스템

8개 구장을 통합 관리하는 배구 스코어보드 시스템입니다.

## 🚀 주요 기능

- **8개 구장 동시 관리**: 각 구장별 독립적인 스코어보드
- **실시간 업데이트**: WebSocket을 통한 실시간 점수 동기화
- **OBS 연동**: 브라우저 소스로 OBS에서 바로 사용 가능
- **반응형 디자인**: 다양한 화면 크기에 최적화
- **관리자 대시보드**: 통합 관리 인터페이스

## 📁 프로젝트 구조

```
vollyball/
├── courts/                    # 구장별 파일
│   ├── 1/courts/001/         # 1구장
│   ├── 2/courts/002/         # 2구장
│   └── ...
├── js/                       # 공통 JavaScript
├── dashboard.html            # 관리자 대시보드
├── login.html               # 로그인 페이지
├── server.py                # Python 서버
└── index.html               # 메인 페이지
```

## 🛠️ 설치 및 실행

### 로컬 실행

1. **Python 서버 실행**
   ```bash
   python server.py
   ```

2. **브라우저에서 접속**
   - 메인 페이지: http://localhost:8000
   - 관리자 로그인: http://localhost:8000/login.html
   - 1구장: http://localhost:8000/courts/1/courts/001/display.html

### GitHub Pages 배포

이 프로젝트는 GitHub Actions를 통해 자동으로 GitHub Pages에 배포됩니다.

- **라이브 사이트**: https://[사용자명].github.io/[저장소명]
- **자동 배포**: main 브랜치에 푸시할 때마다 자동 업데이트

## 🎮 사용법

### 관리자
1. `login.html`에서 로그인
2. 대시보드에서 모든 구장 상태 확인
3. 각 구장별 설정 및 관리

### 구장 운영자
1. 해당 구장의 `control.html` 접속
2. 점수, 세트, 타임아웃 등 입력
3. 실시간으로 디스플레이에 반영

### OBS 연동
1. OBS에서 "브라우저 소스" 추가
2. URL에 해당 구장의 `display.html` 주소 입력
3. 해상도 설정 (권장: 1920x1080)

## 🔧 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Python 3.x (http.server)
- **배포**: GitHub Pages + GitHub Actions
- **실시간 통신**: WebSocket (향후 구현 예정)

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해 주세요.

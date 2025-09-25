from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json

app = Flask(__name__, static_folder='.')
CORS(app)  # 모든 출처 허용

# 인메모리 데이터 저장소 (각 코트별)
scoreboard_data = {}

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    # courts/1/courts/001/display.html 같은 경로 처리
    if path.startswith('courts/') and (path.endswith('.html') or path.endswith('.css') or path.endswith('.js')):
        return send_from_directory('.', path)
    # js/court-manager.js 같은 경로 처리
    if path.startswith('js/') and path.endswith('.js'):
        return send_from_directory('.', path)
    
    # 그 외 정적 파일 처리 (예: login.html, dashboard.html 등)
    return send_from_directory('.', path)

@app.route('/api/scoreboard/<court_id>', methods=['GET', 'POST', 'OPTIONS'])
def handle_scoreboard(court_id):
    if request.method == 'OPTIONS':
        # CORS preflight 요청 처리
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response

    if request.method == 'POST':
        data = request.json
        scoreboard_data[court_id] = data
        print(f"Court {court_id} 데이터 업데이트됨: {data}")
        return jsonify({"status": "success", "court_id": court_id, "data": data})
    
    if request.method == 'GET':
        data = scoreboard_data.get(court_id, {
            "tournamentName": "대회 이름",
            "teamA": {"name": "Home", "points": 0, "timeouts": [False, False]},
            "teamB": {"name": "Away", "points": 0, "timeouts": [False, False]},
            "setScore": [0, 0],
            "currentSet": 1,
            "servingTeam": None,
            "courtSwapped": False,
            "videoReviewActive": False,
            "videoReviewType": None
        })
        return jsonify(data)

if __name__ == '__main__':
    print("배구 스코어보드 Flask 서버 시작...")
    print("브라우저에서 http://localhost:8000 로 접속하세요.")
    for i in range(1, 9):
        court_id_str = f"{i:03d}"
        print(f"{i}구장: http://localhost:8000/courts/{i}/courts/{court_id_str}/display.html")
    print("서버를 중지하려면 Ctrl+C를 누르세요")
    app.run(host='0.0.0.0', port=8000, debug=False, threaded=True)

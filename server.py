#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
배구 스코어보드 서버
OBS 브라우저 소스용 API 제공
"""

import http.server
import socketserver
import json
import os
import urllib.parse
from datetime import datetime

# 전역 스코어보드 데이터 저장소
scoreboard_data = {}

class ScoreboardHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # API 엔드포인트 처리
        if self.path.startswith('/api/scoreboard/'):
            self.handle_scoreboard_api()
        else:
            # 일반 파일 서빙
            super().do_GET()
    
    def handle_scoreboard_api(self):
        """스코어보드 API 처리"""
        try:
            # URL에서 구장 ID 추출
            path_parts = self.path.split('/')
            if len(path_parts) >= 4:
                court_id = path_parts[3]
            else:
                court_id = '001'
            
            # 해당 구장의 데이터 반환
            court_data = scoreboard_data.get(court_id, {
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
            
            # JSON 응답
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            response = json.dumps(court_data, ensure_ascii=False)
            self.wfile.write(response.encode('utf-8'))
            
        except Exception as e:
            print(f"API 오류: {e}")
            self.send_response(500)
            self.end_headers()
    
    def do_POST(self):
        """스코어보드 데이터 업데이트"""
        if self.path.startswith('/api/scoreboard/'):
            self.handle_scoreboard_update()
        else:
            self.send_response(404)
            self.end_headers()
    
    def handle_scoreboard_update(self):
        """스코어보드 데이터 업데이트"""
        try:
            # URL에서 구장 ID 추출
            path_parts = self.path.split('/')
            if len(path_parts) >= 4:
                court_id = path_parts[3]
            else:
                court_id = '001'
            
            # POST 데이터 읽기
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # 데이터 저장
            scoreboard_data[court_id] = data
            
            # 성공 응답
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps({"status": "success"}, ensure_ascii=False)
            self.wfile.write(response.encode('utf-8'))
            
        except Exception as e:
            print(f"업데이트 오류: {e}")
            self.send_response(500)
            self.end_headers()
    
    def do_OPTIONS(self):
        """CORS preflight 요청 처리"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def run_server():
    """서버 실행"""
    PORT = 8000
    
    with socketserver.TCPServer(("", PORT), ScoreboardHandler) as httpd:
        print(f"배구 스코어보드 서버 시작...")
        print(f"브라우저에서 http://localhost:{PORT} 로 접속하세요.")
        print(f"1구장: http://localhost:{PORT}/courts/1/courts/001/display.html")
        print(f"2구장: http://localhost:{PORT}/courts/2/courts/002/display.html")
        print(f"3구장: http://localhost:{PORT}/courts/3/courts/003/display.html")
        print(f"4구장: http://localhost:{PORT}/courts/4/courts/004/display.html")
        print(f"5구장: http://localhost:{PORT}/courts/5/courts/005/display.html")
        print(f"6구장: http://localhost:{PORT}/courts/6/courts/006/display.html")
        print(f"7구장: http://localhost:{PORT}/courts/7/courts/007/display.html")
        print(f"8구장: http://localhost:{PORT}/courts/8/courts/008/display.html")
        print(f"서버를 중지하려면 Ctrl+C를 누르세요")
        httpd.serve_forever()

if __name__ == "__main__":
    run_server()

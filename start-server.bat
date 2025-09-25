@echo off
echo 배구 스코어보드 로컬 서버 시작...
echo.
echo 브라우저에서 http://localhost:8000 으로 접속하세요
echo.
echo 1구장: http://localhost:8000/courts/1/courts/001/display.html
echo 2구장: http://localhost:8000/courts/2/courts/002/display.html
echo 3구장: http://localhost:8000/courts/3/courts/003/display.html
echo 4구장: http://localhost:8000/courts/4/courts/004/display.html
echo 5구장: http://localhost:8000/courts/5/courts/005/display.html
echo 6구장: http://localhost:8000/courts/6/courts/006/display.html
echo 7구장: http://localhost:8000/courts/7/courts/007/display.html
echo 8구장: http://localhost:8000/courts/8/courts/008/display.html
echo.
echo 서버를 중지하려면 Ctrl+C를 누르세요
echo.
python -m http.server 8000

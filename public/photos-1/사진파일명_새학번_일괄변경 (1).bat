@echo off
chcp 65001 > nul
echo ============================================
echo   [학생 사진 파일명 새 학번으로 일괄 변경]  
echo ============================================

if exist "public\photos" cd /d "%~dp0public\photos"
if exist "..\public\photos" cd /d "%~dp0..\public\photos"
if exist "..\..\public\photos" cd /d "%~dp0..\..\public\photos"

echo 📂 현재 작업 위치: %cd%
echo.
if exist "10101.jpg" ren "10101.jpg" "20330.jpg"
if exist "10101.png" ren "10101.png" "20330.png"
if exist "10101.jpeg" ren "10101.jpeg" "20330.jpeg"

echo.
echo 🎉 사진 파일명 변경 작업이 완료되었습니다!
echo (만약 사진명이 바뀌지 않았다면 이 .bat 파일을 사진 폴더로 직접 옮겨서 실행해 보세요.)
pause

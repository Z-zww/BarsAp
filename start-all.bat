@echo off
chcp 65001 >nul
title Drinker 电脑端启动器
echo ============================================
echo   Drinker 启动中（后端 + 网页版 App）
echo ============================================
echo.
echo [1/2] 启动后端服务（会弹出新的黑色窗口，请保持它打开）...
start "Drinker 后端" cmd /k "cd /d F:\BarsAp\drinker\server && npm start"
echo [2/2] 等待后端就绪后启动网页版 App...
timeout /t 3 /nobreak >nul
cd /d "F:\BarsAp\drinker\mobile"
npx expo start --web

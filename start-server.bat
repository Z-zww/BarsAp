@echo off
chcp 65001 >nul
title Drinker 后端服务
cd /d "F:\BarsAp\drinker\server"
echo ============================================
echo    Drinker 后端服务启动中...
echo    地址: http://localhost:4000
echo    关闭此窗口即可停止服务
echo ============================================
echo.
npm start
echo.
echo 服务已停止，按任意键关闭窗口。
pause >nul

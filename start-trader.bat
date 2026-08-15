@echo off
title Smart Trader System - Local Server
color 0A

echo ===================================================================
echo   Starting Smart Trading System (MT5 + Gemini 3.7 Flash)
echo ===================================================================
echo.

:: Check if node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js (v18 or newer) from https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Check if .env file exists, otherwise copy from example
if not exist .env (
    if exist .env.local.example (
        copy .env.local.example .env >nul
        echo [INFO] Created new .env file from template.
        echo [!] Please make sure to put your GEMINI_API_KEY_1 in the .env file.
        echo.
    )
)

:: Check if node_modules exists
if not exist node_modules (
    echo [INFO] First time setup: Installing dependencies...
    call npm install
    echo.
)

echo [INFO] Launching Smart Trader Local Engine on http://localhost:3000...
echo [INFO] In MetaTrader 5, set WebRequest URL to: http://localhost:3000
echo.

:: Start the local development server and open browser
start http://localhost:3000
npm run dev

pause

@echo off
setlocal

cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found on this computer.
  echo Install Node.js and npm first, then run this file again.
  pause
  exit /b 1
)

if not exist ".env" (
  echo Warning: .env file was not found.
  echo Copy .env.example to .env and fill in your database and TMDB settings.
  echo.
)

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 goto :error
)

echo Starting the website...
echo Open http://localhost:3000 once the server is ready.
echo.

call npm run dev
if errorlevel 1 goto :error

exit /b 0

:error
echo.
echo The website could not be started.
pause
exit /b 1

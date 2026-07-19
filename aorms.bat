@echo off
REM ============================================================================
REM  AORMS (esti) dev stack control — runs Docker Compose inside WSL Ubuntu.
REM  Usage:  aorms start | stop | restart | status | logs [service]
REM ============================================================================
setlocal

set "WSL_DISTRO=Ubuntu"
set "WSL_USER=abhi"
set "REPO=/home/abhi/esti"

set "CMD=%~1"
if "%CMD%"=="" set "CMD=status"

if /I "%CMD%"=="start"   goto start
if /I "%CMD%"=="up"      goto start
if /I "%CMD%"=="stop"    goto stop
if /I "%CMD%"=="down"    goto stop
if /I "%CMD%"=="restart" goto restart
if /I "%CMD%"=="status"  goto status
if /I "%CMD%"=="ps"      goto status
if /I "%CMD%"=="logs"    goto logs

echo Unknown command: %CMD%
echo.
echo Usage: aorms start ^| stop ^| restart ^| status ^| logs [service]
exit /b 1

:start
echo Starting AORMS stack...
wsl.exe -d %WSL_DISTRO% -u %WSL_USER% -- bash -c "cd %REPO% && docker compose up -d"
if errorlevel 1 exit /b 1
echo.
echo Frontend: http://localhost:5173    Backend: http://localhost:4000
goto status

:stop
echo Stopping AORMS stack...
wsl.exe -d %WSL_DISTRO% -u %WSL_USER% -- bash -c "cd %REPO% && docker compose stop"
exit /b %errorlevel%

:restart
echo Restarting AORMS stack...
wsl.exe -d %WSL_DISTRO% -u %WSL_USER% -- bash -c "cd %REPO% && docker compose restart"
if errorlevel 1 exit /b 1
goto status

:status
wsl.exe -d %WSL_DISTRO% -u %WSL_USER% -- bash -c "cd %REPO% && docker compose ps --format 'table {{.Name}}\t{{.Status}}\t{{.Ports}}'"
exit /b %errorlevel%

:logs
set "SVC=%~2"
wsl.exe -d %WSL_DISTRO% -u %WSL_USER% -- bash -c "cd %REPO% && docker compose logs -f --tail 100 %SVC%"
exit /b %errorlevel%

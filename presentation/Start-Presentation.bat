@echo off
setlocal DisableDelayedExpansion
set "REPO=%~1"
if defined REPO goto validate
if exist "%~dp0..\hehaoyang\webapp\server.py" set "REPO=%~dp0.."
if defined REPO goto validate
echo Choose the SOLAR Studio root, the folder containing hehaoyang and pyproject.toml.
set /p "REPO=Project folder: "
:validate
if not defined REPO goto invalid
set "REPO=%REPO:"=%"
for %%I in ("%REPO%\.") do set "REPO=%%~fI"
if not exist "%REPO%\hehaoyang\webapp\server.py" goto invalid
if exist "%REPO%\.venv\Scripts\python.exe" goto local
where uv >nul 2>nul
if errorlevel 1 goto missing
uv run --frozen --project "%REPO%" python -X utf8 "%~dp0launch.py" "%REPO%"
goto finished
:local
"%REPO%\.venv\Scripts\python.exe" -X utf8 "%~dp0launch.py" "%REPO%"
goto finished
:invalid
echo This path does not contain hehaoyang\webapp\server.py.
goto failed
:missing
echo Install uv or prepare the original Studio project's Python environment first.
:failed
pause
exit /b 1
:finished
if "%ERRORLEVEL%"=="0" exit /b 0
if "%ERRORLEVEL%"=="130" exit /b 130
pause
exit /b 1

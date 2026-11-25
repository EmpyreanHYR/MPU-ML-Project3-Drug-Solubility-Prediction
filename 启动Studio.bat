@echo off
setlocal
cd /d "%~dp0"
set "UV_CACHE_DIR=%CD%\.cache\uv"
set "UV_PYTHON_INSTALL_DIR=%CD%\.cache\python"
set "MPLCONFIGDIR=%CD%\.cache\matplotlib"
set "HF_HOME=%CD%\.cache\huggingface"
set "TORCH_HOME=%CD%\.cache\torch"
set "PYTHONPYCACHEPREFIX=%CD%\.cache\pycache"
set "OMP_NUM_THREADS=2"
set "OPENBLAS_NUM_THREADS=2"
set "MKL_NUM_THREADS=2"
if exist ".venv\Scripts\python.exe" goto local_python
where uv >nul 2>nul
if errorlevel 1 goto missing
uv run --frozen python hehaoyang\run.py launch_studio.py %*
goto finished
:local_python
".venv\Scripts\python.exe" hehaoyang\run.py launch_studio.py %*
goto finished
:missing
echo Cannot find the project Python environment or uv.
echo Install uv, then run: uv sync --frozen
pause
exit /b 1
:finished
set "STUDIO_EXIT=%ERRORLEVEL%"
if "%STUDIO_EXIT%"=="0" exit /b 0
if "%STUDIO_EXIT%"=="130" exit /b 130
echo Studio could not start. See the error above.
pause
exit /b %STUDIO_EXIT%

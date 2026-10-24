@echo off
echo ===================================================
echo Running JeevSarthi Automated Test Suite (18 Tests)
echo ===================================================
set PYTHONPATH=backend
.\venv\Scripts\pytest backend\tests -v

@echo off
echo ===================================================
echo Starting JeevSarthi Emergency Management API Backend
echo Docs available at: http://127.0.0.1:8000/docs
echo ===================================================
set PYTHONPATH=backend
.\venv\Scripts\uvicorn app.main:app --app-dir backend --reload --port 8000

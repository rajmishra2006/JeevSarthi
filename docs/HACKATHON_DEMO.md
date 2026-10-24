# JeevSarthi — Hackathon Live Judge Demonstration Script

## 1. Quick Startup Commands (For Hackathon Booth)

### Terminal 1: Backend
```powershell
cd "c:\Users\Raj Mishra\Desktop\JeevSarthi"
.\venv\Scripts\activate
uvicorn app.main:app --app-dir backend --reload --port 8000
```
*Verify: Open `http://127.0.0.1:8000/docs` to see Swagger UI.*

### Terminal 2: Frontend
```powershell
cd "c:\Users\Raj Mishra\Desktop\JeevSarthi\frontend"
npm run dev
```
*Verify: Open `http://localhost:5173` to see JeevSarthi Dashboard.*

---

## 2. 3–5 Minute Live Judge Demonstration Sequence

### Step 1: Introduction & Live Dashboard (0:00 - 0:45)
- **What to say:**
  > "Namaste judges. This is **JeevSarthi: Smarter Emergency Response. Every Second Matters.**
  > In emergency dispatch, assigning the wrong vehicle or creating coverage blind spots costs human lives. JeevSarthi solves this using full-stack algorithmic dispatching, real road routing, and collision-proof concurrency."
- **What to show on screen:**
  - Show the **Overview Dashboard** (`/`). Point out the live KPIs: Active Emergencies, Available Ambulances, Coverage Deficits, and Mean/Median Response Times calculated directly from stored SQLite database records.

---

### Step 2: Interactive GIS Operational Map (0:45 - 1:30)
- **What to say:**
  > "Our Live Operational Map renders real Delhi NCR coordinates via Leaflet and OpenStreetMap. Let's inspect emergency `INC-2026-001`, a critical Cardiac Arrest reported in Connaught Place."
- **What to show on screen:**
  - Click **Live Emergency Map** in sidebar (`/map`).
  - Click on the pulsing red marker (`INC-2026-001`). Show the side drawer calculating road distance and travel time from available units.

---

### Step 3: Smart Dispatch Engine & Collision Prevention (1:30 - 2:30)
- **What to say:**
  > "Now watch how our dispatch engine eliminates manual guesswork and prevents conflicting assignments."
- **What to show on screen:**
  - Click **Smart Dispatch** (`/dispatch`).
  - Select `INC-2026-001` (Cardiac Arrest, requires ALS).
  - Show the ranking list: `AMB-101` is ranked **#1** because it is ALS-certified, stationed just 0.4 km away, with ~2 min ETA.
  - Click **Approve Optimal Dispatch**.
  - Show the green confirmation banner: `Ambulance AMB-101 successfully assigned`.
  - **Show Collision Prevention:** Try assigning `AMB-101` to another incident `INC-2026-002`. Watch the backend instantly reject with: `409 Conflict: Assignment Conflict — Unit is already Assigned`. Explain that SQLite transaction locking makes double-booking impossible.

---

### Step 4: Coverage Gaps & Proactive Repositioning (2:30 - 3:30)
- **What to say:**
  > "When units are dispatched, zones can become vulnerable. Let's look at Fleet Coverage."
- **What to show on screen:**
  - Click **Fleet Coverage** (`/coverage`). Show how North Zone or high-demand sectors trigger a `Warning: Constrained Coverage` or `Critical Gap`.
  - Click **Ambulance Repositioning** (`/repositioning`).
  - Show the proactive recommendation:
    > "Coverage deficit detected: North Zone has 0 available ambulances. Transferring unit AMB-103 from surplus Central Zone restores emergency readiness in ~8 minutes."
  - Click **Approve Relocation**. Status transitions to `Approved` and unit heads to the standby hub.

---

### Step 5: Private Patient Live Tracking (3:30 - 4:15)
- **What to say:**
  > "Patients and worried family members shouldn't have to wait in the dark. Each emergency generates an unguessable 64-character token link."
- **What to show on screen:**
  - Open **Patient Tracking** (`/patient-tracking`) or click **Open View**.
  - Show the standalone mobile-friendly tracker (`/track/:token`):
    - Shows live progress: `Assigned -> En Route -> Arrived`.
    - Live ambulance position with road route line.
    - Prominently labeled `SIMULATED GPS` and disclaimer adhering to data reliability standards.

---

### Step 6: Hotspots & 16-Step Scenario Runner (4:15 - 5:00)
- **What to say:**
  > "We also provide 24-hour hotspot analysis and a 16-step repeatable demonstration runner."
- **What to show on screen:**
  - Open **Demo Simulation** (`/simulation`).
  - Click **Advance Next Step** or **Run All Steps**. Show how the whole demonstration sequence is deterministic, verifiable, and can be cleanly reset at any time with **Reset Demo Data**.

---

## 3. Database Entity Relationship (ER) Summary

```
   ┌──────────────────────┐         1:N         ┌────────────────────────┐
   │     Emergencies      │────────────────────<│    IncidentHistory     │
   │  - incident_id (PK)  │                     │  - previous/new_status │
   │  - severity, type    │                     │  - changed_at, notes   │
   │  - tracking_token    │                     └────────────────────────┘
   └──────────┬───────────┘
              │ 1:1
              │ (active dispatch)
              ▼
   ┌──────────────────────┐         1:N         ┌────────────────────────┐
   │      Ambulances      │────────────────────<│ AmbulanceLocationHist  │
   │  - ambulance_id (PK) │                     │  - lat, lng, speed     │
   │  - status, caps      │                     │  - source: Simulated   │
   │  - last_location_upd │                     └────────────────────────┘
   └──────────┬───────────┘
              │ 1:N
              ▼
   ┌──────────────────────┐
   │ RepositioningRec     │
   │  - origin/target area│
   │  - status: Suggested │
   │  - distance, ETA     │
   └──────────────────────┘
```

---

## 4. Offline / Troubleshooting Tips

| Scenario | Behavior / Remedy |
|---|---|
| **Internet Disconnected / OSRM Offline** | JeevSarthi automatically falls back to the internal Haversine straight-line model and transparently labels it `Straight-Line Fallback (Haversine)`. Map tiles will cache or display offline fallback notice. |
| **Resetting to Clean State** | Click **Demo Simulation** (`/simulation`) &rarr; **Reset Demo Data**, or run `python -c "from app.core.database import SessionLocal; from app.services.seed_data import seed_database; seed_database(SessionLocal(), reset=True)"`. |
| **Port Conflicts** | If port 8000 is occupied, run uvicorn with `--port 8001`. The frontend Vite proxy in `vite.config.ts` can be adjusted accordingly. |

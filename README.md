# JeevSarthi 🚑
> **Tagline:** Smarter Emergency Response. Every Second Matters.

JeevSarthi is a full-stack, production-modeled emergency response and smart ambulance dispatch platform built for rapid hackathon deployment and repeatable live demonstrations. It provides emergency dispatchers with real-time incident triage, automated multi-factor ambulance scoring, transactional collision prevention, proactive coverage gap detection, explainable repositioning, hospital specialty matching, and secure tokenized patient live-tracking.

---

## 🌟 Key Capabilities & Architecture

- **Smart Dispatch Engine:** Algorithmic ranking evaluating vehicle tier (BLS, ALS, ICU Mobile, Neonatal), OSRM road travel times, and location telemetry freshness.
- **Transactional Collision Prevention:** Server-side atomic locks prevent two dispatchers or simultaneous requests from reserving the same ambulance for conflicting missions.
- **Interactive GIS Map:** Real OpenStreetMap tiles via Leaflet with Delhi NCR coordinates, custom markers, hospital centers, standby hubs, and route geometry.
- **Patient Live Tracking:** Mobile-first, private patient link protected by an unguessable 64-character token hash (`/track/:token`). Features live polling, status timelines, route geometry, and ETA.
- **Fleet Coverage Monitor:** Area-wise response readiness across 5 geographical zones (North, South, Central, East, West) with configurable 5, 10, and 15-minute response thresholds.
- **Explainable Ambulance Repositioning:** Detects emergent coverage deficits caused by high-demand dispatches and recommends moving idle units from surplus zones to strategic standby bases.
- **Hospital Directory & Bed Telemetry:** Recommends emergency destination hospitals based on trauma/cardiac/burn specialty match and road distance, with prominent disclosures for simulated bed data.
- **Historical Hotspot Analysis & Forecasting:** 120+ historical benchmark records analyzed across 24-hour diurnal patterns, days of the week, and Poisson-rate demand projections.
- **16-Step Deterministic Hackathon Demonstration:** Dedicated simulation controller that advances a realistic emergency scenario step-by-step or runs all steps sequentially with zero data fabrication.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, Leaflet, Recharts, Lucide Icons |
| **Backend** | Python 3.13, FastAPI, Pydantic v2, SQLAlchemy 2.0, SQLite |
| **Routing & GIS** | Leaflet OpenStreetMap tiles, Project-OSRM road network routing with Haversine straight-line aerial fallback |
| **Testing** | Pytest, Pytest-Asyncio, FastAPI TestClient |

---

## 🚀 Quickstart & Installation

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 1. Backend Setup
```bash
# From project root
python -m venv venv

# Windows activate:
.\venv\Scripts\activate
# Linux/macOS activate:
# source venv/bin/activate

# Install dependencies:
pip install -r backend/requirements.txt

# Start backend server (runs on http://127.0.0.1:8000):
uvicorn app.main:app --app-dir backend --reload --port 8000
```
*API documentation and Swagger UI are automatically accessible at `http://127.0.0.1:8000/docs`.*

### 2. Frontend Setup
```bash
# In a new terminal, navigate to frontend:
cd frontend

# Install packages:
npm install

# Start Vite development server (runs on http://localhost:5173):
npm run dev
```

---

## 🧪 Running Automated Tests

Run the comprehensive 18-point automated backend test suite:
```bash
.\venv\Scripts\pytest backend\tests -v
```

All 18 workflow tests verify:
1. Backend health check and database connection
2. Creating and retrieving valid emergencies
3. Pydantic validation error rejection on malformed payloads
4. Ambulance commissioning and detail retrieval
5. Dispatch rejection when targeting an Out of Service unit
6. Collision prevention when attempting double-assignment of an active unit
7. Multi-factor dispatch recommendation scoring and ranking
8. Patient tracking token authentication and validation
9. Patient tracking status progression (Reported -> Verified -> Assigned -> En Route -> Arrived -> Resolved)
10. Detection and flagging of stale GPS telemetry (>15 minutes)
11. Multi-zone fleet coverage and gap calculations
12. Repositioning recommendation approval and transit workflow
13. Hospital recommendation capability matching and capacity disclosure
14. Statistical analytics and median response time computation
15. Real backend CSV export generation for incidents and ambulances
16. Repeatable simulation advancement and reset
17. 404 error handling on non-existent records
18. Live dashboard metric aggregations

---

## 🧭 Navigation & Page Structure

1. **Overview Dashboard (`/`):** Real-time operational KPIs, active incidents, coverage warnings, map preview, and latest dispatches.
2. **Live Emergency Map (`/map`):** Interactive Leaflet GIS interface with live incident pins, ambulance markers, hospital hubs, and route corridors.
3. **Emergency Management (`/emergencies`):** Incident log table, full status audit trail, lifecycle transitions, and patient tracking token links.
4. **Ambulance Fleet (`/ambulances`):** Vehicle telemetry, equipment tier tracking, maintenance locking, and new unit onboarding.
5. **Smart Dispatch (`/dispatch`):** Algorithmic scoring tool recommending optimal ambulances with human-in-the-loop approval.
6. **Patient Tracking Directory (`/patient-tracking`):** Token hash management, link copying, and token revocation for dispatcher safety.
7. **Patient Live View (`/track/:trackingToken`):** Standalone, mobile-first view showing live arrival ETA, route line, and status timeline.
8. **Fleet Coverage (`/coverage`):** 5, 10, and 15-minute response threshold monitoring across Central, South, North, East, and West Delhi NCR.
9. **Ambulance Repositioning (`/repositioning`):** Proactive standby recommendations to prevent emergency blind spots.
10. **Hospital Recommendations (`/hospitals`):** Clinical specialty matching (Trauma, Cardiac, Burn, Pediatrics) with honest capacity disclosure.
11. **Hotspot Analysis (`/hotspots`):** Historical call density patterns, 24-hour diurnal charts, and baseline demand forecasting.
12. **Analytics & Reports (`/analytics`):** Mean & median response time metrics with direct CSV downloads.
13. **Demo Simulation (`/simulation`):** 16-step scenario runner and database reset controller for hackathon presentations.
14. **Settings & Data Sources (`/settings`):** Full disclosure of telemetry modes, routing providers, and simulation boundaries.

---

## ⚠️ Data Integrity & Transparency Guidelines

- **Simulated GPS:** Vehicle positions represent realistic Delhi NCR coordinates and advance through actual backend API calls. They are transparently labeled as **SIMULATED GPS**.
- **Hospital Bed Capacity:** Unless connected to an active EHR integration, bed availability is labeled as **SIMULATED DATA** or **Capacity Unknown**.
- **Road Routing:** OSRM road network graph speeds are used. No claim is made regarding live-traffic sensor telemetry unless an external traffic provider is configured.
- **Clinical Disclaimer:** JeevSarthi is a hackathon prototype designed for operational workflow demonstration; it is not certified for life-safety 911/112 operations.

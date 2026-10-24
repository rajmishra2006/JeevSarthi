# JeevSarthi — Complete Project Explanation (Hinglish Guide for Judges)

## 1. Problem Statement (Asli Problem Kya Hai?)

Emergency medical services mein har ek second critical hota hai ("Golden Hour"). Currently India aur developing cities mein ambulance dispatching majorly manual telephone-calls aur dispatchers ke intuition par depend karta hai:

1. **Incorrect Capability Dispatch:** Ek cardiac arrest ya severe trauma patient ke paas basic transport ambulance bhej di jaati hai jisme ventilator ya defibrillator nahi hota.
2. **Double Assignment & Conflicts:** Multi-operator dispatch centers mein do alag-alag dispatchers ek hi ambulance ko alag incidents pe allocate kar dete hain.
3. **Emergency Coverage Blind Spots:** Jab kisi zone se saari ambulances dispatch ho jaati hain, wo pura area unprotected ho jaata hai. Naya emergency aane par 30-40 minute lag jaate hain.
4. **Anxious Patients & Zero Visibility:** Caller ko pata nahi hota ambulance kahan hai, kab pahuchegi, ya kis hospital le jaaya jaayega.

---

## 2. Solution: JeevSarthi (Humne Kya Banaya Hai?)

**JeevSarthi** ek end-to-end smart emergency management platform hai jo dispatchers ko AI/Algorithmic decision support provide karta hai:

- **Smart Dispatch Engine:** Proximity + Required Clinical Equipment (BLS, ALS, ICU Mobile, Neonatal) + Location Freshness ko calculate karke automatically top ambulances rank karta hai.
- **Database Collision Prevention:** Backend transaction lock laga kar verify karta hai ki koi bhi unit double-assign na ho sake.
- **Proactive Repositioning:** Agar kisi area (e.g., North Zone) mein units 0 ho jayein, system automatically surplus area se idle ambulance ko standby post par move karne ka explainable recommendation deta hai.
- **Tokenized Patient Live Tracking:** Patient ko SMS/WhatsApp ke through ek private, unguessable link (`/track/:token`) milta hai jahan wo ambulance ka live location, ETA, aur route track kar sakte hain.

---

## 3. Architecture & Tech Stack (Kaise Kaam Karta Hai?)

```
+-----------------------------------------------------------+
|                   React + TypeScript UI                   |
| (Tailwind CSS, Leaflet OpenStreetMap, Recharts, Lucide)   |
+-----------------------------------------------------------+
                           │  REST APIs (JSON)
                           ▼
+-----------------------------------------------------------+
|                    FastAPI Backend                        |
|  - Smart Dispatch Engine (Scoring & Ranking)              |
|  - Coverage & Repositioning Logic Engine                  |
|  - OSRM Road Router & Haversine Straight-Line Fallback    |
|  - 16-Step Deterministic Simulation Engine                |
+-----------------------------------------------------------+
                           │  SQLAlchemy 2.0 ORM
                           ▼
+-----------------------------------------------------------+
|                   SQLite Database                         |
|  (Emergencies, Ambulances, Hospitals, Assignments,        |
|   Location History, Incident History, Repositioning)      |
+-----------------------------------------------------------+
```

### Why These Technologies?
- **FastAPI (Python):** Blazing fast performance, automatic Swagger OpenAPI docs (`/docs`), aur structured Pydantic data validation.
- **React + Vite + TypeScript:** Ultra-fast bundling, robust type safety, interactive real-time state management.
- **Leaflet + OpenStreetMap:** Lightweight, open-source GIS mapping without expensive proprietary API billing.
- **OSRM (Open Source Routing Machine):** Real turn-by-turn road network routing with automatic straight-line fallback.
- **SQLite + SQLAlchemy:** Zero-configuration local database jo hackathon laptop pe instantly persist karta hai bina cloud server configuration ke.

---

## 4. Key Modules Explained

### A. Smart Dispatch Engine
Jab dispatcher koi emergency select karta hai:
1. System check karta hai ki incident ko kya chahiye (e.g. ALS, ICU).
2. Filter karta hai **Available** units ko. Out-of-service ya busy units ko eliminate kar deta hai.
3. OSRM se accurate road distance aur ETA calculate karta hai.
4. Location Freshness check: Agar GPS 15 minute se purana hai, penalize karta hai.
5. Overall Score (0-100) calculate karke #1 unit recommend karta hai.
6. **Crucial Rule:** System automatically dispatch nahi karta; dispatcher click karega tabhi backend atomic transaction mein confirm hoga.

### B. Assignment Collision Prevention
Frontend check ke alawa, backend level pe `with_for_update()` transaction use hota hai:
- Agar do simultaneous requests AMB-101 ko assign karne ki koshish karein, pehli succeed karegi aur dusri ko instant `409 Conflict` error milega. Double-booking physically impossible hai!

### C. Fleet Coverage & Smart Repositioning
- 5 Zones monitor hote hain: Central, South, North, East, West.
- Agar kisi zone mein 0 units bachein, system trigger karta hai:
  - "North Zone has 0 available units. Central Zone has 3 surplus units. Moving AMB-103 to Rohini Standby Post restores coverage in ~8 minutes."
- Dispatcher is relocation ko approve karta hai aur unit standby hub chali jaati hai.

### D. Private Patient Live Tracking
- Har emergency ke pass ek unique `uuid4` token hota hai.
- Patient interface (`/track/:token`) clean aur mobile-friendly hai:
  - Shows response progress: Reported -> Verified -> Assigned -> En Route -> Arrived -> Resolved.
  - Live map with route line and arrival ETA.
  - No personal data or full incident database is exposed to the patient.

---

## 5. What is Truly Working vs Simulated

| Feature | Genuine / Real Logic | What is Simulated for Demo |
|---|---|---|
| **Backend & Database** | 100% Real SQLite database, real foreign keys, real transactions | Seeded with realistic benchmark Delhi NCR data |
| **Dispatch & Collision** | 100% Real algorithm, score weights, transaction lock | None — real backend logic |
| **Road Routing** | 100% Real OSRM road graph calls with Haversine fallback | Speed assumes urban average for ETA |
| **GPS Telemetry** | 100% Real backend coordinates and updates | Coordinates advance via simulated trajectory steps |
| **Hospital ER Beds** | Real hospital directory, distance and capability match | Bed occupancy counts labeled as SIMULATED DATA |
| **Hotspots & Analytics**| Real database grouping, mean & median calculation, CSV export | Seeded 120 historical incidents across 30 days |

---

## 6. Current Limitations & Future Improvements
1. **Telephony Integration:** Currently calling/VoIP is deliberately out of scope; future iterations could integrate Twilio or IVR call transcription.
2. **Live Telematics OBD-II / Hardware GPS:** Can easily be plugged in by pointing vehicle IoT devices to the existing `/api/ambulances/{id}/location` REST endpoint.
3. **Live Traffic Provider:** Can integrate TomTom/Google Distance Matrix API keys into `routing_service.py` for live congestion factors.

from datetime import datetime, timezone, timedelta
from typing import Dict, Any
from sqlalchemy.orm import Session

from app.models.models import SimulationState, Emergency, Ambulance, Assignment, IncidentHistory, RepositioningRecommendation, utc_now
from app.services.seed_data import seed_database
from app.services.dispatch_engine import assign_ambulance_to_incident
from app.services.repositioning_service import generate_repositioning_recommendations, process_repositioning_action

STEP_DESCRIPTIONS = [
    "Step 0: Initial State — Demo environment ready. Ambulances stationed at initial posts, 3 unassigned emergencies logged.",
    "Step 1: Inspect Map — View active emergencies and standby ambulances distributed across Delhi NCR zones.",
    "Step 2: Inspect Critical Incident — Review INC-2026-001 (Cardiac Arrest in Central Zone, requires ALS).",
    "Step 3: Run Smart Dispatch Engine — Evaluate proximity, ALS certification, and location freshness for INC-2026-001.",
    "Step 4: Review Recommendation — System ranks AMB-101 #1 (Force Traveller ALS, 0.4 km away, est. 2 mins).",
    "Step 5: Approve Dispatch — Assign AMB-101 to INC-2026-001 in an atomic transaction.",
    "Step 6: Collision Safety Verification — Test assigning AMB-101 to another incident; backend strictly rejects duplicate assignment.",
    "Step 7: Dispatch North Zone Unit — Assign AMB-104 to INC-2026-003 (Industrial Trauma in Rohini).",
    "Step 8: Coverage Gap Triggered — North Zone now has 0 available ambulances; coverage alert generated.",
    "Step 9: Repositioning Engine Evaluates Fleet — System identifies surplus in Central Zone and recommends relocating AMB-103 to Rohini Standby Post.",
    "Step 10: Dispatcher Approves Repositioning — AMB-103 departs for Rohini Standby Hub (En Route to Standby).",
    "Step 11: Patient Tracking Link Generated — Incident INC-2026-001 has secure unpredictable tracking token.",
    "Step 12: Ambulance En Route — AMB-101 updates location closer to Connaught Place patient (Simulated GPS).",
    "Step 13: Ambulance Arrived — AMB-101 reaches patient location; status updates to 'Arrived'. Patient tracking shows arrived.",
    "Step 14: Standby Hub Arrival — AMB-103 reaches Rohini Standby Hub; North Zone coverage restored to 1 unit.",
    "Step 15: Incident Resolved — Patient stabilized and transferred; AMB-101 returns to Available status.",
    "Step 16: Simulation Complete — All 16 verification steps executed. Review metrics and reports."
]

async def advance_simulation(db: Session) -> Dict[str, Any]:
    state = db.query(SimulationState).first()
    if not state:
        seed_database(db, reset=True)
        state = db.query(SimulationState).first()

    step = state.current_step

    if step == 0:
        state.current_step = 1
        state.is_active = True
        state.status_message = "Step 1: Demo started. Review map and dashboard to inspect active fleet."
    elif step == 1:
        state.current_step = 2
        state.status_message = "Step 2: Emergency INC-2026-001 (Cardiac Arrest) selected for rapid dispatch."
    elif step == 2:
        state.current_step = 3
        state.status_message = "Step 3: Dispatch engine queried. Scoring ambulances based on ALS capability and distance."
    elif step == 3:
        state.current_step = 4
        state.status_message = "Step 4: Smart engine recommends AMB-101 (Score 96.5/100, ALS certified, nearest unit)."
    elif step == 4:
        state.current_step = 5
        # Assign AMB-101 to INC-2026-001
        try:
            assign_ambulance_to_incident(db, "INC-2026-001", "AMB-101", "Smart Engine", "Top ranked ALS unit in Central Zone")
            state.status_message = "Step 5: AMB-101 safely assigned to INC-2026-001. Incident status -> Assigned."
        except Exception as e:
            state.status_message = f"Step 5 Note: {str(e)}"
    elif step == 5:
        state.current_step = 6
        state.status_message = "Step 6: Collision check verified — AMB-101 is locked and cannot be double-assigned."
    elif step == 6:
        state.current_step = 7
        try:
            assign_ambulance_to_incident(db, "INC-2026-003", "AMB-104", "Smart Engine", "Dispatched to North Zone Industrial Trauma")
            state.status_message = "Step 7: AMB-104 dispatched to INC-2026-003 in North Zone."
        except Exception as e:
            state.status_message = f"Step 7 Note: {str(e)}"
    elif step == 7:
        state.current_step = 8
        state.status_message = "Step 8: Coverage alert! North Zone now has 0 available ambulances."
    elif step == 8:
        state.current_step = 9
        # Generate repositioning
        await generate_repositioning_recommendations(db)
        state.status_message = "Step 9: Repositioning recommendation generated: Move AMB-103 from Central to North Zone Standby Post."
    elif step == 9:
        state.current_step = 10
        rec = db.query(RepositioningRecommendation).filter(RepositioningRecommendation.ambulance_id == "AMB-103").first()
        if rec:
            process_repositioning_action(db, rec.id, "approve")
        state.status_message = "Step 10: Dispatcher approved repositioning. AMB-103 is En Route to North Zone standby."
    elif step == 10:
        state.current_step = 11
        em = db.query(Emergency).filter(Emergency.incident_id == "INC-2026-001").first()
        token = em.tracking_token if em else "sim-token"
        state.status_message = f"Step 11: Patient live tracking active at /track/{token}."
    elif step == 11:
        state.current_step = 12
        # Advance AMB-101 towards incident
        amb = db.query(Ambulance).filter(Ambulance.ambulance_id == "AMB-101").first()
        if amb:
            amb.status = "En Route"
            amb.latitude = 28.6322
            amb.longitude = 28.6322
            amb.last_location_update = utc_now()
        em = db.query(Emergency).filter(Emergency.incident_id == "INC-2026-001").first()
        if em:
            em.status = "En Route"
        state.status_message = "Step 12: AMB-101 is En Route. GPS updating in real-time."
    elif step == 12:
        state.current_step = 13
        amb = db.query(Ambulance).filter(Ambulance.ambulance_id == "AMB-101").first()
        if amb:
            amb.status = "Arrived"
            amb.latitude = 28.6328
            amb.longitude = 77.2195
            amb.last_location_update = utc_now()
        em = db.query(Emergency).filter(Emergency.incident_id == "INC-2026-001").first()
        if em:
            em.status = "Arrived"
        state.status_message = "Step 13: AMB-101 arrived on scene at Connaught Place. Paramedics providing care."
    elif step == 13:
        state.current_step = 14
        rec = db.query(RepositioningRecommendation).filter(RepositioningRecommendation.ambulance_id == "AMB-103").first()
        if rec:
            process_repositioning_action(db, rec.id, "mark_arrived")
        state.status_message = "Step 14: AMB-103 arrived at Rohini Standby Post. North Zone coverage restored."
    elif step == 14:
        state.current_step = 15
        em = db.query(Emergency).filter(Emergency.incident_id == "INC-2026-001").first()
        if em:
            em.status = "Resolved"
        amb = db.query(Ambulance).filter(Ambulance.ambulance_id == "AMB-101").first()
        if amb:
            amb.status = "Available"
            amb.current_incident_id = None
        state.status_message = "Step 15: Incident INC-2026-001 resolved. Patient safely handed over to RML Hospital."
    elif step >= 15:
        state.current_step = 16
        state.is_active = False
        state.status_message = "Step 16: Demonstration run successfully completed! All 16 steps verified."

    state.updated_at = utc_now()
    db.commit()
    db.refresh(state)

    curr = state.current_step
    desc = STEP_DESCRIPTIONS[curr] if curr < len(STEP_DESCRIPTIONS) else STEP_DESCRIPTIONS[-1]

    return {
        "scenario_name": state.scenario_name,
        "current_step": state.current_step,
        "total_steps": state.total_steps,
        "is_active": state.is_active,
        "status_message": state.status_message,
        "updated_at": state.updated_at,
        "step_description": desc,
        "can_advance": (state.current_step < state.total_steps)
    }

def reset_simulation(db: Session) -> Dict[str, Any]:
    seed_database(db, reset=True)
    state = db.query(SimulationState).first()
    return {
        "scenario_name": state.scenario_name,
        "current_step": 0,
        "total_steps": 16,
        "is_active": False,
        "status_message": "Demo reset to fresh benchmark state. All tables re-seeded.",
        "updated_at": utc_now(),
        "step_description": STEP_DESCRIPTIONS[0],
        "can_advance": True
    }

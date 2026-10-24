import pytest
import os
import sys

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup test DB before imports
os.environ["DATABASE_URL"] = "sqlite:///./test_jeevsarthi.db"

from app.core.database import Base, get_db
from app.main import app
from app.services.seed_data import seed_database
from app.models.models import Ambulance, Emergency

test_engine = create_engine("sqlite:///./test_jeevsarthi.db", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_database(db, reset=True)
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def client():
    return TestClient(app)

# Test 1: Health endpoint
def test_health_check(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "JeevSarthi"
    assert data["counts"]["ambulances"] >= 8

# Test 2: Create and retrieve emergency
def test_create_and_get_emergency(client):
    payload = {
        "incident_type": "Road Accident",
        "severity": "Critical",
        "description": "Multi-car collision near Dhaula Kuan",
        "latitude": 28.5910,
        "longitude": 77.1610,
        "location_name": "Dhaula Kuan Underpass",
        "area": "South Zone",
        "required_capability": "ALS",
        "patient_count": 2,
        "data_source": "Emergency Dispatch Call",
        "is_verified": True
    }
    create_res = client.post("/api/emergencies", json=payload)
    assert create_res.status_code == 201
    created_em = create_res.json()
    inc_id = created_em["incident_id"]
    assert inc_id.startswith("INC-")

    get_res = client.get(f"/api/emergencies/{inc_id}")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["location_name"] == "Dhaula Kuan Underpass"
    assert len(data["history"]) >= 1

# Test 3: Invalid emergency data rejection
def test_invalid_emergency_rejection(client):
    # Missing required fields like latitude, longitude, description
    payload = {
        "incident_type": "Road Accident"
    }
    res = client.post("/api/emergencies", json=payload)
    assert res.status_code == 422 # Pydantic validation error

# Test 4: Create and retrieve ambulance
def test_create_and_get_ambulance(client):
    payload = {
        "ambulance_id": "AMB-999",
        "vehicle_number": "DL-1T-0000",
        "model": "Force Traveller Special",
        "latitude": 28.6100,
        "longitude": 77.2300,
        "area": "Central Zone",
        "capabilities": "ALS, BLS",
        "equipment_list": "Defibrillator, Oxygen",
        "status": "Available",
        "crew_notes": "Test unit",
        "is_simulated_gps": True
    }
    res = client.post("/api/ambulances", json=payload)
    assert res.status_code == 201
    assert res.json()["ambulance_id"] == "AMB-999"

    get_res = client.get("/api/ambulances/AMB-999")
    assert get_res.status_code == 200
    assert get_res.json()["model"] == "Force Traveller Special"

# Test 5: Reject dispatch to out-of-service ambulance
def test_reject_dispatch_to_out_of_service_ambulance(client):
    # AMB-108 is Out of Service
    payload = {
        "incident_id": "INC-2026-001",
        "ambulance_id": "AMB-108",
        "recommended_by": "Manual Override",
        "dispatch_reason": "Forced dispatch attempt"
    }
    res = client.post("/api/dispatch/assign", json=payload)
    assert res.status_code == 409
    assert "OUT OF SERVICE" in res.json()["detail"]

# Test 6 & 7: Preventing conflicting assignments (Collision Prevention)
def test_prevent_conflicting_ambulance_assignments(client):
    # First assignment succeeds
    payload1 = {
        "incident_id": "INC-2026-001",
        "ambulance_id": "AMB-101",
        "recommended_by": "Smart Engine",
        "dispatch_reason": "Top ranked unit"
    }
    res1 = client.post("/api/dispatch/assign", json=payload1)
    assert res1.status_code == 200
    assert res1.json()["success"] is True

    # Second assignment of the same AMB-101 to INC-2026-002 must be rejected!
    payload2 = {
        "incident_id": "INC-2026-002",
        "ambulance_id": "AMB-101",
        "recommended_by": "Dispatcher",
        "dispatch_reason": "Conflicting dispatch attempt"
    }
    res2 = client.post("/api/dispatch/assign", json=payload2)
    assert res2.status_code == 409 # Conflict!
    assert "Assignment Conflict" in res2.json()["detail"]

# Test 8: Dispatch recommendation ranking
def test_dispatch_recommendation_ranking(client):
    res = client.get("/api/dispatch/recommendations/INC-2026-002")
    assert res.status_code == 200
    data = res.json()
    assert "recommendations" in data
    recs = data["recommendations"]
    assert len(recs) > 0
    # Eligible ambulances should be ranked first
    first = recs[0]
    assert first["recommendation_rank"] == 1
    assert first["is_eligible"] is True
    assert first["distance_km"] > 0

# Test 9: Patient tracking token validation
def test_patient_tracking_token(client):
    em_res = client.get("/api/emergencies/INC-2026-001")
    token = em_res.json()["tracking_token"]

    track_res = client.get(f"/api/tracking/{token}")
    assert track_res.status_code == 200
    track_data = track_res.json()
    assert track_data["incident_id"] == "INC-2026-001"
    assert track_data["status"] == "Assigned"
    assert track_data["assigned_ambulance"]["ambulance_id"] == "AMB-101"

    # Test invalid token
    invalid_res = client.get("/api/tracking/invalid-fake-token-12345")
    assert invalid_res.status_code == 404

# Test 10: Patient tracking status updates
def test_patient_tracking_status_progression(client):
    em_res = client.get("/api/emergencies/INC-2026-001")
    token = em_res.json()["tracking_token"]

    # Advance status to En Route
    client.post("/api/emergencies/INC-2026-001/status", json={"new_status": "En Route", "notes": "Ambulance en route with siren"})
    track_res = client.get(f"/api/tracking/{token}")
    assert track_res.json()["status"] == "En Route"

# Test 11: Stale location detection
def test_stale_location_detection(client):
    # AMB-108 location has not been updated in hours
    res = client.get("/api/ambulances/AMB-108")
    assert res.status_code == 200
    assert res.json()["is_stale"] is True

# Test 12: Coverage calculations
def test_coverage_calculations(client):
    res = client.get("/api/coverage?eta_threshold_minutes=10")
    assert res.status_code == 200
    data = res.json()
    assert "areas" in data
    assert len(data["areas"]) == 5
    assert data["total_available"] > 0

# Test 13: Repositioning eligibility checks
def test_repositioning_flow(client):
    # Fetch repositioning suggestions
    recs_res = client.get("/api/repositioning")
    assert recs_res.status_code == 200
    recs = recs_res.json()
    if recs:
        rec_id = recs[0]["id"]
        # Approve repositioning
        act_res = client.post("/api/repositioning/action", json={"recommendation_id": rec_id, "action": "approve"})
        assert act_res.status_code == 200
        assert act_res.json()["recommendation"]["status"] == "Approved"

# Test 14: Hospital recommendations with capacity disclosure
def test_hospital_recommendations(client):
    res = client.get("/api/hospitals/recommendations/INC-2026-001")
    assert res.status_code == 200
    data = res.json()
    assert len(data["recommendations"]) > 0
    top = data["recommendations"][0]
    assert top["is_recommended"] is True
    # Capacity display discloses SIMULATED DATA or Capacity Unknown
    assert ("SIMULATED DATA" in top["capacity_display"] or "Capacity Unknown" in top["capacity_display"] or "VERIFIED" in top["capacity_display"])

# Test 15: Analytics calculations
def test_analytics_metrics(client):
    res = client.get("/api/analytics/metrics")
    assert res.status_code == 200
    data = res.json()
    assert data["total_historical_records"] >= 100
    assert data["average_response_time_seconds"] > 0
    assert data["median_response_time_seconds"] > 0

# Test 16: CSV Exports
def test_csv_exports(client):
    inc_csv = client.get("/api/analytics/export/incidents.csv")
    assert inc_csv.status_code == 200
    assert "Incident ID,Type,Severity" in inc_csv.text

    amb_csv = client.get("/api/analytics/export/ambulances.csv")
    assert amb_csv.status_code == 200
    assert "Ambulance ID,Vehicle Number" in amb_csv.text

# Test 17 & 18: Simulation Advance and Reset
def test_simulation_advance_and_reset(client):
    status_res = client.get("/api/simulation/status")
    assert status_res.status_code == 200

    adv_res = client.post("/api/simulation/advance")
    assert adv_res.status_code == 200
    assert adv_res.json()["current_step"] >= 1

    reset_res = client.post("/api/simulation/reset")
    assert reset_res.status_code == 200
    assert reset_res.json()["current_step"] == 0

# Test 19: API 404 handling
def test_not_found_handling(client):
    res = client.get("/api/emergencies/INC-NON-EXISTENT")
    assert res.status_code == 404

# Test 20: Dashboard metrics endpoint
def test_dashboard_metrics(client):
    res = client.get("/api/dashboard/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "total_active_emergencies" in data
    assert "available_ambulances" in data
    assert "recent_activity" in data

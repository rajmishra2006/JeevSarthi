from datetime import datetime, timezone, timedelta
import random
from sqlalchemy.orm import Session
from app.models.models import Emergency, Ambulance, Hospital, HistoricalIncident, SimulationState, Assignment, IncidentHistory, RepositioningRecommendation, utc_now

# Standard Delhi NCR Coordinates for realistic hackathon demonstration
# Coordinates:
# AIIMS: 28.5672, 77.2100
# Connaught Place: 28.6304, 77.2177
# Rohini: 28.7041, 77.1025
# Mayur Vihar: 28.6080, 77.2950
# Dwarka: 28.5921, 77.0460
# Karol Bagh: 28.6517, 77.1906
# Saket: 28.5244, 77.2167

def seed_database(db: Session, reset: bool = False):
    """
    Deterministically seeds the database with demo ambulances, active emergencies,
    hospitals, and historical emergency records.
    """
    if reset:
        # Clear existing tables
        db.query(IncidentHistory).delete()
        db.query(Assignment).delete()
        db.query(RepositioningRecommendation).delete()
        db.query(Emergency).delete()
        db.query(Ambulance).delete()
        db.query(Hospital).delete()
        db.query(HistoricalIncident).delete()
        db.query(SimulationState).delete()
        db.commit()

    # Check if already seeded
    if db.query(Ambulance).count() > 0:
        return

    now = datetime.now(timezone.utc)

    # 1. Seed Ambulances
    ambulances_data = [
        {
            "ambulance_id": "AMB-101",
            "vehicle_number": "DL-1T-9821",
            "model": "Force Traveller ALS",
            "latitude": 28.6315,
            "longitude": 77.2160,
            "area": "Central Zone",
            "capabilities": "ALS, BLS",
            "equipment_list": "Defibrillator, Cardiac Monitor, Oxygen, Infusion Pump, Spine Board",
            "status": "Available",
            "crew_notes": "Crew ready on shift. Paramedic + EMT on board.",
            "last_location_update": now - timedelta(minutes=2),
            "is_simulated_gps": True
        },
        {
            "ambulance_id": "AMB-102",
            "vehicle_number": "DL-1T-4412",
            "model": "Tata Winger ICU Mobile",
            "latitude": 28.5680,
            "longitude": 77.2115,
            "area": "South Zone",
            "capabilities": "ICU, ALS, BLS",
            "equipment_list": "Transport Ventilator, Multi-parameter Monitor, Syringe Drivers, Defibrillator",
            "status": "Available",
            "crew_notes": "ICU Nurse and Critical Care Paramedic staffed.",
            "last_location_update": now - timedelta(minutes=4),
            "is_simulated_gps": True
        },
        {
            "ambulance_id": "AMB-103",
            "vehicle_number": "DL-1T-7105",
            "model": "Mahindra Bolero BLS",
            "latitude": 28.6340,
            "longitude": 77.2210,
            "area": "Central Zone",
            "capabilities": "BLS, Transport",
            "equipment_list": "Portable Oxygen, Stretcher, First Aid Trauma Kit, Automated External Defibrillator",
            "status": "Available",
            "crew_notes": "Stationed at CP Radial Hub.",
            "last_location_update": now - timedelta(minutes=5),
            "is_simulated_gps": True
        },
        {
            "ambulance_id": "AMB-104",
            "vehicle_number": "DL-1T-3390",
            "model": "Force Traveller ALS",
            "latitude": 28.7050,
            "longitude": 77.1030,
            "area": "North Zone",
            "capabilities": "ALS, BLS",
            "equipment_list": "Defibrillator, Oxygen, Emergency Airway Kit",
            "status": "Available",
            "crew_notes": "North Zone primary response vehicle.",
            "last_location_update": now - timedelta(minutes=3),
            "is_simulated_gps": True
        },
        {
            "ambulance_id": "AMB-105",
            "vehicle_number": "DL-1T-5520",
            "model": "Tata Winger Neonatal ICU",
            "latitude": 28.5250,
            "longitude": 77.2170,
            "area": "South Zone",
            "capabilities": "Neonatal, ICU, ALS",
            "equipment_list": "Infant Incubator, Neonatal Ventilator, Warmers, Resuscitation Bag",
            "status": "Available",
            "crew_notes": "Specialist Neonatal Transport Unit.",
            "last_location_update": now - timedelta(minutes=6),
            "is_simulated_gps": True
        },
        {
            "ambulance_id": "AMB-106",
            "vehicle_number": "DL-1T-8801",
            "model": "Mahindra Bolero BLS",
            "latitude": 28.6095,
            "longitude": 77.2965,
            "area": "East Zone",
            "capabilities": "BLS, Transport",
            "equipment_list": "Oxygen Cylinder, Collapsible Stretcher, Splints",
            "status": "Available",
            "crew_notes": "Patrolling East corridor.",
            "last_location_update": now - timedelta(minutes=1),
            "is_simulated_gps": True
        },
        {
            "ambulance_id": "AMB-107",
            "vehicle_number": "DL-1T-2199",
            "model": "Tata Winger ALS",
            "latitude": 28.5930,
            "longitude": 77.0475,
            "area": "West Zone",
            "capabilities": "ALS, BLS",
            "equipment_list": "Advanced Cardiac Life Support Kit, Defibrillator, Suction Unit",
            "status": "Available",
            "crew_notes": "West District headquarters.",
            "last_location_update": now - timedelta(minutes=7),
            "is_simulated_gps": True
        },
        {
            "ambulance_id": "AMB-108",
            "vehicle_number": "DL-1T-1104",
            "model": "Force Traveller BLS",
            "latitude": 28.6530,
            "longitude": 77.1920,
            "area": "Central Zone",
            "capabilities": "BLS",
            "equipment_list": "Oxygen, Stretcher",
            "status": "Out of Service",
            "crew_notes": "Scheduled 10,000 km brake inspection and transmission service.",
            "last_location_update": now - timedelta(hours=5),
            "is_simulated_gps": True
        }
    ]

    for amb in ambulances_data:
        db.add(Ambulance(**amb))
    db.commit()

    # 2. Seed Hospitals
    hospitals_data = [
        {
            "hospital_id": "HOSP-01",
            "name": "AIIMS Apex Trauma Centre",
            "address": "Ring Road, Raj Nagar, Safdarjung Enclave, New Delhi",
            "area": "South Zone",
            "latitude": 28.5672,
            "longitude": 77.2100,
            "capabilities": "Level 1 Trauma, 24/7 Neurosurgery, Cardiac ICU, Burn Unit",
            "supported_emergency_types": "Cardiac Arrest, Severe Trauma, Stroke, Burn, General Medical",
            "total_beds": 250,
            "available_icu_beds": 6,
            "available_general_beds": 18,
            "capacity_status": "Available",
            "is_capacity_simulated": True,
            "last_capacity_update": now - timedelta(minutes=10),
            "contact_phone": "+91 11 2659 3677"
        },
        {
            "hospital_id": "HOSP-02",
            "name": "Safdarjung Hospital Emergency Care",
            "address": "Ansari Nagar West, New Delhi",
            "area": "South Zone",
            "latitude": 28.5705,
            "longitude": 77.2065,
            "capabilities": "Burn Centre, Pediatric ER, Emergency Surgery, Dialysis",
            "supported_emergency_types": "Burn, Severe Trauma, Respiratory Distress, Pregnancy/Labor",
            "total_beds": 400,
            "available_icu_beds": 3,
            "available_general_beds": 12,
            "capacity_status": "Constrained",
            "is_capacity_simulated": True,
            "last_capacity_update": now - timedelta(minutes=15),
            "contact_phone": "+91 11 2616 5060"
        },
        {
            "hospital_id": "HOSP-03",
            "name": "Dr. Ram Manohar Lohia (RML) Hospital",
            "address": "Baba Kharak Singh Marg, Connaught Place, New Delhi",
            "area": "Central Zone",
            "latitude": 28.6253,
            "longitude": 77.2023,
            "capabilities": "Cardiology Center of Excellence, Emergency Toxicology, Stroke Unit",
            "supported_emergency_types": "Cardiac Arrest, Stroke, Road Accident, General Medical",
            "total_beds": 300,
            "available_icu_beds": 5,
            "available_general_beds": 25,
            "capacity_status": "Available",
            "is_capacity_simulated": True,
            "last_capacity_update": now - timedelta(minutes=8),
            "contact_phone": "+91 11 2336 5525"
        },
        {
            "hospital_id": "HOSP-04",
            "name": "Lok Nayak Hospital (LNJP)",
            "address": "Jawaharlal Nehru Marg, Delhi Gate, New Delhi",
            "area": "Central Zone",
            "latitude": 28.6385,
            "longitude": 77.2405,
            "capabilities": "Trauma Care, Infectious Disease, Pediatric Critical Care",
            "supported_emergency_types": "Severe Trauma, Pediatric, Respiratory Distress",
            "total_beds": 350,
            "available_icu_beds": 0,
            "available_general_beds": 4,
            "capacity_status": "Full",
            "is_capacity_simulated": True,
            "last_capacity_update": now - timedelta(minutes=20),
            "contact_phone": "+91 11 2323 3000"
        },
        {
            "hospital_id": "HOSP-05",
            "name": "Max Super Speciality Hospital Saket",
            "address": "1, 2, Press Enclave Marg, Saket, New Delhi",
            "area": "South Zone",
            "latitude": 28.5273,
            "longitude": 77.2132,
            "capabilities": "Comprehensive Heart & Vascular Institute, Neuro ICU, ECMO",
            "supported_emergency_types": "Cardiac Arrest, Stroke, Severe Trauma",
            "total_beds": 200,
            "available_icu_beds": 4,
            "available_general_beds": 15,
            "capacity_status": "Available",
            "is_capacity_simulated": True,
            "last_capacity_update": now - timedelta(minutes=12),
            "contact_phone": "+91 11 2651 5050"
        },
        {
            "hospital_id": "HOSP-06",
            "name": "Sanjay Gandhi Memorial Hospital",
            "address": "Mangolpuri, Rohini Sector 1, Delhi",
            "area": "North Zone",
            "latitude": 28.6948,
            "longitude": 77.0911,
            "capabilities": "Emergency Trauma, Orthopedics, General Medical",
            "supported_emergency_types": "Road Accident, General Medical, Pregnancy/Labor",
            "total_beds": 150,
            "available_icu_beds": 2,
            "available_general_beds": 9,
            "capacity_status": "Available",
            "is_capacity_simulated": True,
            "last_capacity_update": now - timedelta(minutes=25),
            "contact_phone": "+91 11 2790 0100"
        },
        {
            "hospital_id": "HOSP-07",
            "name": "Dharamshila Narayana Superspeciality",
            "address": "Vasundhara Enclave, Near New Ashok Nagar, Delhi",
            "area": "East Zone",
            "latitude": 28.6015,
            "longitude": 77.3195,
            "capabilities": "Oncology, Emergency Care, Critical Care",
            "supported_emergency_types": "Cardiac Arrest, Stroke, Respiratory Distress",
            "total_beds": 180,
            "available_icu_beds": 0,
            "available_general_beds": 0,
            "capacity_status": "Capacity Unknown",
            "is_capacity_simulated": False,
            "last_capacity_update": now - timedelta(hours=2),
            "contact_phone": "+91 11 4306 6666"
        }
    ]

    for hosp in hospitals_data:
        db.add(Hospital(**hosp))
    db.commit()

    # 3. Seed Initial Active Emergencies
    emergencies_data = [
        {
            "incident_id": "INC-2026-001",
            "incident_type": "Cardiac Arrest",
            "severity": "Critical",
            "description": "58-year-old male collapsed near CP Inner Circle Block B. Bystander CPR initiated. Requires ALS/Defibrillator immediately.",
            "latitude": 28.6328,
            "longitude": 77.2195,
            "location_name": "Connaught Place Block B Inner Circle",
            "area": "Central Zone",
            "reported_at": now - timedelta(minutes=4),
            "status": "Verified",
            "required_capability": "ALS",
            "patient_count": 1,
            "data_source": "Emergency Dispatch Call",
            "is_verified": True
        },
        {
            "incident_id": "INC-2026-002",
            "incident_type": "Road Accident",
            "severity": "High",
            "description": "Collision between two-wheeler and delivery truck near Ring Road AIIMS flyover. 1 rider with compound leg fracture.",
            "latitude": 28.5695,
            "longitude": 77.2140,
            "location_name": "AIIMS Flyover South Ring Road",
            "area": "South Zone",
            "reported_at": now - timedelta(minutes=9),
            "status": "Reported",
            "required_capability": "BLS",
            "patient_count": 1,
            "data_source": "IoT Sensor Alert",
            "is_verified": True
        },
        {
            "incident_id": "INC-2026-003",
            "incident_type": "Severe Trauma",
            "severity": "Critical",
            "description": "Industrial scaffolding collapse at construction site in Rohini Sector 16. Multiple blunt trauma injuries.",
            "latitude": 28.7110,
            "longitude": 77.1120,
            "location_name": "Sector 16 Rohini Industrial Area",
            "area": "North Zone",
            "reported_at": now - timedelta(minutes=14),
            "status": "Verified",
            "required_capability": "ICU",
            "patient_count": 2,
            "data_source": "Emergency Dispatch Call",
            "is_verified": True
        }
    ]

    for em in emergencies_data:
        e = Emergency(**em)
        db.add(e)
        db.flush()
        # Add initial history
        db.add(IncidentHistory(
            incident_id=e.incident_id,
            previous_status="Created",
            new_status=e.status,
            changed_at=e.reported_at,
            notes="Initial call logged and geocoded.",
            changed_by="Dispatch Intake System"
        ))
    db.commit()

    # 4. Seed Historical Incidents (120 records spanning 30 days)
    random.seed(42) # Deterministic seed
    zones_coords = {
        "North Zone": (28.7041, 77.1025),
        "South Zone": (28.5672, 77.2100),
        "Central Zone": (28.6304, 77.2177),
        "East Zone": (28.6080, 77.2950),
        "West Zone": (28.5921, 77.0460)
    }

    emergency_types = ["Cardiac Arrest", "Road Accident", "Severe Trauma", "Respiratory Distress", "Pregnancy/Labor", "Stroke", "General Medical"]
    severities = ["Critical", "High", "Normal"]

    historical_records = []
    for i in range(1, 121):
        zone_choice = random.choices(list(zones_coords.keys()), weights=[25, 30, 25, 10, 10])[0]
        base_lat, base_lng = zones_coords[zone_choice]
        # Jitter slightly around zone center
        lat = round(base_lat + random.uniform(-0.025, 0.025), 4)
        lng = round(base_lng + random.uniform(-0.025, 0.025), 4)

        days_ago = random.randint(1, 29)
        # Peak emergency hours: 8-11 AM and 5-9 PM
        hour_weights = [1, 1, 1, 1, 1, 2, 4, 7, 9, 8, 7, 6, 5, 5, 5, 6, 8, 10, 11, 9, 7, 5, 3, 2]
        hour = random.choices(range(24), weights=hour_weights)[0]
        minute = random.randint(0, 59)
        occ_time = now - timedelta(days=days_ago, hours=now.hour - hour, minutes=now.minute - minute)

        sev = random.choices(severities, weights=[30, 45, 25])[0]
        e_type = random.choices(emergency_types, weights=[25, 30, 15, 12, 6, 8, 4])[0]
        
        # Response time between 360 seconds (6 min) and 900 seconds (15 min)
        resp_sec = random.randint(380, 880)
        res_time = occ_time + timedelta(seconds=resp_sec + random.randint(1200, 2400))

        hist = HistoricalIncident(
            incident_id=f"HIST-2026-{1000 + i}",
            incident_type=e_type,
            severity=sev,
            area=zone_choice,
            latitude=lat,
            longitude=lng,
            occurred_at=occ_time,
            response_time_seconds=resp_sec,
            resolved_at=res_time,
            is_simulated=True
        )
        historical_records.append(hist)

    db.bulk_save_objects(historical_records)
    db.commit()

    # 5. Seed Simulation State
    sim = SimulationState(
        scenario_name="Standard 16-Step Hackathon Demonstration",
        current_step=0,
        total_steps=16,
        is_active=False,
        status_message="Demo ready. Click 'Run Demo Scenario' or advance step-by-step."
    )
    db.add(sim)
    db.commit()

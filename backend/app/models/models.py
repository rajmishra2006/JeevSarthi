from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Index
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Emergency(Base):
    __tablename__ = "emergencies"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(50), unique=True, index=True, nullable=False)
    incident_type = Column(String(100), nullable=False)
    severity = Column(String(20), nullable=False) # Critical, High, Normal
    description = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_name = Column(String(200), nullable=False)
    area = Column(String(100), nullable=False, index=True) # North Zone, South Zone, Central Zone, East Zone, West Zone
    reported_at = Column(DateTime, default=utc_now, nullable=False)
    status = Column(String(30), default="Reported", index=True, nullable=False) # Reported, Verified, Assigned, En Route, Arrived, Resolved
    required_capability = Column(String(50), default="BLS", nullable=False) # BLS, ALS, ICU, Transport, Neonatal
    patient_count = Column(Integer, default=1, nullable=False)
    assigned_ambulance_id = Column(String(50), nullable=True)
    tracking_token = Column(String(64), unique=True, index=True, nullable=False, default=lambda: uuid.uuid4().hex)
    data_source = Column(String(100), default="Emergency Dispatch Call", nullable=False) # Dispatch Call, IoT Sensor, Simulated Data
    is_verified = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

class Ambulance(Base):
    __tablename__ = "ambulances"

    id = Column(Integer, primary_key=True, index=True)
    ambulance_id = Column(String(50), unique=True, index=True, nullable=False)
    vehicle_number = Column(String(50), nullable=False)
    model = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    area = Column(String(100), nullable=False, index=True)
    capabilities = Column(String(200), nullable=False) # Comma-separated: BLS, ALS, ICU, Neonatal, Transport
    equipment_list = Column(String(300), default="Oxygen Cylinder, Basic First Aid", nullable=False)
    status = Column(String(30), default="Available", index=True, nullable=False) # Available, Assigned, En Route, Busy, Out of Service
    current_incident_id = Column(String(50), nullable=True)
    last_location_update = Column(DateTime, default=utc_now, nullable=False)
    last_status_update = Column(DateTime, default=utc_now, nullable=False)
    crew_notes = Column(Text, default="", nullable=True)
    is_simulated_gps = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    address = Column(String(300), nullable=False)
    area = Column(String(100), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capabilities = Column(String(300), nullable=False)
    supported_emergency_types = Column(String(300), nullable=False)
    total_beds = Column(Integer, default=100, nullable=False)
    available_icu_beds = Column(Integer, default=5, nullable=False)
    available_general_beds = Column(Integer, default=20, nullable=False)
    capacity_status = Column(String(30), default="Available", nullable=False) # Available, Constrained, Full, Capacity Unknown
    is_capacity_simulated = Column(Boolean, default=True, nullable=False)
    last_capacity_update = Column(DateTime, default=utc_now, nullable=False)
    contact_phone = Column(String(50), default="+91 11 2345 6789", nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(50), index=True, nullable=False)
    ambulance_id = Column(String(50), index=True, nullable=False)
    assigned_at = Column(DateTime, default=utc_now, nullable=False)
    en_route_at = Column(DateTime, nullable=True)
    arrived_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    status = Column(String(30), default="Active", nullable=False) # Active, Completed, Cancelled
    recommended_by = Column(String(50), default="Smart Engine", nullable=False)
    dispatch_reason = Column(Text, default="", nullable=False)

class IncidentHistory(Base):
    __tablename__ = "incident_history"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(50), index=True, nullable=False)
    previous_status = Column(String(30), nullable=False)
    new_status = Column(String(30), nullable=False)
    changed_at = Column(DateTime, default=utc_now, nullable=False)
    notes = Column(Text, default="", nullable=False)
    changed_by = Column(String(100), default="System", nullable=False)

class AmbulanceLocationHistory(Base):
    __tablename__ = "ambulance_location_history"

    id = Column(Integer, primary_key=True, index=True)
    ambulance_id = Column(String(50), index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=utc_now, nullable=False)
    speed_kmh = Column(Float, default=0.0, nullable=False)
    source = Column(String(50), default="Simulated GPS", nullable=False)

class RepositioningRecommendation(Base):
    __tablename__ = "repositioning_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    ambulance_id = Column(String(50), index=True, nullable=False)
    origin_area = Column(String(100), nullable=False)
    target_area = Column(String(100), nullable=False)
    target_lat = Column(Float, nullable=False)
    target_lng = Column(Float, nullable=False)
    reason = Column(Text, nullable=False)
    priority = Column(String(20), default="Medium", nullable=False) # High, Medium, Low
    status = Column(String(40), default="Suggested", index=True, nullable=False) # Suggested, Approved, En Route to Standby, Arrived at Standby, Cancelled, Rejected
    distance_km = Column(Float, default=0.0, nullable=False)
    estimated_time_min = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

class HistoricalIncident(Base):
    __tablename__ = "historical_incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(50), unique=True, index=True, nullable=False)
    incident_type = Column(String(100), nullable=False)
    severity = Column(String(20), nullable=False)
    area = Column(String(100), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    occurred_at = Column(DateTime, nullable=False)
    response_time_seconds = Column(Integer, nullable=False) # response time in seconds
    resolved_at = Column(DateTime, nullable=False)
    is_simulated = Column(Boolean, default=True, nullable=False)

class SimulationState(Base):
    __tablename__ = "simulation_state"

    id = Column(Integer, primary_key=True, index=True)
    scenario_name = Column(String(100), default="Standard 16-Step Hackathon Scenario", nullable=False)
    current_step = Column(Integer, default=0, nullable=False)
    total_steps = Column(Integer, default=16, nullable=False)
    is_active = Column(Boolean, default=False, nullable=False)
    status_message = Column(Text, default="Simulation reset to initial state.", nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

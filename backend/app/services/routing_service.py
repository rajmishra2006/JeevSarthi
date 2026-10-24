import math
import httpx
from typing import Tuple, List, Dict, Any, Optional

# In-memory routing cache: key -> {distance_km, duration_min, geometry, provider}
_ROUTE_CACHE: Dict[str, Dict[str, Any]] = {}

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points on Earth in kilometers."""
    R = 6371.0 # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

async def calculate_route(
    start_lat: float,
    start_lon: float,
    end_lat: float,
    end_lon: float,
    osrm_base_url: str = "https://router.project-osrm.org"
) -> Dict[str, Any]:
    """
    Attempts to fetch real road route from OSRM.
    If external service is unavailable, network times out, or fails,
    provides a transparently labeled straight-line fallback.
    """
    cache_key = f"{round(start_lat, 4)},{round(start_lon, 4)}->{round(end_lat, 4)},{round(end_lon, 4)}"
    if cache_key in _ROUTE_CACHE:
        return _ROUTE_CACHE[cache_key]

    url = f"{osrm_base_url}/route/v1/driving/{start_lon},{start_lat};{end_lon},{end_lat}?overview=full&geometries=geojson"
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("code") == "Ok" and data.get("routes"):
                    primary_route = data["routes"][0]
                    distance_km = round(primary_route["distance"] / 1000.0, 2)
                    duration_min = round(primary_route["duration"] / 60.0, 1)
                    # OSRM coordinates are [lon, lat], Leaflet wants [lat, lon]
                    coordinates = [[pt[1], pt[0]] for pt in primary_route["geometry"]["coordinates"]]

                    result = {
                        "distance_km": distance_km,
                        "estimated_time_min": max(1.0, duration_min),
                        "geometry": coordinates,
                        "provider": "OSRM Road Routing",
                        "is_fallback": False,
                        "note": "Estimated road travel time based on road network speed limits. Not live-traffic certified."
                    }
                    _ROUTE_CACHE[cache_key] = result
                    return result
    except Exception:
        pass

    # Graceful Fallback using Haversine
    dist_km = haversine_distance(start_lat, start_lon, end_lat, end_lon)
    # Estimate time assuming 35 km/h urban average speed + 1.5 min dispatch readiness
    est_time_min = round((dist_km / 35.0) * 60.0 + 1.5, 1)
    
    # Generate interpolated straight line points between start and end
    num_pts = 10
    interp_geom = [
        [
            round(start_lat + (end_lat - start_lat) * (i / num_pts), 5),
            round(start_lon + (end_lon - start_lon) * (i / num_pts), 5)
        ]
        for i in range(num_pts + 1)
    ]

    result = {
        "distance_km": dist_km,
        "estimated_time_min": max(1.0, est_time_min),
        "geometry": interp_geom,
        "provider": "Straight-Line Fallback (Haversine)",
        "is_fallback": True,
        "note": "External routing service unreachable. Distance is straight-line aerial estimate at 35 km/h average."
    }
    _ROUTE_CACHE[cache_key] = result
    return result

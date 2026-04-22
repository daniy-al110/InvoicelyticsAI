"""
Real-time Quota Status API
Lightweight endpoint for live profile dashboard polling.
Uses in-memory caching to avoid heavy DB aggregation per request.
"""

import time
import os
from datetime import datetime
from collections import deque
from fastapi import APIRouter, Depends
from ..core.database import db
from ..services.auth_service import get_current_user

router = APIRouter(tags=["Quota & Health"])

# ─── In-Memory Health Monitor ────────────────────────────────────────────
class HealthMonitor:
    """Tracks API health based on recent request outcomes."""
    
    def __init__(self, window_size=50):
        self._response_times = deque(maxlen=window_size)
        self._errors = deque(maxlen=window_size)
        self._last_check = time.time()
    
    def record_success(self, duration_ms: float):
        self._response_times.append(duration_ms)
        self._errors.append(False)
        self._last_check = time.time()
    
    def record_error(self):
        self._errors.append(True)
        self._last_check = time.time()
    
    def get_status(self) -> str:
        if not self._errors:
            return "healthy"
        
        recent = list(self._errors)[-20:]  # Last 20 requests
        error_rate = sum(1 for e in recent if e) / max(len(recent), 1)
        
        if error_rate > 0.5:
            return "down"
        
        # Check avg response time
        if self._response_times:
            avg_ms = sum(self._response_times) / len(self._response_times)
            if avg_ms > 1000 or error_rate > 0.15:
                return "degraded"
        
        return "healthy"

health_monitor = HealthMonitor()


# ─── Quota Cache ─────────────────────────────────────────────────────────
class QuotaCache:
    """Simple TTL cache for quota data to keep response times < 200ms."""
    
    def __init__(self, ttl_seconds=30):
        self._cache = {}
        self._ttl = ttl_seconds
    
    def get(self, user_id: str):
        entry = self._cache.get(user_id)
        if entry and (time.time() - entry["ts"]) < self._ttl:
            return entry["data"]
        return None
    
    def set(self, user_id: str, data: dict):
        self._cache[user_id] = {"data": data, "ts": time.time()}

quota_cache = QuotaCache(ttl_seconds=30)


# ─── Active Model Detection ─────────────────────────────────────────────
def get_active_model() -> str:
    """Detect the active Gemini model from the AI module configuration."""
    return os.environ.get("GEMINI_MODEL", "gemini-flash-latest")


# ─── Main Endpoint ──────────────────────────────────────────────────────
@router.get("/user/quota-status")
async def get_quota_status(current_user: dict = Depends(get_current_user)):
    start_time = time.time()
    user_id = current_user["id"]
    
    try:
        # Check cache first for sub-200ms responses
        cached = quota_cache.get(user_id)
        if cached:
            cached["status"] = health_monitor.get_status()
            duration_ms = (time.time() - start_time) * 1000
            health_monitor.record_success(duration_ms)
            return cached
        
        # Lightweight aggregation — only counts, no full document scans
        quota_used = await db.documents.count_documents({"user_id": user_id})
        
        # Quota limit: configurable per user, default 1500
        user_record = await db.users.find_one(
            {"id": user_id}, 
            {"quota_limit": 1}
        )
        quota_limit = (user_record or {}).get("quota_limit", 1500)
        
        # Calculate percentage
        percentage = min(100, round((quota_used / max(quota_limit, 1)) * 100))
        
        # Estimated time saved: ~15 minutes per document processed
        total_minutes = quota_used * 15
        if total_minutes >= 60:
            hours = total_minutes / 60
            estimated_time_saved = f"{hours:.1f} hours"
        else:
            estimated_time_saved = f"{total_minutes} minutes"
        
        # Build response
        response = {
            "quota_used": quota_used,
            "quota_limit": quota_limit,
            "percentage": percentage,
            "estimated_time_saved": estimated_time_saved,
            "active_model": get_active_model(),
            "status": health_monitor.get_status()
        }
        
        # Cache the result
        quota_cache.set(user_id, response)
        
        duration_ms = (time.time() - start_time) * 1000
        health_monitor.record_success(duration_ms)
        
        return response
        
    except Exception as e:
        health_monitor.record_error()
        
        # Return last known state if available, with degraded status
        cached = quota_cache.get(user_id)
        if cached:
            cached["status"] = "degraded"
            return cached
        
        # Absolute fallback — never crash
        return {
            "quota_used": 0,
            "quota_limit": 1500,
            "percentage": 0,
            "estimated_time_saved": "0 minutes",
            "active_model": get_active_model(),
            "status": "down"
        }

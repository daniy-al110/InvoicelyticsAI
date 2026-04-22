import asyncio
import json
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
import pandas as pd

# Mocking the database and AI before importing the app
with patch('motor.motor_asyncio.AsyncIOMotorClient') as mock_client:
    from server import app, get_current_user

from fastapi.testclient import TestClient

client = TestClient(app)

# Mock user
mock_user = {"id": "test_user_123", "email": "test@example.com"}

def override_get_current_user():
    return mock_user

app.dependency_overrides[get_current_user] = override_get_current_user

async def run_test():
    print("Testing /api/reports/monthly...")
    
    # Mock documents
    mock_docs = [
        {
            "user_id": "test_user_123",
            "structured_data": {"total_amount": {"value": 1000}, "date": {"value": "2026-03-01"}},
            "created_at": datetime(2026, 3, 1, tzinfo=timezone.utc)
        },
        {
            "user_id": "test_user_123",
            "structured_data": {"total_amount": {"value": 1500}, "date": {"value": "2026-03-15"}},
            "created_at": datetime(2026, 3, 15, tzinfo=timezone.utc)
        },
        {
            "user_id": "test_user_123",
            "structured_data": {"total_amount": {"value": 500}, "date": {"value": "2026-02-10"}},
            "created_at": datetime(2026, 2, 10, tzinfo=timezone.utc)
        }
    ]

    with patch('server.db.documents.find') as mock_find:
        # Configure mock find
        mock_cursor = MagicMock()
        mock_cursor.to_list = MagicMock(return_value=asyncio.Future())
        mock_cursor.to_list.return_value.set_result(mock_docs)
        mock_find.return_value = mock_cursor

        with patch('server.generate_monthly_summary') as mock_ai:
            mock_ai.return_value = asyncio.Future()
            mock_ai.return_value.set_result("AI summary for the month.")

            response = client.get("/api/reports/monthly")
            
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print("Response JSON:")
                print(json.dumps(data, indent=2))
                
                # Assertions
                assert len(data) == 2  # Feb and March
                assert data[0]['month'] == "February 2026"
                assert data[0]['total_spending'] == 500
                assert data[1]['month'] == "March 2026"
                assert data[1]['total_spending'] == 2500
                assert data[1]['invoice_count'] == 2
                assert data[1]['average_value'] == 1250
                print("\nAll assertions passed!")
            else:
                print(f"FAILED: {response.text}")

if __name__ == "__main__":
    asyncio.run(run_test())

#!/usr/bin/env python3

import requests
import sys
import json
import os
from datetime import datetime
from pathlib import Path
import tempfile
from PIL import Image, ImageDraw, ImageFont

class DocumentAnalyzerTester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.document_id = None
        self.token = None

    def authenticate(self, email="test@example.com", password="testpassword"):
        """Login and store JWT token for all subsequent requests"""
        import requests as req
        resp = req.post(f"{self.base_url}/api/auth/login", json={"email": email, "password": password})
        if resp.status_code == 200:
            self.token = resp.json().get("access_token")
            print(f"✅ Authenticated as {email}")
            return True
        print(f"❌ Authentication failed: {resp.text}")
        return False

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        if data and not files:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files)
                else:
                    response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response keys: {list(response_data.keys()) if isinstance(response_data, dict) else 'Non-dict response'}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def create_test_invoice_image(self):
        """Create a test invoice image with text for OCR testing"""
        # Create a simple invoice image
        img = Image.new('RGB', (800, 600), color='white')
        draw = ImageDraw.Draw(img)
        
        # Try to use a basic font, fallback to default if not available
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
            small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
        except:
            font = ImageFont.load_default()
            small_font = ImageFont.load_default()
        
        # Draw invoice content
        draw.text((50, 50), "INVOICE", fill='black', font=font)
        draw.text((50, 100), "Invoice Number: INV-2024-001", fill='black', font=small_font)
        draw.text((50, 130), "Date: 2024-01-15", fill='black', font=small_font)
        draw.text((50, 160), "Vendor: Test Company Inc.", fill='black', font=small_font)
        draw.text((50, 190), "Customer: John Doe", fill='black', font=small_font)
        draw.text((50, 250), "Description: Software License", fill='black', font=small_font)
        draw.text((50, 280), "Amount: $299.99", fill='black', font=small_font)
        draw.text((50, 350), "Total Amount: $299.99", fill='black', font=font)
        
        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
        img.save(temp_file.name, 'PNG')
        return temp_file.name

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "api/",
            200
        )
        return success

    def test_document_upload(self):
        """Test document upload with OCR processing"""
        # Create test image
        test_image_path = self.create_test_invoice_image()
        
        try:
            with open(test_image_path, 'rb') as f:
                files = {'file': ('test_invoice.png', f, 'image/png')}
                success, response = self.run_test(
                    "Document Upload (PNG)",
                    "POST",
                    "api/upload",
                    200,
                    files=files
                )
            
            if success and 'id' in response:
                self.document_id = response['id']
                print(f"   Document ID: {self.document_id}")
                return True
            return False
        finally:
            # Clean up temp file
            os.unlink(test_image_path)

    def test_data_extraction(self):
        """Test structured data extraction"""
        if not self.document_id:
            print("❌ Skipping data extraction - no document uploaded")
            return False
        
        success, response = self.run_test(
            "Data Extraction",
            "POST",
            f"api/extract?document_id={self.document_id}",
            200
        )
        
        if success and 'structured_data' in response:
            structured_data = response['structured_data']
            print(f"   Extracted fields: {list(structured_data.keys())}")
            
            # Check for expected fields
            expected_fields = ['invoice_number', 'date', 'total_amount', 'vendor_name', 'customer_name']
            found_fields = [field for field in expected_fields if field in structured_data]
            print(f"   Found expected fields: {found_fields}")
            return True
        return False

    def test_chat_functionality(self):
        """Test chat with document"""
        if not self.document_id:
            print("❌ Skipping chat test - no document uploaded")
            return False
        
        # Test first chat message
        success, response = self.run_test(
            "Chat - First Message",
            "POST",
            "api/chat",
            200,
            data={
                "document_id": self.document_id,
                "question": "What is the invoice number?"
            }
        )
        
        if not success:
            return False
        
        print(f"   Answer: {response.get('answer', 'No answer')[:100]}...")
        
        # Test second chat message (memory test)
        success2, response2 = self.run_test(
            "Chat - Second Message (Memory Test)",
            "POST",
            "api/chat",
            200,
            data={
                "document_id": self.document_id,
                "question": "What about the total amount?"
            }
        )
        
        return success and success2

    def test_document_listing(self):
        """Test document listing endpoint"""
        success, response = self.run_test(
            "List Documents",
            "GET",
            "api/documents",
            200
        )
        
        if success and 'documents' in response:
            print(f"   Found {len(response['documents'])} documents")
            return True
        return False

    def test_document_retrieval(self):
        """Test retrieving specific document"""
        if not self.document_id:
            print("❌ Skipping document retrieval - no document uploaded")
            return False
        
        success, response = self.run_test(
            "Get Document by ID",
            "GET",
            f"api/documents/{self.document_id}",
            200
        )
        
        if success and 'document' in response:
            document = response['document']
            chat_history = response.get('chat_history', [])
            print(f"   Document filename: {document.get('filename')}")
            print(f"   Chat history length: {len(chat_history)}")
            return True
        return False

def main():
    print("🚀 Starting Smart Document Analyzer API Tests")
    print("=" * 60)
    
    tester = DocumentAnalyzerTester()
    
    # Authenticate first — without this, all protected routes return 401
    if not tester.authenticate():
        print("⚠️  Authentication failed. Tests requiring auth will fail. Create a test user first.")
    
    # Run all tests
    tests = [
        tester.test_root_endpoint,
        tester.test_document_upload,
        tester.test_data_extraction,
        tester.test_chat_functionality,
        tester.test_document_listing,
        tester.test_document_retrieval,
    ]
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
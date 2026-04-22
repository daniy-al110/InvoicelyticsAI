import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from ai.chatbot import chat_with_document

async def test_modes():
    sample_text = """
    INVOICE #INV-2024-001
    Client: TechCorp Solutions
    Date: April 15, 2024
    
    Line Items:
    1. Cloud Infrastructure Services - $1,200.00
    2. Managed Security Layer - $450.00
    3. Priority Support - $150.00
    
    Subtotal: $1,800.00
    Tax (10%): $180.00
    Total Amount Due: $1,980.00
    
    Payment Instructions: Wire transfer to Account XXXXX-1234.
    """
    
    question = "Can you summarize this invoice?"
    
    print("--- TESTING TECHNICAL MODE ---")
    async for chunk in chat_with_document(question, sample_text, explanation_mode="Technical"):
        print(chunk, end="", flush=True)
    print("\n")
    
    print("--- TESTING BUSINESS/EXECUTIVE MODE ---")
    async for chunk in chat_with_document(question, sample_text, explanation_mode="Business"):
        print(chunk, end="", flush=True)
    print("\n")

if __name__ == "__main__":
    asyncio.run(test_modes())

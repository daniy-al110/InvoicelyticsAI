from passlib.context import CryptContext
import bcrypt

try:
    print(f"Bcrypt version: {bcrypt.__version__}")
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed = pwd_context.hash("password123")
    print(f"Hashed: {hashed}")
    verified = pwd_context.verify("password123", hashed)
    print(f"Verified: {verified}")
except Exception as e:
    print(f"Error occurred: {type(e).__name__}: {e}")

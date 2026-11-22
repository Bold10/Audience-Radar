# helper (not a test): print a one-time Clerk sign-in ticket for an email (secret never printed)
import os, sys, requests
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
H = {"Authorization": f"Bearer {os.environ['CLERK_SECRET_KEY']}", "User-Agent": "audience-radar-tests"}
uid = requests.get("https://api.clerk.com/v1/users", params={"email_address": sys.argv[1]}, headers=H, timeout=15).json()[0]["id"]
t = requests.post("https://api.clerk.com/v1/sign_in_tokens", json={"user_id": uid, "expires_in_seconds": 900}, headers=H, timeout=15)
print(t.json()["token"])

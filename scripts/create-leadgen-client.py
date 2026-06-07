#!/usr/bin/env python3
"""Create a LeadGen client record for hello@saabai.ai in Upstash Redis."""
import json, os, urllib.request

UPSTASH_URL = os.environ.get("UPSTASH_REDIS_REST_URL")
UPSTASH_TOKEN = os.environ.get("UPSTASH_REDIS_REST_TOKEN")

if not UPSTASH_URL or not UPSTASH_TOKEN:
    # Try to get from .env.local
    with open("/Users/aiworkspace/Desktop/AI-Workspace/saabai-site/.env.local") as f:
        for line in f:
            line = line.strip()
            if "=" in line:
                k, v = line.split("=", 1)
                os.environ[k] = v
    UPSTASH_URL = os.environ.get("UPSTASH_REDIS_REST_URL")
    UPSTASH_TOKEN = os.environ.get("UPSTASH_REDIS_REST_TOKEN")

if not UPSTASH_URL or not UPSTASH_TOKEN:
    print("ERROR: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN required")
    exit(1)

def redis_cmd(*args):
    data = json.dumps(args).encode()
    req = urllib.request.Request(
        f"{UPSTASH_URL}/hset/leadgen:clients",
        data=data,
        headers={"Authorization": f"Bearer {UPSTASH_TOKEN}", "Content-Type": "application/json"},
    )
    resp = urllib.request.urlopen(req)
    return resp.read().decode()

client_id = "client_demo_saabai"
now = int(__import__("time").time() * 1000)

client = {
    "id": client_id,
    "slug": "hello-saabai-demo",
    "businessName": "Saabai Demo",
    "niche": "AI Automation Services",
    "description": "AI-powered business automation solutions.",
    "phone": "+61400000000",
    "email": "hello@saabai.ai",
    "serviceArea": "Australia wide",
    "businessHours": "Mon-Fri 9am-5pm AEST",
    "branding": {
        "primaryColor": "#62C5D1",
        "accentColor": "#C9A84C",
        "widgetTitle": "Jack - AI Assistant",
        "greeting": "G'day! How can I help you today?"
    },
    "status": "active",
    "subscription": {
        "tier": "enterprise",
        "status": "active"
    },
    "createdAt": now,
    "updatedAt": now
}

result = redis_cmd(client_id, json.dumps(client, separators=(",", ":")))
print(f"Result: {result}")
print(f"Client created: {client_id} / hello-saabai-demo for hello@saabai.ai")

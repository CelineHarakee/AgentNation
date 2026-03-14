import urllib.request
import json
url = "http://localhost:8000/usecase1/run"
data = {"policy_title": "new input", "policy_description": "averylong "*1000, "sector": "healthcare", "time_horizon": "medium", "constraints": {"budget_limit": 0.25, "workforce_capacity": 0.08}}
req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
try:
    resp = urllib.request.urlopen(req)
    print("Code:", resp.getcode())
    print("Body:", resp.read().decode('utf-8')[:100])
except Exception as e:
    print("Error:", e)

import json, sys
token = sys.argv[1]
path = "/home/daytona/.winclaw/winclaw.json"
with open(path, "r") as f:
    c = json.load(f)
c["grc"]["auth"]["token"] = token
with open(path, "w") as f:
    json.dump(c, f, indent=2)
print("Token updated successfully")

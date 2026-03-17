import json

with open("C:/work/grc/daytona-swagger.json") as f:
    d = json.load(f)

upload = d["paths"].get("/files/upload", {})
print(json.dumps(upload, indent=2))

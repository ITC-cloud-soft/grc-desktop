import json

with open("C:/work/grc/daytona-swagger.json") as f:
    d = json.load(f)

paths = d.get("paths", {})
for path, methods in paths.items():
    if "file" in path.lower() or "upload" in path.lower():
        for method, details in methods.items():
            print(f"{method.upper()} {path}")
            params = details.get("parameters", [])
            for p in params:
                print(f"  param: {p.get('name','')} in:{p.get('in','')} required:{p.get('required','')}")
            rb = details.get("requestBody", {})
            if rb:
                print(f"  requestBody: {json.dumps(rb)[:500]}")
            print()

#!/bin/bash
# Update JWT tokens on all 3 Daytona sandbox nodes
# Usage: pass TOKEN_1, TOKEN_2, TOKEN_3 as arguments

TOKEN_1="$1"
TOKEN_2="$2"
TOKEN_3="$3"

echo "Updating node-1 token..."
python3 -c "
import json
with open('/home/daytona/.winclaw/winclaw.json','r') as f: c=json.load(f)
c['grc']['auth']['token']='$TOKEN_1'
with open('/home/daytona/.winclaw/winclaw.json','w') as f: json.dump(c,f,indent=2)
print('Done')
"

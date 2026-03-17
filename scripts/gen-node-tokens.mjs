import fs from "fs";
import jwt from "jsonwebtoken";

const keys = JSON.parse(fs.readFileSync(".dev-jwt-keys.json", "utf8"));

const nodes = [
  { nodeId: "524a5c2de7da42fd13dc39b869aa344f1ce8c546be02e39e04c4f6193d3c8e4c", name: "node-1" },
  { nodeId: "c714cff9fb1ba95e171d91c07f09583e730e548208b512c4220bc08a860dcb20", name: "node-2" },
  { nodeId: "6e5dbb95f357793060f18052914d2d1c67297fca1a7e1758d369a9661a1ed0a", name: "node-3" },
];

for (const n of nodes) {
  const token = jwt.sign(
    { sub: n.nodeId, node_id: n.nodeId, tier: "free", role: "user", scopes: ["read"] },
    keys.privateKey,
    { algorithm: "RS256", issuer: "grc.myaiportal.net", expiresIn: "30d" }
  );
  console.log(`${n.name}: ${token.substring(0, 60)}...`);
  console.log(`TOKEN_${n.name.replace("-", "_").toUpperCase()}=${token}`);
  console.log();
}

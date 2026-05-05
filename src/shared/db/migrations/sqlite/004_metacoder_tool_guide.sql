-- 004_metacoder_tool_guide.sql (SQLite version)
-- Append MetaCoder tool guidance to dev-related role templates.
-- Mirror of 034_metacoder_tool_guide.sql for the SQLite (GRC Desktop) backend.

UPDATE role_templates
SET tools_md = tools_md || '

## 🧠 MetaCoder Tool (Heavy Development)

**Tool name**: `metacoder`

**WHEN TO USE**:
- Building NEW projects from requirements (game mods, web apps, SaaS)
- MIGRATING legacy code (COBOL, VB, AS-400, mainframes → modern web)
- Comprehensive system testing with auto bug-fixing (95% pass rate target)
- Working with LARGE codebases (>10K LoC) where semantic graph navigation matters

**WHEN NOT TO USE**:
- Simple code edits (use Edit tool directly)
- Small scripts or prototypes (overkill, slow)
- Tasks requiring less than ~30 minutes of work

**MODES**:

| mode | Required params | Use case |
|------|----------------|----------|
| `newproject` | `output`, `requirements` | Generate a full frontend + backend + tests from a requirements brief |
| `modernize` | `workspace`, `output` | Migrate legacy code to a modern web stack |
| `systest` | `workspace` and/or `backend_url` / `frontend_url` | Test existing app + auto fix bugs |
| `graph` | `graph_subcmd` (status / rebuild / query) | Explore the semantic knowledge graph |

**EXAMPLE INVOCATIONS**:

```json
// New game mod
{
  "tool": "metacoder",
  "params": {
    "mode": "newproject",
    "output": "/home/winclaw/.winclaw/workspace/new-mod",
    "requirements": "Build a Godot 4 mod that adds a crafting system with 12 recipe slots, persistence via JSON, and an in-game UI."
  }
}

// Test existing API
{
  "tool": "metacoder",
  "params": {
    "mode": "systest",
    "workspace": "/home/winclaw/.winclaw/workspace/myapp",
    "backend_url": "http://localhost:8000",
    "frontend_url": "http://localhost:5173"
  }
}

// Modernize COBOL
{
  "tool": "metacoder",
  "params": {
    "mode": "modernize",
    "workspace": "/home/winclaw/.winclaw/workspace/legacy-cobol",
    "output": "/home/winclaw/.winclaw/workspace/modernized"
  }
}

// Knowledge graph query
{
  "tool": "metacoder",
  "params": {
    "mode": "graph",
    "graph_subcmd": "query",
    "graph_query": "How is user authentication wired through the API?"
  }
}
```

**EXECUTION TIME**:
- newproject: 30 min – 4 h
- modernize: 1 – 8 h
- systest: 30 min – 2 h per iteration
- graph rebuild: 5 – 30 min per ~10K LoC

**API KEY**: Auto-extracted from your container’s `winclaw.json` (synced from GRC). No manual setup needed.

**DECISION CHECKLIST** (before invoking):
1. Is this a multi-hour task that needs a coherent architecture? → YES, use MetaCoder
2. Will the result span >5 files / multiple modules? → YES, use MetaCoder
3. Is it just "fix this bug" or "add this single feature"? → NO, use Edit/Bash directly
4. Will another agent (PM, reviewer) verify the output? → MetaCoder already includes multi-agent TDD internally, so use it for major work
',
updated_at = CURRENT_TIMESTAMP
WHERE id IN (
  'engineering-lead',
  'backend-architect',
  'frontend-developer',
  'ai-engineer',
  'ml-engineer',
  'mobile-app-builder',
  'embedded-firmware-engineer',
  'platform-engineer',
  'cloud-architect',
  'data-engineer',
  'game-designer',
  'level-designer',
  'narrative-designer',
  'godot-gameplay-scripter',
  'godot-multiplayer-engineer',
  'godot-shader-developer',
  'game-audio-engineer',
  'blender-addon-engineer',
  'blockchain-security-auditor',
  'computer-vision-engineer',
  'nlp-engineer',
  'security-engineer',
  'infrastructure-engineer',
  'macos-spatial-metal-engineer',
  'lsp-index-engineer',
  'ai-data-remediation-engineer',
  'feishu-integration-developer',
  'workflow-architect',
  'mcp-builder',
  'developer-advocate',
  'agents-orchestrator'
);

-- Also append a brief reference in agents_md
UPDATE role_templates
SET agents_md = agents_md || '

## 🧠 Heavy Development: MetaCoder

For LARGE software development tasks (game development, legacy modernization, new web/SaaS projects, comprehensive system testing of >10K LoC codebases), invoke the `metacoder` tool. It runs MetaCoder’s semantic-graph + multi-agent TDD pipeline (PM + Coding + Reviewer + Tester) and returns a phase-4 summary.

Use it when a task naturally spans 30+ minutes and multiple files. For small edits, prefer the Edit/Bash tools directly. See the TOOLS.md "🧠 MetaCoder Tool" section for invocation patterns.
',
updated_at = CURRENT_TIMESTAMP
WHERE id IN (
  'engineering-lead',
  'backend-architect',
  'frontend-developer',
  'ai-engineer',
  'ml-engineer',
  'mobile-app-builder',
  'embedded-firmware-engineer',
  'platform-engineer',
  'cloud-architect',
  'data-engineer',
  'game-designer',
  'level-designer',
  'narrative-designer',
  'godot-gameplay-scripter',
  'godot-multiplayer-engineer',
  'godot-shader-developer',
  'game-audio-engineer',
  'blender-addon-engineer',
  'blockchain-security-auditor',
  'computer-vision-engineer',
  'nlp-engineer',
  'security-engineer',
  'infrastructure-engineer',
  'macos-spatial-metal-engineer',
  'lsp-index-engineer',
  'ai-data-remediation-engineer',
  'feishu-integration-developer',
  'workflow-architect',
  'mcp-builder',
  'developer-advocate',
  'agents-orchestrator'
);

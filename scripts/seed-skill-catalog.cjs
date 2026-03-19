/**
 * Seed the skill_catalog table with 28 skills from the Role Conversion Skill Analysis.
 *
 * Usage:  node scripts/seed-skill-catalog.cjs
 *
 * Requires:  mysql2  (already a project dependency)
 */

const mysql = require("mysql2/promise");

const DB_URL =
  process.env.DATABASE_URL ||
  "mysql://root:Admin123@13.78.81.86:18306/grc-server";

const SKILLS = [
  // ── P0 — Critical ────────────────────────────────
  {
    id: "S01",
    name: "Data Analysis & Reporting",
    pluginName: "skill-data-analysis",
    tier: "P0",
    description:
      "SQL queries, statistical analysis, dashboard generation, anomaly detection, and data transformation pipelines.",
    capabilities: JSON.stringify([
      "SQL Query Execution",
      "Statistical Analysis",
      "Dashboard Generation",
      "Anomaly Detection",
      "Data Transformation",
    ]),
    slashCommands: JSON.stringify([
      "/analyze-data",
      "/generate-dashboard",
      "/detect-anomalies",
      "/query-data",
    ]),
    departments: JSON.stringify([
      "Engineering",
      "Product",
      "Marketing",
      "Finance",
      "Support",
      "Sales",
      "DevOps",
      "Testing",
    ]),
    roleCount: 55,
  },
  {
    id: "S02",
    name: "Content Generation & Writing",
    pluginName: "skill-content-generation",
    tier: "P0",
    description:
      "Multi-format content creation, copywriting, brand voice compliance, localization, and content repurposing.",
    capabilities: JSON.stringify([
      "Multi-Format Content",
      "Copywriting",
      "Brand Voice Compliance",
      "Localization Support",
      "Content Repurposing",
    ]),
    slashCommands: JSON.stringify([
      "/generate-content",
      "/check-brand-voice",
      "/repurpose-content",
      "/localize-content",
    ]),
    departments: JSON.stringify([
      "Marketing",
      "Design",
      "Product",
      "Support",
      "Sales",
      "HR",
    ]),
    roleCount: 50,
  },
  {
    id: "S03",
    name: "Web Research & Intelligence",
    pluginName: "skill-web-research",
    tier: "P0",
    description:
      "Competitive analysis, market research, trend monitoring, source verification, and OSINT collection.",
    capabilities: JSON.stringify([
      "Competitive Analysis",
      "Market Research",
      "Trend Monitoring",
      "Source Verification",
      "OSINT Collection",
    ]),
    slashCommands: JSON.stringify([
      "/research-topic",
      "/competitive-analysis",
      "/monitor-trends",
      "/verify-sources",
    ]),
    departments: JSON.stringify([
      "Marketing",
      "Sales",
      "Product",
      "Engineering",
      "Support",
      "Finance",
    ]),
    roleCount: 45,
  },
  {
    id: "S04",
    name: "Document Generation",
    pluginName: "skill-document-generation",
    tier: "P0",
    description:
      "PDF, DOCX, XLSX/CSV, and PPTX generation with template engine and variable substitution.",
    capabilities: JSON.stringify([
      "PDF Generation",
      "DOCX Creation",
      "XLSX/CSV Export",
      "PPTX Slides",
      "Template Engine",
    ]),
    slashCommands: JSON.stringify([
      "/generate-pdf",
      "/generate-report",
      "/export-data",
      "/create-slides",
    ]),
    departments: JSON.stringify([
      "Finance",
      "Sales",
      "Marketing",
      "HR",
      "Legal",
      "Product",
      "Engineering",
    ]),
    roleCount: 42,
  },

  // ── P1 — High Priority ───────────────────────────
  {
    id: "S05",
    name: "Code Analysis & Review",
    pluginName: "skill-code-analysis",
    tier: "P1",
    description:
      "Static analysis, security scanning, best practice checks, code review automation, and refactoring suggestions.",
    capabilities: JSON.stringify([
      "Static Analysis",
      "Security Scanning",
      "Best Practice Checks",
      "Code Review Automation",
      "Refactoring Suggestions",
    ]),
    slashCommands: JSON.stringify([
      "/analyze-code",
      "/review-pr",
      "/scan-security",
      "/suggest-refactor",
    ]),
    departments: JSON.stringify([
      "Engineering",
      "Testing",
      "DevOps",
      "Security",
    ]),
    roleCount: 25,
  },
  {
    id: "S06",
    name: "SEO & Search Optimization",
    pluginName: "skill-seo",
    tier: "P1",
    description:
      "Technical SEO audit, keyword research, content optimization, SERP analysis, and Baidu/local SEO.",
    capabilities: JSON.stringify([
      "Technical SEO Audit",
      "Keyword Research",
      "Content Optimization",
      "SERP Analysis",
      "Baidu/Local SEO",
    ]),
    slashCommands: JSON.stringify([
      "/seo-audit",
      "/keyword-research",
      "/optimize-content",
      "/track-rankings",
    ]),
    departments: JSON.stringify(["Marketing", "Product"]),
    roleCount: 18,
  },
  {
    id: "S07",
    name: "Project & Task Management",
    pluginName: "skill-project-management",
    tier: "P1",
    description:
      "RICE scoring, sprint planning, capacity planning, dependency tracking, and retrospective analysis.",
    capabilities: JSON.stringify([
      "RICE Scoring",
      "Sprint Planning",
      "Capacity Planning",
      "Dependency Tracking",
      "Retrospective Analysis",
    ]),
    slashCommands: JSON.stringify([
      "/plan-sprint",
      "/rice-score",
      "/capacity-plan",
      "/track-dependencies",
    ]),
    departments: JSON.stringify([
      "Product",
      "Engineering",
      "Design",
      "Marketing",
    ]),
    roleCount: 20,
  },
  {
    id: "S08",
    name: "Financial Analysis & Modeling",
    pluginName: "skill-financial-analysis",
    tier: "P1",
    description:
      "NPV/IRR calculations, budget variance analysis, financial forecasting, P&L analysis, and unit economics.",
    capabilities: JSON.stringify([
      "NPV/IRR Calculations",
      "Budget Variance Analysis",
      "Financial Forecasting",
      "P&L Analysis",
      "Unit Economics",
    ]),
    slashCommands: JSON.stringify([
      "/financial-model",
      "/budget-analysis",
      "/forecast-revenue",
      "/unit-economics",
    ]),
    departments: JSON.stringify(["Finance", "Sales", "Support", "Product"]),
    roleCount: 15,
  },
  {
    id: "S09",
    name: "Security Auditing & Compliance",
    pluginName: "skill-security-audit",
    tier: "P1",
    description:
      "STRIDE threat modeling, OWASP assessment, compliance frameworks, vulnerability scanning, and security policy review.",
    capabilities: JSON.stringify([
      "STRIDE Threat Modeling",
      "OWASP Assessment",
      "Compliance Frameworks",
      "Vulnerability Scanning",
      "Security Policy Review",
    ]),
    slashCommands: JSON.stringify([
      "/threat-model",
      "/security-scan",
      "/compliance-check",
      "/assess-owasp",
    ]),
    departments: JSON.stringify([
      "Engineering",
      "DevOps",
      "Legal",
      "Blockchain",
    ]),
    roleCount: 14,
  },
  {
    id: "S10",
    name: "Performance Testing & Monitoring",
    pluginName: "skill-performance-testing",
    tier: "P1",
    description:
      "Load testing, Core Web Vitals, APM integration, benchmarking, and SLA monitoring.",
    capabilities: JSON.stringify([
      "Load Testing",
      "Core Web Vitals",
      "APM Integration",
      "Benchmarking",
      "SLA Monitoring",
    ]),
    slashCommands: JSON.stringify([
      "/load-test",
      "/web-vitals",
      "/benchmark",
      "/sla-report",
    ]),
    departments: JSON.stringify(["Engineering", "DevOps", "Testing"]),
    roleCount: 13,
  },
  {
    id: "S11",
    name: "User Research & Feedback",
    pluginName: "skill-user-research",
    tier: "P1",
    description:
      "Survey design & analysis, persona creation, usability testing, sentiment analysis, and journey mapping.",
    capabilities: JSON.stringify([
      "Survey Design & Analysis",
      "Persona Creation",
      "Usability Testing",
      "Sentiment Analysis",
      "Journey Mapping",
    ]),
    slashCommands: JSON.stringify([
      "/design-survey",
      "/build-persona",
      "/analyze-sentiment",
      "/map-journey",
    ]),
    departments: JSON.stringify([
      "Product",
      "Design",
      "Support",
      "Marketing",
    ]),
    roleCount: 12,
  },

  // ── P2 — Medium Priority ─────────────────────────
  {
    id: "S12",
    name: "API Testing & Integration",
    pluginName: "skill-api-testing",
    tier: "P2",
    description:
      "REST/GraphQL testing, contract testing, API mocking, performance profiling, and documentation generation.",
    capabilities: JSON.stringify([
      "REST/GraphQL Testing",
      "Contract Testing",
      "API Mocking",
      "Performance Profiling",
      "Documentation Generation",
    ]),
    slashCommands: JSON.stringify([
      "/test-api",
      "/mock-api",
      "/validate-contract",
      "/generate-api-docs",
    ]),
    departments: JSON.stringify(["Engineering", "Testing", "Sales"]),
    roleCount: 12,
  },
  {
    id: "S13",
    name: "CI/CD Pipeline Management",
    pluginName: "skill-cicd",
    tier: "P2",
    description:
      "Build automation, deployment orchestration, rollback management, pipeline optimization, and environment management.",
    capabilities: JSON.stringify([
      "Build Automation",
      "Deployment Orchestration",
      "Rollback Management",
      "Pipeline Optimization",
      "Environment Management",
    ]),
    slashCommands: JSON.stringify([
      "/configure-pipeline",
      "/deploy",
      "/rollback",
      "/optimize-build",
    ]),
    departments: JSON.stringify(["DevOps", "Engineering", "Testing"]),
    roleCount: 10,
  },
  {
    id: "S14",
    name: "Social Media Management",
    pluginName: "skill-social-media",
    tier: "P2",
    description:
      "Multi-platform posting, content scheduling, engagement tracking, hashtag strategy, and community management.",
    capabilities: JSON.stringify([
      "Multi-Platform Posting",
      "Content Scheduling",
      "Engagement Tracking",
      "Hashtag Strategy",
      "Community Management",
    ]),
    slashCommands: JSON.stringify([
      "/schedule-post",
      "/track-engagement",
      "/analyze-hashtags",
      "/moderate-comments",
    ]),
    departments: JSON.stringify(["Marketing"]),
    roleCount: 15,
  },
  {
    id: "S15",
    name: "Sales Pipeline & CRM",
    pluginName: "skill-sales-pipeline",
    tier: "P2",
    description:
      "Lead scoring, deal tracking, pipeline forecasting, account planning, and activity tracking.",
    capabilities: JSON.stringify([
      "Lead Scoring",
      "Deal Tracking",
      "Pipeline Forecasting",
      "Account Planning",
      "Activity Tracking",
    ]),
    slashCommands: JSON.stringify([
      "/score-lead",
      "/forecast-pipeline",
      "/plan-account",
      "/track-deal",
    ]),
    departments: JSON.stringify(["Sales"]),
    roleCount: 12,
  },
  {
    id: "S16",
    name: "Design System & UI Components",
    pluginName: "skill-design-system",
    tier: "P2",
    description:
      "Component library management, design tokens, accessibility checks, responsive audit, and pattern documentation.",
    capabilities: JSON.stringify([
      "Component Library",
      "Design Tokens",
      "Accessibility Checks",
      "Responsive Audit",
      "Pattern Documentation",
    ]),
    slashCommands: JSON.stringify([
      "/audit-components",
      "/check-tokens",
      "/test-responsive",
      "/document-pattern",
    ]),
    departments: JSON.stringify(["Design", "Engineering", "Product"]),
    roleCount: 10,
  },
  {
    id: "S17",
    name: "Legal & Compliance Checking",
    pluginName: "skill-legal-compliance",
    tier: "P2",
    description:
      "GDPR assessment, privacy policy review, contract review, regulatory monitoring, and compliance reporting.",
    capabilities: JSON.stringify([
      "GDPR Assessment",
      "Privacy Policy Review",
      "Contract Review",
      "Regulatory Monitoring",
      "Compliance Reporting",
    ]),
    slashCommands: JSON.stringify([
      "/gdpr-check",
      "/review-contract",
      "/compliance-report",
      "/monitor-regulations",
    ]),
    departments: JSON.stringify([
      "Legal",
      "Healthcare",
      "Government",
      "Finance",
      "HR",
    ]),
    roleCount: 10,
  },
  {
    id: "S18",
    name: "Email & Campaign Automation",
    pluginName: "skill-email-automation",
    tier: "P2",
    description:
      "Drip campaigns, A/B testing, list management, deliverability checking, and campaign analytics.",
    capabilities: JSON.stringify([
      "Drip Campaigns",
      "A/B Testing",
      "List Management",
      "Deliverability",
      "Analytics",
    ]),
    slashCommands: JSON.stringify([
      "/create-campaign",
      "/ab-test",
      "/check-deliverability",
      "/campaign-analytics",
    ]),
    departments: JSON.stringify(["Marketing", "Sales"]),
    roleCount: 8,
  },

  // ── P3 — Specialized ─────────────────────────────
  {
    id: "S19",
    name: "Video & Multimedia Production",
    pluginName: "skill-video-production",
    tier: "P3",
    description:
      "Video editing guidance, thumbnail creation, livestream setup, script writing, and platform optimization.",
    capabilities: JSON.stringify([
      "Video Editing Guidance",
      "Thumbnail Creation",
      "Livestream Setup",
      "Script Writing",
      "Platform Optimization",
    ]),
    slashCommands: JSON.stringify([
      "/video-script",
      "/thumbnail-design",
      "/livestream-config",
      "/optimize-format",
    ]),
    departments: JSON.stringify(["Marketing", "Content"]),
    roleCount: 8,
  },
  {
    id: "S20",
    name: "Cloud Infrastructure Management",
    pluginName: "skill-cloud-infra",
    tier: "P3",
    description:
      "Multi-cloud management, Kubernetes operations, Infrastructure as Code, cost optimization, and disaster recovery.",
    capabilities: JSON.stringify([
      "Multi-Cloud Management",
      "Kubernetes Operations",
      "Infrastructure as Code",
      "Cost Optimization",
      "Disaster Recovery",
    ]),
    slashCommands: JSON.stringify([
      "/infra-plan",
      "/k8s-status",
      "/cost-optimize",
      "/dr-test",
    ]),
    departments: JSON.stringify(["DevOps", "Engineering"]),
    roleCount: 7,
  },
  {
    id: "S21",
    name: "ML/AI Model Operations",
    pluginName: "skill-mlops",
    tier: "P3",
    description:
      "Model training, evaluation, deployment, feature engineering, and model monitoring.",
    capabilities: JSON.stringify([
      "Model Training",
      "Model Evaluation",
      "Model Deployment",
      "Feature Engineering",
      "Model Monitoring",
    ]),
    slashCommands: JSON.stringify([
      "/train-model",
      "/evaluate-model",
      "/deploy-model",
      "/monitor-drift",
    ]),
    departments: JSON.stringify(["Engineering"]),
    roleCount: 6,
  },
  {
    id: "S22",
    name: "Paid Advertising Management",
    pluginName: "skill-paid-ads",
    tier: "P3",
    description:
      "PPC campaign management, programmatic advertising, social ads, bid optimization, and attribution modeling.",
    capabilities: JSON.stringify([
      "PPC Campaign Management",
      "Programmatic Advertising",
      "Social Ads",
      "Bid Optimization",
      "Attribution Modeling",
    ]),
    slashCommands: JSON.stringify([
      "/create-campaign-ad",
      "/optimize-bids",
      "/attribution-report",
      "/audience-target",
    ]),
    departments: JSON.stringify(["Marketing"]),
    roleCount: 6,
  },
  {
    id: "S23",
    name: "Workflow & Process Automation",
    pluginName: "skill-workflow-automation",
    tier: "P3",
    description:
      "RPA design, integration orchestration, trigger management, process mining, and governance.",
    capabilities: JSON.stringify([
      "RPA Design",
      "Integration Orchestration",
      "Trigger Management",
      "Process Mining",
      "Governance",
    ]),
    slashCommands: JSON.stringify([
      "/design-workflow",
      "/configure-trigger",
      "/mine-process",
      "/audit-automation",
    ]),
    departments: JSON.stringify(["Engineering", "Product", "Operations"]),
    roleCount: 6,
  },
  {
    id: "S24",
    name: "Database Administration",
    pluginName: "skill-database-admin",
    tier: "P3",
    description:
      "Query optimization, schema design, migration management, backup & recovery, and performance tuning.",
    capabilities: JSON.stringify([
      "Query Optimization",
      "Schema Design",
      "Migration Management",
      "Backup & Recovery",
      "Performance Tuning",
    ]),
    slashCommands: JSON.stringify([
      "/optimize-query",
      "/design-schema",
      "/plan-migration",
      "/backup-status",
    ]),
    departments: JSON.stringify(["Engineering"]),
    roleCount: 5,
  },
  {
    id: "S25",
    name: "Accessibility Auditing",
    pluginName: "skill-accessibility",
    tier: "P3",
    description:
      "WCAG 2.2 compliance, screen reader testing, color contrast checking, keyboard navigation, and inclusive design.",
    capabilities: JSON.stringify([
      "WCAG 2.2 Compliance",
      "Screen Reader Testing",
      "Color Contrast",
      "Keyboard Navigation",
      "Inclusive Design",
    ]),
    slashCommands: JSON.stringify([
      "/wcag-audit",
      "/contrast-check",
      "/keyboard-test",
      "/readability-score",
    ]),
    departments: JSON.stringify(["Design", "Engineering", "Product"]),
    roleCount: 5,
  },
  {
    id: "S26",
    name: "Blockchain & Web3",
    pluginName: "skill-blockchain",
    tier: "P3",
    description:
      "Smart contract audit, ZK proof analysis, DeFi protocol analysis, token economics, and on-chain analytics.",
    capabilities: JSON.stringify([
      "Smart Contract Audit",
      "ZK Proof Analysis",
      "DeFi Protocol Analysis",
      "Token Economics",
      "On-Chain Analytics",
    ]),
    slashCommands: JSON.stringify([
      "/audit-contract",
      "/analyze-defi",
      "/token-economics",
      "/onchain-analytics",
    ]),
    departments: JSON.stringify(["Engineering", "Finance"]),
    roleCount: 5,
  },
  {
    id: "S27",
    name: "Spatial Computing & XR",
    pluginName: "skill-spatial-computing",
    tier: "P3",
    description:
      "ARKit/RealityKit, spatial UI design, 3D interaction, performance optimization, and cross-platform XR.",
    capabilities: JSON.stringify([
      "ARKit/RealityKit",
      "Spatial UI Design",
      "3D Interaction",
      "Performance Optimization",
      "Cross-Platform",
    ]),
    slashCommands: JSON.stringify([
      "/spatial-design",
      "/ar-prototype",
      "/xr-performance",
      "/3d-interaction",
    ]),
    departments: JSON.stringify(["Engineering"]),
    roleCount: 4,
  },
  {
    id: "S28",
    name: "Game Engine Development",
    pluginName: "skill-game-engine",
    tier: "P3",
    description:
      "Unity, Unreal Engine, Godot development assistance, game systems design, and multiplayer networking.",
    capabilities: JSON.stringify([
      "Unity Development",
      "Unreal Engine",
      "Godot",
      "Game Systems",
      "Multiplayer",
    ]),
    slashCommands: JSON.stringify([
      "/unity-assist",
      "/unreal-assist",
      "/godot-assist",
      "/game-system-design",
    ]),
    departments: JSON.stringify(["Engineering"]),
    roleCount: 3,
  },
];

async function main() {
  const url = new URL(DB_URL.replace("mysql://", "http://"));
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
  });

  console.log("Connected to database. Seeding skill_catalog...");

  const insertSQL = `
    INSERT INTO skill_catalog
      (id, name, plugin_name, tier, description, capabilities, slash_commands, departments, role_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      plugin_name = VALUES(plugin_name),
      tier = VALUES(tier),
      description = VALUES(description),
      capabilities = VALUES(capabilities),
      slash_commands = VALUES(slash_commands),
      departments = VALUES(departments),
      role_count = VALUES(role_count)
  `;

  let inserted = 0;
  for (const s of SKILLS) {
    await connection.execute(insertSQL, [
      s.id,
      s.name,
      s.pluginName,
      s.tier,
      s.description,
      s.capabilities,
      s.slashCommands,
      s.departments,
      s.roleCount,
    ]);
    inserted++;
    console.log(`  [${inserted}/${SKILLS.length}] ${s.id}: ${s.name}`);
  }

  console.log(`\nDone. ${inserted} skills seeded.`);
  await connection.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

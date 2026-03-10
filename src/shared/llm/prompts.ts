/**
 * LLM Prompt Templates — Role & Strategy Generation
 *
 * Each function returns a system + user message pair
 * for calling the LLM chat-completion API.
 */

import type { LlmMessage } from "./client.js";

// ── Role Generation ────────────────────────────────

export function buildRoleGenerationPrompt(params: {
  roleDescription: string;
  companyInfo?: string;
  mode: string;
}): LlmMessage[] {
  const system: LlmMessage = {
    role: "system",
    content: `You are an expert AI role template designer for enterprise AI employees (autonomous agents).
Your task is to generate a complete role configuration for an AI employee.

The output MUST be a valid JSON object with these exact fields:
{
  "id": "kebab-case-id (lowercase, hyphens, 3-6 words)",
  "name": "Display Name (2-4 words)",
  "emoji": "single emoji character",
  "department": "department name (e.g. Engineering, Sales, Operations)",
  "industry": "industry sector (e.g. SaaS, Finance, Healthcare)",
  "mode": "${params.mode}",
  "agentsMd": "markdown content for agent collaboration rules",
  "soulMd": "markdown content for core personality and values",
  "identityMd": "markdown content for role identity and persona",
  "userMd": "markdown content for user interaction guidelines",
  "toolsMd": "markdown content for available tools and usage",
  "heartbeatMd": "markdown content for periodic health check tasks",
  "bootstrapMd": "markdown content for initialization sequence",
  "tasksMd": "markdown content for ongoing task definitions"
}

Guidelines for each markdown field:
- agentsMd: Define how this role collaborates with other AI agents, delegation rules, and escalation policies.
- soulMd: Define the role's core personality traits, work ethic, communication style, and professional values.
- identityMd: Define who this role is, their expertise, how they introduce themselves, and their authority scope.
- userMd: Define how this role interacts with human users, response format preferences, and communication protocols.
- toolsMd: Define what tools/APIs are available to this role and usage guidelines.
- heartbeatMd: Define periodic tasks this role performs (health checks, status reports, monitoring).
- bootstrapMd: Define the startup sequence when this role is activated.
- tasksMd: Define the role's primary recurring tasks and workflows.

Each markdown field should be 200-500 words with proper markdown headers (##, ###).
Mode "${params.mode}" means: ${params.mode === "autonomous" ? "The agent operates independently, making decisions and executing tasks without human approval." : "The agent assists humans, providing suggestions and drafts that require human review and approval."}

IMPORTANT: Return ONLY the JSON object, no markdown fences, no explanation.`,
  };

  let userContent = `Create an AI employee role with the following description:\n\n${params.roleDescription}`;
  if (params.companyInfo) {
    userContent += `\n\nCompany context:\n${params.companyInfo}`;
  }

  const user: LlmMessage = { role: "user", content: userContent };

  return [system, user];
}

// ── Strategy Generation ────────────────────────────

export function buildStrategyGenerationPrompt(params: {
  industry: string;
  companyInfo: string;
  mode: "new" | "update";
  updateInstruction?: string;
  existingStrategy?: Record<string, unknown>;
}): LlmMessage[] {
  const system: LlmMessage = {
    role: "system",
    content: `You are a senior business strategy consultant specializing in AI-first companies.
Your task is to generate a comprehensive company strategy.

The output MUST be a valid JSON object with these exact fields:
{
  "companyMission": "A clear, concise mission statement (1-2 sentences)",
  "companyVision": "An inspiring vision statement (1-2 sentences)",
  "companyValues": "3-5 core values, separated by newlines",
  "shortTermObjectives": [
    {
      "quarter": "Q1 2025",
      "goals": ["Goal 1", "Goal 2"],
      "kpis": [{ "name": "KPI Name", "target": "Target Value", "owner": "Department" }]
    }
  ],
  "midTermObjectives": {
    "revenueTarget": "$X million",
    "goals": ["Annual Goal 1", "Annual Goal 2"],
    "kpis": [{ "name": "KPI Name", "target": "Target" }]
  },
  "longTermObjectives": {
    "vision": "3-5 year vision statement",
    "milestones": ["Year 1 milestone", "Year 2 milestone", "Year 3 milestone"]
  },
  "departmentBudgets": [
    { "department": "Engineering", "annual": 500000, "q1": 125000, "q2": 125000, "q3": 125000, "q4": 125000 }
  ],
  "departmentKpis": [
    { "department": "Engineering", "kpi": "Sprint Velocity", "target": "50 pts", "current": "0", "progress": 0 }
  ],
  "strategicPriorities": ["Priority 1", "Priority 2", "Priority 3"]
}

Industry context: ${params.industry}

Guidelines:
- Make the strategy realistic and actionable for the given industry
- Include 2-4 quarters for short-term objectives
- Include 3-5 departments in budgets and KPIs
- Budget numbers should be realistic for the company size
- KPI targets should be measurable and specific
- Strategic priorities should be 3-5 items

IMPORTANT: Return ONLY the JSON object, no markdown fences, no explanation.`,
  };

  let userContent: string;

  if (params.mode === "update" && params.existingStrategy) {
    userContent = `Update the following existing company strategy based on these instructions:

Update instructions: ${params.updateInstruction || "Improve and refine the strategy"}

Company info: ${params.companyInfo}

Existing strategy (partial):
${JSON.stringify(params.existingStrategy, null, 2).substring(0, 3000)}

Return the full updated strategy JSON.`;
  } else {
    userContent = `Create a new comprehensive company strategy for:

Industry: ${params.industry}
Company info: ${params.companyInfo}

Generate a complete strategy with realistic goals, budgets, and KPIs.`;
  }

  const user: LlmMessage = { role: "user", content: userContent };

  return [system, user];
}

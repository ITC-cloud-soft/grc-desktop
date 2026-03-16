/**
 * Agent Task Creation Policy Engine
 * Defines per-role limits for autonomous task creation via A2A API.
 */

export interface AgentTaskPolicy {
  canCreateTasks: boolean;
  maxTasksPerDay: number;
  maxTasksPerHour: number;
  allowedCategories: string[];
  canDelegateToRoles: string[];
  requiresApproval: boolean;
  maxExpenseAmount: number | null;
}

export const AGENT_TASK_POLICIES: Record<string, AgentTaskPolicy> = {
  // ── C-Suite ────────────────────────────────────
  ceo: {
    canCreateTasks: true,
    maxTasksPerDay: 999, // Intentionally unlimited per owner directive
    maxTasksPerHour: 999, // Intentionally unlimited per owner directive
    allowedCategories: ["strategic", "operational", "administrative", "expense"],
    canDelegateToRoles: ["*"],
    requiresApproval: false,
    maxExpenseAmount: null,
  },
  cto: {
    canCreateTasks: true,
    maxTasksPerDay: 30,
    maxTasksPerHour: 10,
    allowedCategories: ["strategic", "operational"],
    canDelegateToRoles: ["engineering", "support", "marketing"],
    requiresApproval: false,
    maxExpenseAmount: 500000,
  },
  cfo: {
    canCreateTasks: true,
    maxTasksPerDay: 20,
    maxTasksPerHour: 8,
    allowedCategories: ["strategic", "operational", "expense"],
    canDelegateToRoles: ["*"],
    requiresApproval: false,
    maxExpenseAmount: null,
  },
  // ── Department Heads ───────────────────────────
  marketing: {
    canCreateTasks: true,
    maxTasksPerDay: 20,
    maxTasksPerHour: 8,
    allowedCategories: ["strategic", "operational"],
    canDelegateToRoles: ["sales", "support", "engineering-lead"],
    requiresApproval: false,
    maxExpenseAmount: 100000,
  },
  sales: {
    canCreateTasks: true,
    maxTasksPerDay: 20,
    maxTasksPerHour: 8,
    allowedCategories: ["strategic", "operational"],
    canDelegateToRoles: ["marketing", "support", "engineering-lead"],
    requiresApproval: false,
    maxExpenseAmount: 100000,
  },
  engineering: {
    canCreateTasks: true,
    maxTasksPerDay: 20,
    maxTasksPerHour: 8,
    allowedCategories: ["strategic", "operational"],
    canDelegateToRoles: ["support", "marketing", "sales"],
    requiresApproval: false,
    maxExpenseAmount: 50000,
  },
  // ── Aliases (role template IDs use hyphenated names) ──
  "engineering-lead": {
    canCreateTasks: true,
    maxTasksPerDay: 20,
    maxTasksPerHour: 8,
    allowedCategories: ["strategic", "operational"],
    canDelegateToRoles: ["marketing", "finance", "sales", "support"],
    requiresApproval: false,
    maxExpenseAmount: 100000,
  },
  finance: {
    canCreateTasks: true,
    maxTasksPerDay: 20,
    maxTasksPerHour: 8,
    allowedCategories: ["strategic", "operational", "expense"],
    canDelegateToRoles: ["marketing", "engineering-lead", "sales"],
    requiresApproval: false,
    maxExpenseAmount: 200000,
  },
  hr: {
    canCreateTasks: true,
    maxTasksPerDay: 15,
    maxTasksPerHour: 5,
    allowedCategories: ["operational", "administrative"],
    canDelegateToRoles: [],
    requiresApproval: false,
    maxExpenseAmount: 50000,
  },
  legal: {
    canCreateTasks: true,
    maxTasksPerDay: 10,
    maxTasksPerHour: 3,
    allowedCategories: ["operational"],
    canDelegateToRoles: [],
    requiresApproval: true,
    maxExpenseAmount: 0,
  },
  support: {
    canCreateTasks: true,
    maxTasksPerDay: 10,
    maxTasksPerHour: 3,
    allowedCategories: ["operational"],
    canDelegateToRoles: [],
    requiresApproval: true,
    maxExpenseAmount: 0,
  },
  // ── Default (custom roles) ─────────────────────
  _default: {
    canCreateTasks: true,
    maxTasksPerDay: 10,
    maxTasksPerHour: 3,
    allowedCategories: ["strategic", "operational"],
    canDelegateToRoles: [],
    requiresApproval: true,
    maxExpenseAmount: 0,
  },
};

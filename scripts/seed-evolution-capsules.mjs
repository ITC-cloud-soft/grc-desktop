/**
 * Seed initial Evolution capsules to break the "chicken and egg" problem.
 * Creates sample capsules so agents have examples to reference.
 *
 * Usage: node scripts/seed-evolution-capsules.mjs
 */

import crypto from 'crypto';

const API_BASE = 'http://localhost:3100';
const LOGIN_EMAIL = 'mysin008@gmail.com';
const LOGIN_PASSWORD = 'W4f48dbc4';

const SEED_CAPSULES = [
  {
    asset_type: 'capsule',
    asset_id: 'capsule-ceo-community-posting-guide',
    payload: {
      summary: 'How to post to the Community Forum — step-by-step guide for all agents',
      trigger_data: {
        problem: 'Agent does not know how to post to the Community Forum',
        context: 'New agent onboarding or when 401 errors occur',
      },
      solution: `1. Ensure you have a valid JWT or API key
2. Use POST /a2a/community/post with your node_id
3. Set channel to one of: evolution-showcase, problem-solving, skill-exchange, announcements
4. Include title, body (Markdown), and tags
5. Check the feed with POST /a2a/community/feed to verify your post`,
      tags: ['onboarding', 'community', 'how-to'],
      created_by: 'CEO Agent',
      role: 'ceo',
    },
  },
  {
    asset_type: 'capsule',
    asset_id: 'capsule-ceo-weekly-report-template',
    payload: {
      summary: 'Standard weekly report template for all departments',
      trigger_data: {
        problem: 'Agent needs to write a weekly report but does not know the format',
        context: 'Every Friday, all agents must post a weekly report',
      },
      solution: `Use this template for your weekly report:

## This Week's Achievements
- [List completed tasks with outcomes]

## Challenges & Blockers
- [Issues encountered, help needed]

## Next Week's Plan
- [Planned tasks and goals]

## Collaboration Notes
- [Interactions with other departments]

Post to channel: evolution-showcase
Post type: experience
Tags: weekly-report, [your-role-id]`,
      tags: ['template', 'weekly-report', 'all-departments'],
      created_by: 'CEO Agent',
      role: 'ceo',
    },
  },
  {
    asset_type: 'capsule',
    asset_id: 'capsule-ceo-auth-troubleshooting',
    payload: {
      summary: 'Troubleshooting 401 Unauthorized errors when accessing GRC APIs',
      trigger_data: {
        problem: 'API calls return 401 Unauthorized',
        context: 'Agent cannot access community, relay, or task endpoints',
      },
      solution: `1. Check if your JWT token is expired (tokens expire after 24h)
2. Re-authenticate: POST /auth/email/login or use your API key header x-api-key
3. For A2A endpoints, include Authorization: Bearer <token> header
4. If using API key, ensure it has the correct scopes
5. If error persists, the GRC admin may need to re-assign your role`,
      tags: ['troubleshooting', 'auth', '401-error'],
      created_by: 'CEO Agent',
      role: 'ceo',
    },
  },
  {
    asset_type: 'gene',
    asset_id: 'gene-common-retry-with-backoff',
    payload: {
      signals_match: ['error', 'timeout', '500', '503', 'ECONNREFUSED'],
      strategy: {
        name: 'exponential-backoff-retry',
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
      },
      constraints_data: {
        maxTotalTime: '30s',
        applicableTo: ['API calls', 'database queries', 'external service requests'],
      },
      validation: {
        required: ['signal'],
        description: 'Retry failed operations with exponential backoff',
      },
      summary: 'Universal retry strategy with exponential backoff for transient failures',
      tags: ['error-handling', 'retry', 'resilience'],
      created_by: 'CEO Agent',
    },
  },
  {
    asset_type: 'capsule',
    asset_id: 'capsule-finance-budget-analysis-template',
    payload: {
      summary: 'Template for quarterly budget analysis reports',
      trigger_data: {
        problem: 'Need to prepare a budget analysis report',
        context: 'Quarterly budget review, expense tracking, financial planning',
      },
      solution: `Budget Analysis Template:

## Department: [Name]
## Period: Q[N] FY[Year]

### Budget vs Actual
| Category | Budget | Actual | Variance | % |
|----------|--------|--------|----------|---|
| Personnel | | | | |
| Operations | | | | |
| Marketing | | | | |
| Total | | | | |

### Key Findings
- [Notable variances and reasons]

### Recommendations
- [Action items for next quarter]`,
      tags: ['finance', 'budget', 'template', 'quarterly'],
      created_by: 'Finance Lead',
      role: 'finance',
    },
  },
];

async function main() {
  console.log('Logging in...');
  const loginRes = await fetch(`${API_BASE}/auth/email/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
  });
  const { token } = await loginRes.json();
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Get CEO node_id for publishing
  const nodesRes = await fetch(`${API_BASE}/api/v1/admin/evolution/nodes`, { headers: h });
  const nodes = (await nodesRes.json()).data || [];
  const ceoNode = nodes.find(n => n.roleId === 'ceo');
  if (!ceoNode) {
    console.error('CEO node not found');
    process.exit(1);
  }

  console.log(`\nPublishing ${SEED_CAPSULES.length} seed assets...\n`);

  let ok = 0;
  let errors = 0;

  for (const capsule of SEED_CAPSULES) {
    const payloadStr = JSON.stringify(capsule.payload);
    const contentHash = crypto.createHash('sha256').update(payloadStr).digest('hex');

    const body = {
      node_id: ceoNode.nodeId,
      asset_type: capsule.asset_type,
      asset_id: capsule.asset_id,
      content_hash: contentHash,
      payload: capsule.payload,
    };

    try {
      const res = await fetch(`${API_BASE}/a2a/publish`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        console.log(`  [OK] ${capsule.asset_id}`);
        ok++;
      } else {
        const err = await res.text();
        console.log(`  [${res.status}] ${capsule.asset_id}: ${err.substring(0, 100)}`);
        errors++;
      }
    } catch (err) {
      console.log(`  [ERR] ${capsule.asset_id}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n========================================`);
  console.log(`  Published: ${ok}  |  Errors: ${errors}`);
  console.log(`========================================\n`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

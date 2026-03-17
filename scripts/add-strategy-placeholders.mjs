/**
 * Add strategy variable placeholders to role templates' user_md.
 * This enables deployStrategy() to inject company strategy data
 * (mission, quarter goals, budgets, KPIs) into each node's USER.md.
 *
 * Strategy variables resolved by StrategyService.buildStrategyVariables():
 * - ${company_mission}         - Company mission statement
 * - ${company_values}          - Company core values
 * - ${strategy_revision}       - Current strategy revision number
 * - ${current_quarter_goals}   - Short-term objectives (all roles)
 * - ${department_budget}       - Department-specific budget (dept roles only)
 * - ${department_kpis}         - Department-specific KPIs (dept roles only)
 */
import mysql from "mysql2/promise";

const DB_URL = "mysql://root:Admin123@13.78.81.86:18306/grc-server";

const TEMPLATES = {
  finance: `# USER — Finance Lead Profile

## Company Mission
\${company_mission}

## Company Values
\${company_values}

## Current Quarter Goals
\${current_quarter_goals}

## Department Budget
\${department_budget}

## Department KPIs
\${department_kpis}

## Responsibilities
- Financial reporting and analysis
- Budget management and cost optimization
- Regulatory compliance (SOC 2, tax, audit)
- Cash flow management
- Financial decision support for all departments
- Vendor management and procurement

## Strategy Context
Strategy Revision: \${strategy_revision}`,

  marketing: `# USER — Marketing Lead Profile

## Company Mission
\${company_mission}

## Company Values
\${company_values}

## Current Quarter Goals
\${current_quarter_goals}

## Department Budget
\${department_budget}

## Department KPIs
\${department_kpis}

## Responsibilities
- Brand strategy and positioning
- Campaign planning and execution
- Content marketing and SEO
- Marketing analytics and reporting
- Budget management and ROI optimization
- Go-to-market strategy for product launches

## Strategy Context
Strategy Revision: \${strategy_revision}`,

  "engineering-lead": `# USER — Engineering Lead Profile

## Company Mission
\${company_mission}

## Company Values
\${company_values}

## Current Quarter Goals
\${current_quarter_goals}

## Department Budget
\${department_budget}

## Department KPIs
\${department_kpis}

## Responsibilities
- Architecture decisions and technical leadership
- Code quality and engineering standards
- Infrastructure and DevOps management
- Security and compliance for technical systems
- Engineering budget management
- Sprint planning and delivery execution

## Strategy Context
Strategy Revision: \${strategy_revision}`,
};

async function main() {
  const conn = await mysql.createConnection(DB_URL);

  for (const [roleId, userMd] of Object.entries(TEMPLATES)) {
    await conn.query("UPDATE role_templates SET user_md = ? WHERE id = ?", [userMd, roleId]);
    console.log(`✅ Updated ${roleId} user_md (${userMd.length} chars, ${(userMd.match(/\$\{/g) || []).length} placeholders)`);
  }

  await conn.end();
  console.log("\n🎉 All role templates updated with strategy placeholders!");
  console.log("Next: Run strategy deploy to resolve placeholders on nodes.");
}

main().catch(e => { console.error("Error:", e); process.exit(1); });

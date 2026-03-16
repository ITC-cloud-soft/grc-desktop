/**
 * Role Resolver — Maps role IDs to their most recently active nodes.
 */

import { desc, and, gte, inArray } from "drizzle-orm";
import pino from "pino";
import { getDb } from "../../shared/db/connection.js";
import { nodesTable } from "./schema.js";

const logger = pino({ name: "module:evolution:role-resolver" });

export interface ResolvedNode {
  nodeId: string;
  roleId: string | null;
  employeeName: string | null;
  lastHeartbeat: Date | null;
}

/**
 * Given an array of role IDs, return the most recently active node for each role.
 * Only considers nodes with a heartbeat within the last 24 hours.
 */
export async function getNodesByRoles(roleIds: string[]): Promise<ResolvedNode[]> {
  const db = getDb();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const nodes = await db
    .select({
      nodeId: nodesTable.nodeId,
      roleId: nodesTable.roleId,
      employeeName: nodesTable.employeeName,
      lastHeartbeat: nodesTable.lastHeartbeat,
    })
    .from(nodesTable)
    .where(
      and(
        inArray(nodesTable.roleId, roleIds),
        gte(nodesTable.lastHeartbeat, cutoff),
      ),
    )
    .orderBy(desc(nodesTable.lastHeartbeat));

  // Pick the latest node per role
  const seen = new Set<string>();
  const result: ResolvedNode[] = [];

  for (const n of nodes) {
    if (!n.roleId || seen.has(n.roleId)) continue;
    seen.add(n.roleId);
    result.push(n);
  }

  logger.debug(
    { requestedRoles: roleIds, resolved: result.length },
    "Resolved roles to nodes",
  );

  return result;
}

/**
 * Meeting KPI Service
 *
 * Calculates meeting participation and contribution metrics
 * for each node within a given date range.
 */

import { getDb } from "../../shared/db/connection.js";
import { meetingParticipantsTable, meetingTranscriptTable } from "./schema.js";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export interface MeetingKPI {
  nodeId: string;
  meetingsAttended: number;
  totalStatements: number;
  proposalsMade: number;
  meetingScore: number;
}

export async function calculateMeetingKPIs(
  startDate: Date,
  endDate: Date,
): Promise<MeetingKPI[]> {
  const db = getDb();

  // Get participation counts
  const participation = await db
    .select({
      nodeId: meetingParticipantsTable.nodeId,
      attended: sql<number>`COUNT(DISTINCT ${meetingParticipantsTable.sessionId})`,
    })
    .from(meetingParticipantsTable)
    .where(and(
      sql`${meetingParticipantsTable.joinedAt} IS NOT NULL`,
      gte(meetingParticipantsTable.joinedAt, startDate),
      lte(meetingParticipantsTable.joinedAt, endDate),
    ))
    .groupBy(meetingParticipantsTable.nodeId);

  // Get transcript stats
  const transcripts = await db
    .select({
      nodeId: meetingTranscriptTable.speakerNodeId,
      total: sql<number>`COUNT(*)`,
      proposals: sql<number>`SUM(CASE WHEN ${meetingTranscriptTable.type} = 'proposal' THEN 1 ELSE 0 END)`,
    })
    .from(meetingTranscriptTable)
    .where(and(
      gte(meetingTranscriptTable.createdAt, startDate),
      lte(meetingTranscriptTable.createdAt, endDate),
    ))
    .groupBy(meetingTranscriptTable.speakerNodeId);

  // Merge and score
  const nodeMap = new Map<string, MeetingKPI>();

  for (const p of participation) {
    if (!p.nodeId) continue;
    nodeMap.set(p.nodeId, {
      nodeId: p.nodeId,
      meetingsAttended: Number(p.attended),
      totalStatements: 0,
      proposalsMade: 0,
      meetingScore: Number(p.attended) * 10,
    });
  }

  for (const t of transcripts) {
    if (!t.nodeId) continue;
    const existing = nodeMap.get(t.nodeId) || {
      nodeId: t.nodeId, meetingsAttended: 0, totalStatements: 0, proposalsMade: 0, meetingScore: 0,
    };
    existing.totalStatements = Number(t.total);
    existing.proposalsMade = Number(t.proposals);
    existing.meetingScore += Number(t.total) * 2 + Number(t.proposals) * 5;
    nodeMap.set(t.nodeId, existing);
  }

  return Array.from(nodeMap.values()).sort((a, b) => b.meetingScore - a.meetingScore);
}

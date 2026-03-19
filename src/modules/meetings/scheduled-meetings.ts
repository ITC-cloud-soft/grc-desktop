/**
 * Scheduled Meeting Manager
 *
 * Creates meetings on a recurring weekly schedule using simple setInterval
 * with hour/minute checking. No external cron libraries required.
 */

import pino from "pino";
import { getDb } from "../../shared/db/connection.js";
import { nodesTable } from "../evolution/schema.js";
import { inArray } from "drizzle-orm";
import type { MeetingService } from "./service.js";
import { nodeConfigSSE } from "../evolution/node-config-sse.js";

const log = pino({ name: "meetings:scheduled" });

export interface ScheduledMeetingConfig {
  name: string;
  dayOfWeek: number;          // 0=Sun, 1=Mon, ..., 6=Sat
  hour: number;               // 0-23
  minute: number;             // 0-59
  title: string;
  type: "discussion" | "review" | "brainstorm" | "decision";
  participantRoleIds: string[];
  facilitatorRoleId: string;
  maxDurationMinutes: number;
  sharedContext?: string;
  enabled: boolean;
}

const WEEKLY_MEETINGS: ScheduledMeetingConfig[] = [
  {
    name: "weekly-strategy",
    dayOfWeek: 1,  // Monday
    hour: 9,
    minute: 0,
    title: "\u7D4C\u55B6\u6226\u7565\u4F1A\u8B70",
    type: "discussion",
    participantRoleIds: ["ceo", "engineering-lead", "sales", "marketing", "finance", "product-manager", "strategic-planner"],
    facilitatorRoleId: "ceo",
    maxDurationMinutes: 60,
    sharedContext: "\u9031\u6B21\u7D4C\u55B6\u4F1A\u8B70\u3002\u5404\u90E8\u9580\u306E\u9032\u6357\u5831\u544A\u2192\u8AB2\u984C\u5171\u6709\u2192\u610F\u601D\u6C7A\u5B9A\u306E\u9806\u3067\u9032\u884C\u3002",
    enabled: true,
  },
  {
    name: "sprint-review",
    dayOfWeek: 5,  // Friday
    hour: 15,
    minute: 0,
    title: "\u30B9\u30D7\u30EA\u30F3\u30C8\u30EC\u30D3\u30E5\u30FC",
    type: "review",
    participantRoleIds: ["product-manager", "engineering-lead", "sales"],
    facilitatorRoleId: "product-manager",
    maxDurationMinutes: 45,
    sharedContext: "\u6210\u679C\u30EC\u30D3\u30E5\u30FC\u3068\u6B21\u30B9\u30D7\u30EA\u30F3\u30C8\u306E\u8A08\u753B\u3002",
    enabled: true,
  },
];

export class ScheduledMeetingManager {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTriggered: Map<string, string> = new Map(); // name -> date string to prevent double-fire
  private meetingServiceGetter: () => MeetingService;

  constructor(meetingServiceGetter: () => MeetingService) {
    this.meetingServiceGetter = meetingServiceGetter;
  }

  async start(): Promise<void> {
    // Check for missed meetings on startup
    await this.checkMissed().catch(err => log.warn({ err }, "Failed to check missed meetings"));

    // Start regular interval
    this.timer = setInterval(() => this.check(), 60_000);
    log.info(`Scheduled meeting manager started with ${WEEKLY_MEETINGS.filter(m => m.enabled).length} meetings`);
  }

  /**
   * Check for meetings that should have fired today but were missed
   * (e.g. server was down at the scheduled time).
   */
  private async checkMissed(): Promise<void> {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const config of WEEKLY_MEETINGS) {
      if (!config.enabled) continue;
      if (now.getDay() !== config.dayOfWeek) continue;

      const scheduledMinutes = config.hour * 60 + config.minute;
      if (currentMinutes <= scheduledMinutes) continue; // Not yet past the scheduled time

      const key = `${config.name}-${today}`;
      if (this.lastTriggered.has(key)) continue; // Already triggered today

      log.info({ name: config.name, scheduledHour: config.hour, scheduledMinute: config.minute },
        "Recovering missed scheduled meeting");
      this.lastTriggered.set(key, today);

      try {
        await this.createMeeting(config);
      } catch (err) {
        log.error({ err, name: config.name }, "Failed to create missed scheduled meeting");
      }
    }
  }

  private async check(): Promise<void> {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    for (const config of WEEKLY_MEETINGS) {
      if (!config.enabled) continue;
      if (now.getDay() !== config.dayOfWeek) continue;
      if (now.getHours() !== config.hour || now.getMinutes() !== config.minute) continue;

      const key = `${config.name}-${today}`;
      if (this.lastTriggered.has(key)) continue;
      this.lastTriggered.set(key, today);

      try {
        await this.createMeeting(config);
      } catch (err) {
        log.error({ err, name: config.name }, "Failed to create scheduled meeting");
      }
    }
  }

  private async createMeeting(config: ScheduledMeetingConfig): Promise<void> {
    const db = getDb();

    // Resolve participant nodeIds from roleIds
    const nodes = await db
      .select({
        nodeId: nodesTable.nodeId,
        roleId: nodesTable.roleId,
        displayName: nodesTable.employeeName,
      })
      .from(nodesTable)
      .where(inArray(nodesTable.roleId, config.participantRoleIds));

    if (nodes.length < 2) {
      log.warn({ name: config.name, found: nodes.length }, "Not enough nodes for scheduled meeting, skipping");
      return;
    }

    // Find facilitator
    const facilitator = nodes.find(n => n.roleId === config.facilitatorRoleId);
    if (!facilitator) {
      log.warn({ name: config.name, role: config.facilitatorRoleId }, "Facilitator not found");
      return;
    }

    const service = this.meetingServiceGetter();

    const meeting = await service.createMeeting({
      title: config.title,
      type: config.type,
      initiatorType: "agent",
      initiationReason: `Scheduled: ${config.name}`,
      facilitatorNodeId: facilitator.nodeId,
      turnPolicy: "facilitator-directed",
      maxDurationMinutes: config.maxDurationMinutes,
      sharedContext: config.sharedContext,
      participants: nodes.map(n => ({
        nodeId: n.nodeId,
        roleId: n.roleId ?? "unknown",
        displayName: n.displayName ?? n.roleId ?? n.nodeId,
      })),
      createdBy: "system:scheduled",
    });

    // Auto-start
    await service.startMeeting(meeting.id);
    log.info({ name: config.name, meetingId: meeting.id, participants: nodes.length }, "Scheduled meeting created and started");

    // Send SSE notifications to all participants
    for (const node of nodes) {
      try {
        nodeConfigSSE.pushMeetingEvent(node.nodeId, {
          event_type: "meeting_started",
          session_id: meeting.id,
          title: config.title,
          type: config.type,
          shared_context: config.sharedContext,
          facilitator_node_id: facilitator.nodeId,
          participants: nodes.map(n => ({
            node_id: n.nodeId,
            role_id: n.roleId ?? "unknown",
            display_name: n.displayName ?? n.roleId ?? n.nodeId,
          })),
        });
      } catch (err) {
        log.warn({ err, nodeId: node.nodeId }, "Failed to send meeting SSE notification");
      }
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

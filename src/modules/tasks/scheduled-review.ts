/**
 * ScheduledReviewNotifier
 *
 * Checks every 60 seconds whether it is Friday 17:00 local time.
 * When triggered, it collects all tasks in "review" status and posts
 * a weekly review summary to the first available community channel.
 */

import pino from "pino";
import { getDb } from "../../shared/db/connection.js";
import { tasksTable } from "./schema.js";
import { eq } from "drizzle-orm";

const log = pino({ name: "scheduled-review" });

export class ScheduledReviewNotifier {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastTriggered = "";

  start() {
    this.intervalId = setInterval(() => this.check(), 60_000);
    log.info("ScheduledReviewNotifier started (checks every 60s for Friday 17:00)");
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private async check() {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 5=Fri
    const hour = now.getHours();
    const minute = now.getMinutes();
    const dateKey = now.toISOString().split("T")[0];

    // Friday 17:00
    if (day !== 5 || hour !== 17 || minute !== 0) return;
    if (this.lastTriggered === dateKey) return;
    this.lastTriggered = dateKey;

    try {
      await this.sendReviewSummary();
    } catch (err) {
      log.error({ err }, "Failed to send weekly review summary");
    }
  }

  private async sendReviewSummary() {
    const db = getDb();

    // Get all tasks in review status
    const reviewTasks = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.status, "review"));

    if (reviewTasks.length === 0) {
      log.info("No tasks in review status, skipping notification");
      return;
    }

    // Build summary
    const summary = reviewTasks
      .map(
        (t) =>
          `- [${t.taskCode}] ${t.title} (${t.assignedRoleId || "unassigned"})`,
      )
      .join("\n");

    log.info(
      { count: reviewTasks.length },
      "Weekly review summary: %d tasks in review",
      reviewTasks.length,
    );

    // Post to community as system summary
    try {
      const { CommunityService } = await import("../community/service.js");
      const communityService = new CommunityService();

      // Find or use a general channel
      const { communityChannelsTable } = await import(
        "../community/schema.js"
      );
      const channels = await db
        .select()
        .from(communityChannelsTable)
        .limit(1);

      if (channels.length > 0) {
        await communityService.createPost({
          channelId: channels[0].id,
          title: `Weekly Review Summary (${new Date().toLocaleDateString("ja-JP")})`,
          authorNodeId: "system",
          postType: "alert",
          contextData: {
            body: `## Review Tasks: ${reviewTasks.length}\n\n${summary}`,
          },
        });
        log.info("Weekly review summary posted to community");
      }
    } catch (err) {
      log.warn({ err }, "Failed to post review summary to community");
    }
  }
}

import { cronJobs } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { CHECK_INTERVAL_MS } from "./check";

const crons = cronJobs();
// ponytail: hourly per plan (minuteUTC 7); tighten interval only if staleness matters
crons.hourly("recheck-watches", { minuteUTC: 7 }, internal.scanner.tick, {});
export default crons;

/**
 * Atomic claim before run: stamps lastCheckedAt + schedules the check inside
 * one transaction only if the watch is still stale, so overlapping ticks can't
 * double-run the same watch.
 */
export const claimAndRun = internalMutation({
  args: { watchId: v.id("watches") },
  returns: v.null(),
  handler: async (ctx, { watchId }) => {
    const w = await ctx.db.get(watchId);
    const now = Date.now();
    if (!w || w.status !== "active" || now - (w.lastCheckedAt ?? 0) < CHECK_INTERVAL_MS) return null;
    await ctx.db.patch(watchId, { lastCheckedAt: now });
    await ctx.scheduler.runAfter(0, internal.check.runCheck, { watchId });
    return null;
  },
});

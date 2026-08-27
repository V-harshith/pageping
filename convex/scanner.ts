import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";

/** Hourly scanner entrypoint: enqueue a claim-then-check pair per due watch. */
// ponytail: explicit annotations dodge a tsc inference cycle through _generated
export const tick = internalAction({
  args: {},
  returns: v.number(),
  handler: async (ctx): Promise<number> => {
    const due: { watchId: Id<"watches"> }[] = await ctx.runQuery(
      internal.check.dueWatches,
      { limit: 25 },
    );
    for (let i = 0; i < due.length; i++) {
      await ctx.scheduler.runAfter(i * 2000, internal.crons.claimAndRun, {
        watchId: due[i].watchId,
      });
    }
    return due.length;
  },
});

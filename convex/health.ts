import { query } from "./_generated/server";

export const ping = query({
  args: {},
  handler: async () => ({ ok: true, ts: Date.now() }),
});

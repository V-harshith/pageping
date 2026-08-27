import { defineApp } from "convex/server";
import { v } from "convex/values";
import staticHosting from "@convex-dev/static-hosting/convex.config";
import agentMail from "@agentmail/convex/convex.config";
import firecrawl from "@firecrawl/firecrawl-convex/convex.config";

const app = defineApp({
  env: {
    FIRECRAWL_API_KEY: v.string(),
  },
});

app.use(staticHosting);
app.use(agentMail);
// ponytail: no httpPrefix — scrape-only usage, crawls/webhooks unused; add when a crawl feature lands
app.use(firecrawl, {
  env: {
    FIRECRAWL_API_KEY: app.env.FIRECRAWL_API_KEY,
  },
});

export default app;

import { defineApp } from "convex/server";
import staticHosting from "@convex-dev/static-hosting/convex.config";
import agentMail from "@agentmail/convex/convex.config";

const app = defineApp();
app.use(staticHosting);
app.use(agentMail);

export default app;

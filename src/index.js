import { loadPolicy } from "./policy.js";
import { createStore } from "./store.js";
import { createApp } from "./server.js";

const port = Number(process.env.PORT || 8787);
const app = createApp({ store: createStore(), policy: loadPolicy() });

app.listen(port, () => {
  console.log(`GarageGuru API on http://localhost:${port}`);
  console.log("GG-2 booking cancellation demo");
});

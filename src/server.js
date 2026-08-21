import { createServer } from "node:http";
import { evaluateCancel } from "./policy.js";

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

export function createApp({ store, policy }) {
  return createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      return json(res, 204, {});
    }

    const url = new URL(req.url, "http://localhost");

    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, { ok: true, service: "garageguru-api", ticket: "GG-2" });
    }

    if (req.method === "GET" && url.pathname === "/api/policy") {
      return json(res, 200, policy);
    }

    if (req.method === "GET" && url.pathname === "/api/bookings") {
      return json(res, 200, { bookings: store.list() });
    }

    if (req.method === "GET" && url.pathname === "/api/events") {
      return json(res, 200, { events: store.events() });
    }

    const preview = url.pathname.match(/^\/api\/bookings\/([^/]+)\/cancel-preview$/);
    if (req.method === "GET" && preview) {
      const booking = store.get(decodeURIComponent(preview[1]));
      if (!booking) return json(res, 404, { error: "NOT_FOUND" });
      const decision = evaluateCancel(booking, policy);
      return json(res, 200, { booking, decision });
    }

    const cancel = url.pathname.match(/^\/api\/bookings\/([^/]+)\/cancel$/);
    if (req.method === "POST" && cancel) {
      const booking = store.get(decodeURIComponent(cancel[1]));
      if (!booking) return json(res, 404, { error: "NOT_FOUND" });
      const decision = evaluateCancel(booking, policy);
      if (!decision.allowed) {
        return json(res, 409, { error: decision.code, booking, decision });
      }
      let reason = "";
      try {
        const body = await readBody(req);
        reason = body.reason || "";
      } catch {
        return json(res, 400, { error: "INVALID_JSON" });
      }
      store.applyCancel(booking, decision.feePaise, policy);
      return json(res, 200, { booking: store.get(booking.id), decision, reason });
    }

    return json(res, 404, { error: "NO_ROUTE" });
  });
}

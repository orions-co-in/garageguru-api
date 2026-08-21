import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCancel } from "../src/policy.js";
import { createStore } from "../src/store.js";
import { createApp } from "../src/server.js";

const policy = {
  cancellableStatuses: ["pending", "confirmed"],
  blockedStatuses: ["technician_en_route", "in_progress", "completed", "cancelled"],
  cutoffHours: 2,
  lateFeePercent: 50,
  pendingAlwaysFree: true,
  notifyTechnicianIfAssigned: true,
};

function booking(overrides) {
  return {
    id: "BK-TEST",
    status: "confirmed",
    slotStart: new Date(Date.now() + 5 * 36e5).toISOString(),
    amountPaise: 100000,
    technician: "Sanjay",
    garage: "PitStop",
    ...overrides,
  };
}

test("TS-01 pending cancel is free", () => {
  const decision = evaluateCancel(booking({ status: "pending" }), policy);
  assert.equal(decision.allowed, true);
  assert.equal(decision.feePaise, 0);
});

test("TS-02 confirmed 5h away is free", () => {
  const decision = evaluateCancel(booking({ slotStart: new Date(Date.now() + 5 * 36e5).toISOString() }), policy);
  assert.equal(decision.allowed, true);
  assert.equal(decision.feePaise, 0);
});

test("TS-03 confirmed 45m away takes 50% fee", () => {
  const decision = evaluateCancel(
    booking({ slotStart: new Date(Date.now() + 0.75 * 36e5).toISOString() }),
    policy,
  );
  assert.equal(decision.allowed, true);
  assert.equal(decision.feePaise, 50000);
});

test("TS-04 en route is blocked", () => {
  const decision = evaluateCancel(booking({ status: "technician_en_route" }), policy);
  assert.equal(decision.allowed, false);
  assert.equal(decision.code, "NOT_CANCELLABLE");
});

test("TS-05 completed is blocked", () => {
  const decision = evaluateCancel(booking({ status: "completed" }), policy);
  assert.equal(decision.allowed, false);
});

test("TS-06 already cancelled is blocked", () => {
  const decision = evaluateCancel(booking({ status: "cancelled" }), policy);
  assert.equal(decision.allowed, false);
});

test("cancel endpoint records garage and technician events", async () => {
  const store = createStore();
  const app = createApp({ store, policy });
  await new Promise((resolve) => app.listen(0, resolve));
  const { port } = app.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/bookings/BK-1002/cancel`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason: "plans changed" }),
  });
  assert.equal(res.status, 200);
  const events = store.events();
  assert.equal(events.some((e) => e.audience === "garage"), true);
  assert.equal(events.some((e) => e.audience === "technician"), true);
  app.close();
});

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function loadPolicy() {
  const path = join(root, "contracts/cancellation-policy.json");
  return JSON.parse(readFileSync(path, "utf8"));
}

export function hoursUntil(slotStart, now = new Date()) {
  return (new Date(slotStart).getTime() - now.getTime()) / 36e5;
}

export function evaluateCancel(booking, policy, now = new Date()) {
  if (!booking) {
    return { allowed: false, code: "NOT_FOUND", feePaise: 0 };
  }
  if (policy.blockedStatuses.includes(booking.status) || !policy.cancellableStatuses.includes(booking.status)) {
    return { allowed: false, code: "NOT_CANCELLABLE", feePaise: 0 };
  }

  let feePaise = 0;
  if (booking.status === "confirmed") {
    const hours = hoursUntil(booking.slotStart, now);
    if (hours <= policy.cutoffHours) {
      feePaise = Math.round((booking.amountPaise * policy.lateFeePercent) / 100);
    }
  }

  return { allowed: true, code: "OK", feePaise };
}

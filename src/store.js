function hoursFromNow(hours) {
  return new Date(Date.now() + hours * 36e5).toISOString();
}

export function seedBookings() {
  return [
    {
      id: "BK-1001",
      customer: "Ananya M.",
      service: "Periodic service — Hatchback",
      garage: "PitStop HSR",
      technician: null,
      status: "pending",
      slotStart: hoursFromNow(26),
      amountPaise: 249900,
      cancellationFeePaise: 0,
      refundPaise: 0,
      slotReleased: false,
      cancelledAt: null,
    },
    {
      id: "BK-1002",
      customer: "Rahul K.",
      service: "Brake inspection",
      garage: "Metro Auto Koramangala",
      technician: "Sanjay",
      status: "confirmed",
      slotStart: hoursFromNow(5),
      amountPaise: 180000,
      cancellationFeePaise: 0,
      refundPaise: 0,
      slotReleased: false,
      cancelledAt: null,
    },
    {
      id: "BK-1003",
      customer: "Priya S.",
      service: "AC gas refill",
      garage: "PitStop HSR",
      technician: "Imran",
      status: "confirmed",
      slotStart: hoursFromNow(0.75),
      amountPaise: 320000,
      cancellationFeePaise: 0,
      refundPaise: 0,
      slotReleased: false,
      cancelledAt: null,
    },
    {
      id: "BK-1004",
      customer: "Vikram D.",
      service: "Jump start + battery check",
      garage: "Roadside unit — Indiranagar",
      technician: "Naveen",
      status: "technician_en_route",
      slotStart: hoursFromNow(0.1),
      amountPaise: 150000,
      cancellationFeePaise: 0,
      refundPaise: 0,
      slotReleased: false,
      cancelledAt: null,
    },
    {
      id: "BK-1005",
      customer: "Meera L.",
      service: "Full detailing",
      garage: "Metro Auto Koramangala",
      technician: "Sanjay",
      status: "completed",
      slotStart: hoursFromNow(-20),
      amountPaise: 540000,
      cancellationFeePaise: 0,
      refundPaise: 0,
      slotReleased: false,
      cancelledAt: null,
    },
  ];
}

export function createStore() {
  const bookings = seedBookings();
  const events = [];
  return {
    list: () => bookings.map((b) => ({ ...b })),
    get: (id) => bookings.find((b) => b.id === id),
    events: () => events.map((e) => ({ ...e })),
    applyCancel(booking, feePaise, policy) {
      booking.status = "cancelled";
      booking.cancelledAt = new Date().toISOString();
      booking.cancellationFeePaise = feePaise;
      booking.refundPaise = booking.amountPaise - feePaise;
      booking.slotReleased = true;
      events.push({
        type: "booking.cancelled",
        bookingId: booking.id,
        audience: "garage",
        garage: booking.garage,
        at: booking.cancelledAt,
      });
      if (policy.notifyTechnicianIfAssigned && booking.technician) {
        events.push({
          type: "booking.cancelled",
          bookingId: booking.id,
          audience: "technician",
          technician: booking.technician,
          at: booking.cancelledAt,
        });
      }
    },
  };
}

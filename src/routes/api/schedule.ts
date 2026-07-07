import { createAPIFileRoute } from "@tanstack/react-start/api";
import { getTodaySchedule, getNextScheduledTime, type ScheduleSlot } from "~/lib/publisher";
import { execSync } from "node:child_process";

export const APIRoute = createAPIFileRoute("/api/schedule")({
  GET: async ({ request }) => {
    try {
      const slots = await getTodaySchedule();
      const nextScheduled = await getNextScheduledTime();

      return new Response(
        JSON.stringify({ slots, next_scheduled: nextScheduled }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch schedule" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
});
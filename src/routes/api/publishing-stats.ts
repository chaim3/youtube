import { createAPIFileRoute } from "@tanstack/react-start/api";
import { getPublishStats } from "~/lib/publisher";

export const APIRoute = createAPIFileRoute("/api/publishing-stats")({
  GET: async ({ request }) => {
    try {
      const stats = await getPublishStats();
      return new Response(JSON.stringify(stats), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch publishing stats" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
});
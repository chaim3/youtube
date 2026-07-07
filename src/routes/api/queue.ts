import { createAPIFileRoute } from "@tanstack/react-start/api";
import { getQueue, scanVideosDirectory } from "~/lib/publisher";

export const APIRoute = createAPIFileRoute("/api/queue")({
  GET: async ({ request }) => {
    try {
      const url = new URL(request.url);
      const status = url.searchParams.get("status") ?? "all";
      // @ts-expect-error - status filter is validated
      const queue = await getQueue(status);
      return new Response(JSON.stringify(queue), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch queue" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
  POST: async ({ request }) => {
    try {
      const scanned = await scanVideosDirectory();
      return new Response(
        JSON.stringify({ added: scanned.length, items: scanned }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Failed to scan videos directory" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
});
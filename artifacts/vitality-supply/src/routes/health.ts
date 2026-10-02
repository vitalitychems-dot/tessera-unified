import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { getSql } = await import("@/lib/db");
          const sql = await getSql();
          await sql`select 1 as ok`;
          return Response.json({ status: "ok", database: "ok" });
        } catch (error) {
          console.error("[health] database check failed", error instanceof Error ? error.message : "unknown error");
          return Response.json({ status: "degraded", database: "unavailable" }, { status: 503 });
        }
      },
    },
  },
});
/**
 * Heartbeat — Netlify Scheduled Function
 * -----------------------------------------------------------------------
 * Runs every 5 minutes. Picks up queued tasks from Supabase and dispatches
 * them to the agent runner. This is the production runtime engine.
 *
 * Schedule: every 5 minutes
 * Netlify cron syntax: every 5 minutes
 */

import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler() {
  console.log(`[heartbeat] tick at ${new Date().toISOString()}`);

  try {
    // Find queued tasks, ordered by sequence_index then created_at
    // Limit to 5 per tick to avoid overwhelming the system
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select(`
        id,
        project_id,
        agent_id,
        title,
        input_json,
        sequence_index,
        agents!inner(role, company_id, autonomy_level)
      `)
      .eq("status", "queued")
      .order("sequence_index", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(5);

    if (error) {
      console.error("[heartbeat] failed to fetch tasks:", error);
      return;
    }

    if (!tasks || tasks.length === 0) {
      console.log("[heartbeat] no queued tasks");
      return;
    }

    console.log(`[heartbeat] dispatching ${tasks.length} task(s)`);

    // Dispatch each task to the agent runner
    for (const task of tasks) {
      // Mark as in_progress immediately to prevent double-dispatch
      const { error: updateErr } = await supabase
        .from("tasks")
        .update({ status: "in_progress", started_at: new Date().toISOString() })
        .eq("id", task.id)
        .eq("status", "queued"); // optimistic lock

      if (updateErr) {
        console.error(`[heartbeat] failed to claim task ${task.id}:`, updateErr);
        continue;
      }

      // Fire the agent runner (background function — non-blocking)
      const runnerUrl = `${process.env.URL}/.netlify/functions/run-agent-background`;
      try {
        await fetch(runnerUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task_id: task.id }),
        });
        console.log(`[heartbeat] dispatched task ${task.id} (${(task.agents as unknown as { role: string }[])[0]?.role})`);
      } catch (fetchErr) {
        console.error(`[heartbeat] failed to dispatch task ${task.id}:`, fetchErr);
        // Revert to queued so it gets picked up next tick
        await supabase
          .from("tasks")
          .update({ status: "queued", started_at: null })
          .eq("id", task.id);
      }
    }

    console.log(`[heartbeat] done`);
  } catch (err) {
    console.error("[heartbeat] unhandled error:", err);
  }
}

export const config: Config = {
  schedule: "*/5 * * * *",
};

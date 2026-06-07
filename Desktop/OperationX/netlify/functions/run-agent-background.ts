/**
 * Agent Runner — Netlify Background Function
 * -----------------------------------------------------------------------
 * Receives a task_id, loads the task + agent from Supabase, and routes
 * to the correct specialist handler. Writes output_json back to the task.
 *
 * Background functions get up to 15 minutes — enough for any Claude call.
 * Called by: heartbeat (every 5 min)
 */

import type { BackgroundHandler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

// ─── Agent handlers ──────────────────────────────────────────────────────────
import { runProjectManager }     from "./agents/project-manager";
import { runNicheAnalyst }       from "./agents/niche-analyst";
import { runProductBuilder }     from "./agents/product-builder";
import { runCopySpecialist }     from "./agents/copy-specialist";
import { runLaunchManager }      from "./agents/launch-manager";
import { runPerformanceAnalyst } from "./agents/performance-analyst";
import { runCustomerSuccess }    from "./agents/customer-success";

// ─── Clients ─────────────────────────────────────────────────────────────────

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AgentContext {
  taskId: string;
  projectId: string;
  agentId: string;
  agentRole: string;
  companyId: string;
  autonomyLevel: number;
  title: string;
  input: Record<string, unknown>;
}

export interface AgentResult {
  success: boolean;
  output: Record<string, unknown>;
  nextStatus: "done" | "blocked" | "awaiting_approval" | "failed";
  blockedReason?: string;
  approvalRequest?: {
    type: string;
    summary: string;
    details: object;
    recommendation: string;
  };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export const handler: BackgroundHandler = async (event) => {
  let taskId: string;
  try {
    const body = JSON.parse(event.body ?? "{}");
    taskId = body.task_id;
    if (!taskId) throw new Error("task_id required");
  } catch (err) {
    console.error("[run-agent] bad request:", err);
    return;
  }

  // ── Load task + agent ─────────────────────────────────────────────────────
  const { data: task, error: taskErr } = await supabase
    .from("tasks")
    .select(`
      id, project_id, agent_id, title, input_json, status,
      agents!inner(role, company_id, autonomy_level)
    `)
    .eq("id", taskId)
    .single();

  if (taskErr || !task) {
    console.error(`[run-agent] task ${taskId} not found:`, taskErr);
    return;
  }

  if (task.status !== "in_progress") {
    console.warn(`[run-agent] task ${taskId} is ${task.status}, skipping`);
    return;
  }

  const agent = task.agents as unknown as { role: string; company_id: string; autonomy_level: number };
  const ctx: AgentContext = {
    taskId:        task.id,
    projectId:     task.project_id,
    agentId:       task.agent_id,
    agentRole:     agent.role,
    companyId:     agent.company_id,
    autonomyLevel: agent.autonomy_level,
    title:         task.title,
    input:         task.input_json as Record<string, unknown>,
  };

  console.log(`[run-agent] running ${ctx.agentRole} on task "${ctx.title}"`);

  // ── Route to specialist ───────────────────────────────────────────────────
  let result: AgentResult;
  try {
    switch (ctx.agentRole) {
      case "project_manager":
        result = await runProjectManager(ctx);
        break;
      case "niche_analyst":
        result = await runNicheAnalyst(ctx);
        break;
      case "product_builder":
        result = await runProductBuilder(ctx);
        break;
      case "copy_specialist":
        result = await runCopySpecialist(ctx);
        break;
      case "launch_manager":
        result = await runLaunchManager(ctx);
        break;
      case "performance_analyst":
        result = await runPerformanceAnalyst(ctx);
        break;
      case "customer_success":
        result = await runCustomerSuccess(ctx);
        break;
      default:
        result = {
          success: false,
          output: { error: `Unknown agent role: ${ctx.agentRole}` },
          nextStatus: "failed",
        };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[run-agent] ${ctx.agentRole} threw:`, msg);
    result = {
      success: false,
      output: { error: msg },
      nextStatus: "failed",
    };
  }

  // ── Write result back to task ─────────────────────────────────────────────
  const update: Record<string, unknown> = {
    status:       result.nextStatus,
    output_json:  result.output,
    completed_at: ["done", "failed"].includes(result.nextStatus)
      ? new Date().toISOString()
      : null,
  };
  if (result.blockedReason) update.blocked_reason = result.blockedReason;

  await supabase.from("tasks").update(update).eq("id", taskId);

  // ── Log event ─────────────────────────────────────────────────────────────
  await supabase.from("events").insert({
    company_id:   ctx.companyId,
    project_id:   ctx.projectId,
    task_id:      ctx.taskId,
    agent_id:     ctx.agentId,
    type:         result.success ? "task_completed" : "alert",
    summary:      result.success
      ? `${ctx.agentRole} completed: ${ctx.title}`
      : `${ctx.agentRole} failed: ${ctx.title}`,
    payload_json: result.output,
    severity:     result.success ? "info" : "error",
  });

  // ── Auto-create approval if needed ────────────────────────────────────────
  if (result.nextStatus === "awaiting_approval" && result.approvalRequest) {
    await supabase.from("approvals").insert({
      company_id:           ctx.companyId,
      project_id:           ctx.projectId,
      task_id:              ctx.taskId,
      agent_id:             ctx.agentId,
      type:                 result.approvalRequest.type,
      request_summary:      result.approvalRequest.summary,
      request_details_json: result.approvalRequest.details,
      agent_recommendation: result.approvalRequest.recommendation,
    });
  }

  console.log(`[run-agent] task ${taskId} → ${result.nextStatus}`);
};

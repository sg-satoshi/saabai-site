import { createTask, getTask, listTasks, completeTask, failTask, updateTask } from "../../../lib/agent-queue";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const status = searchParams.get("status") as any;

  if (id) {
    const task = await getTask(id);
    return task ? Response.json(task) : Response.json({ error: "Not found" }, { status: 404 });
  }

  const tasks = await listTasks(status || undefined, 50);
  return Response.json({ tasks });
}

export async function POST(req: Request) {
  const body = await req.json();
  const id = await createTask(body.agentType, body.goal, body.context || {});
  return Response.json({ id, status: "pending" });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, status, result, error, progress } = body;

  if (status === "completed") await completeTask(id, result || "");
  else if (status === "failed") await failTask(id, error || "Unknown error");
  else await updateTask(id, { status, progress, result });

  return Response.json({ ok: true });
}

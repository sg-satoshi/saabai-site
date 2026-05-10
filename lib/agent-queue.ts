import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface AgentTask {
  id: string;
  agentType: string;
  status: TaskStatus;
  goal: string;
  context: Record<string, unknown>;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: string;
  error?: string;
  progress?: number;
  checkpoint?: Record<string, unknown>;
}

export async function createTask(
  agentType: string,
  goal: string,
  context: Record<string, unknown> = {}
): Promise<string> {
  const id = `task:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  const task: AgentTask = {
    id,
    agentType,
    status: "pending",
    goal,
    context,
    createdAt: Date.now(),
  };
  await redis.lpush("agent:tasks:pending", id);
  await redis.set(`agent:task:${id}`, JSON.stringify(task), { ex: 86400 * 7 });
  return id;
}

export async function getTask(id: string): Promise<AgentTask | null> {
  const data = await redis.get<string>(`agent:task:${id}`);
  return data ? JSON.parse(data) : null;
}

export async function updateTask(id: string, updates: Partial<AgentTask>): Promise<void> {
  const existing = await getTask(id);
  if (!existing) return;
  const updated = { ...existing, ...updates };
  await redis.set(`agent:task:${id}`, JSON.stringify(updated), { ex: 86400 * 7 });
}

export async function claimNextTask(agentType?: string): Promise<AgentTask | null> {
  const id = await redis.rpop("agent:tasks:pending");
  if (!id) return null;
  const task = await getTask(id as string);
  if (!task) return null;
  if (agentType && task.agentType !== agentType) {
    await redis.lpush("agent:tasks:pending", id);
    return null;
  }
  await updateTask(id as string, { status: "running", startedAt: Date.now() });
  return task;
}

export async function completeTask(id: string, result: string): Promise<void> {
  await updateTask(id, { status: "completed", completedAt: Date.now(), result });
  await redis.lpush("agent:tasks:completed", id);
}

export async function failTask(id: string, error: string): Promise<void> {
  await updateTask(id, { status: "failed", completedAt: Date.now(), error });
  await redis.lpush("agent:tasks:failed", id);
}

export async function saveCheckpoint(id: string, checkpoint: Record<string, unknown>): Promise<void> {
  await updateTask(id, { checkpoint });
}

export async function listTasks(status?: TaskStatus, limit = 50): Promise<AgentTask[]> {
  const key = status ? `agent:tasks:${status}` : "agent:tasks:pending";
  const ids = await redis.lrange(key, 0, limit - 1);
  const tasks = await Promise.all(ids.map(id => getTask(id as string)));
  return tasks.filter((t): t is AgentTask => t !== null);
}

/**
 * Real-time analytics endpoint for Rex lead monitoring.
 * 
 * Returns live metrics for the analytics dashboard:
 * - Lead count and rate
 * - Response time metrics (P95, P99)
 * - Health status (RED if conversion <35% or response time >2.5s)
 */

import { Redis } from "@upstash/redis";

export const runtime = "edge";

// ── Redis client ──────────────────────────────────────────────────────────────

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// ── Key names ─────────────────────────────────────────────────────────────────

const K = {
  total:            "rex:stats:total",
  withEmail:        "rex:stats:with_email",
  withPrice:        "rex:stats:with_price",
  responseTimesMs:  "rex:metrics:response_times_list", // List of response times (JSON)
  lastHourTotal:    "rex:realtime:last_hour",          // Rolling counter for last hour
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RealtimeMetrics {
  totalLeads: number;
  leadsWithEmail: number;
  leadsWithPrice: number;
  conversionRate: number; // percentage (0-100)
  avgResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
  leadsLastHour: number;
  healthStatus: "GREEN" | "YELLOW" | "RED";
  healthReason: string;
  timestamp: string;
}

// ── Metrics calculation ───────────────────────────────────────────────────────

async function getRealtimeMetrics(): Promise<RealtimeMetrics> {
  const redis = getRedis();
  
  const empty: RealtimeMetrics = {
    totalLeads: 0,
    leadsWithEmail: 0,
    leadsWithPrice: 0,
    conversionRate: 0,
    avgResponseTimeMs: 0,
    p95ResponseTimeMs: 0,
    p99ResponseTimeMs: 0,
    leadsLastHour: 0,
    healthStatus: "GREEN",
    healthReason: "No data",
    timestamp: new Date().toISOString(),
  };
  
  if (!redis) return empty;
  
  try {
    // Fetch all metrics in parallel
    const [
      totalLeads,
      leadsWithEmail,
      leadsWithPrice,
      responseTimesRaw,
      leadsLastHour,
    ] = await Promise.all([
      redis.get<number>(K.total),
      redis.get<number>(K.withEmail),
      redis.get<number>(K.withPrice),
      redis.lrange<string>(K.responseTimesMs, 0, -1),
      redis.get<number>(K.lastHourTotal),
    ]);
    
    const total = totalLeads ?? 0;
    const email = leadsWithEmail ?? 0;
    const price = leadsWithPrice ?? 0;
    const hourly = leadsLastHour ?? 0;
    
    // Calculate conversion rate (email capture rate)
    const conversionRate = total > 0 ? Math.round((email / total) * 100) : 0;
    
    // Extract response time percentiles from list
    let avgResponseTimeMs = 0;
    let p95ResponseTimeMs = 0;
    let p99ResponseTimeMs = 0;
    
    if (responseTimesRaw && responseTimesRaw.length > 0) {
      try {
        const times = responseTimesRaw
          .map(r => {
            try { return parseInt(r, 10); } catch { return 0; }
          })
          .filter(t => t > 0);
        
        if (times.length > 0) {
          const sorted = [...times].sort((a, b) => a - b);
          avgResponseTimeMs = Math.round(
            sorted.reduce((a, b) => a + b, 0) / sorted.length
          );
          
          const p95Idx = Math.ceil((95 / 100) * sorted.length) - 1;
          const p99Idx = Math.ceil((99 / 100) * sorted.length) - 1;
          
          p95ResponseTimeMs = sorted[Math.min(p95Idx, sorted.length - 1)] ?? 0;
          p99ResponseTimeMs = sorted[Math.min(p99Idx, sorted.length - 1)] ?? 0;
        }
      } catch {
        // Silently handle errors in metrics calculation
      }
    }
    
    // ── Determine health status ─────────────────────────────────────────────
    let healthStatus: "GREEN" | "YELLOW" | "RED" = "GREEN";
    let healthReason = "All systems nominal";
    
    // RED if conversion rate < 35% (not capturing emails effectively)
    if (conversionRate < 35 && total > 5) {
      healthStatus = "RED";
      healthReason = `Conversion rate ${conversionRate}% below 35% threshold`;
    }
    // RED if response time > 2500ms (slow processing)
    else if (p95ResponseTimeMs > 2500) {
      healthStatus = "RED";
      healthReason = `P95 response time ${p95ResponseTimeMs}ms exceeds 2.5s threshold`;
    }
    // YELLOW for borderline conditions
    else if (
      (conversionRate < 50 && total > 5) ||
      (p95ResponseTimeMs > 2000 && p95ResponseTimeMs <= 2500)
    ) {
      healthStatus = "YELLOW";
      healthReason = `Approaching thresholds: conversion ${conversionRate}%, P95 ${p95ResponseTimeMs}ms`;
    }
    
    return {
      totalLeads: total,
      leadsWithEmail: email,
      leadsWithPrice: price,
      conversionRate,
      avgResponseTimeMs,
      p95ResponseTimeMs,
      p99ResponseTimeMs,
      leadsLastHour: hourly,
      healthStatus,
      healthReason,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[rex-analytics/realtime]", err);
    return empty;
  }
}

// ── API Handler ───────────────────────────────────────────────────────────────

export async function GET() {
  const metrics = await getRealtimeMetrics();
  
  return Response.json(metrics, {
    headers: {
      "Cache-Control": "no-cache, no-store, max-age=0",
      "Content-Type": "application/json",
    },
  });
}

/**
 * Internal: Track response time for a request.
 * Call this after processing a lead to record performance metrics.
 */
export async function trackResponseTime(durationMs: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  
  try {
    const pipeline = redis.pipeline();
    
    // Add to response time list (LPUSH adds to head, newest first)
    pipeline.lpush(K.responseTimesMs, String(Math.round(durationMs)));
    
    // Trim to keep last 1000 measurements (for memory efficiency)
    // This keeps indices 0-999, removes everything else (1000+)
    pipeline.ltrim(K.responseTimesMs, 0, 999);
    
    // Increment hourly counter (will expire after 1 hour)
    pipeline.incr(K.lastHourTotal);
    pipeline.expire(K.lastHourTotal, 3600);
    
    await pipeline.exec();
  } catch {
    // Never throw — this is metrics, not critical path
  }
}

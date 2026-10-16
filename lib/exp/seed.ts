import type { Experiment } from "./core";

/**
 * Built-in config, used when Redis has nothing (and lazily written to Redis on first render).
 * Redis hash saabai:exp:<siteKey>, field = experiment id, value = JSON. Edit there to change copy live.
 * The control is the live headline, byte for byte.
 */
export const SEED_EXPERIMENTS: Experiment[] = [
  {
    id: "home-hero-headline",
    siteKey: "saabai",
    slot: "home.hero.headline",
    path: "/",
    status: "running",
    defaultVariantId: "a",
    variants: [
      { id: "a", text: "Know exactly where AI will", emphasis: "save your business hours, in 48\u00a0hours.", active: true },
      { id: "b", text: "Stop guessing where AI fits.", emphasis: "Get a clear plan for your business in 48\u00a0hours.", active: true },
      { id: "c", text: "See which jobs AI can take off your plate,", emphasis: "with a clear plan in 48\u00a0hours.", active: true },
    ],
  },
];

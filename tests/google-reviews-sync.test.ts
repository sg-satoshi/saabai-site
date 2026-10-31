/** Google review carousel sync: merge, Places field mask, missing key, cron auth. No network. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CAROUSELS } from "../lib/reviews/catalog";
import { loadCarousel } from "../lib/reviews/load";
import { mergeReviews, sameReview } from "../lib/reviews/merge";
import { fetchPlaceReviews, GOOGLE_PLACES_API_KEY_ENV, PLACE_DETAILS_FIELD_MASK, PLACES_API, TEXT_SEARCH_FIELD_MASK } from "../lib/reviews/places";

const read = (p: string) => readFileSync(p, "utf8");

test("new 4 and 5 star reviews are appended and duplicates are skipped", () => {
  const existing = [
    { name: "Anna Langston", stars: 5, text: "Nick is professional, knowledgeable, and was helpful.", date: "October 2026" },
  ];
  const merged = mergeReviews(existing, [
    { name: "anna   langston", stars: 5, text: "Nick is professional, knowledgeable, and was helpful. Extra words." },
    { name: "Pat", stars: 3, text: "It was fine but I would not recommend the wait." },
    { name: "Sam Lee", stars: 4, text: "Clear advice and a quick approval.", date: "a week ago" },
    { name: "Sam Lee", stars: 5, text: "Clear advice and a quick approval." },
  ]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].name, "Anna Langston");
  assert.equal(merged[1].name, "Sam Lee");
  assert.equal(merged[1].stars, 4);
  assert.equal(sameReview(merged[0], { name: "Anna Langston", text: "Nick is professional, knowledgeable, and was helpful. Extra words." }), true);
});

test("Places details asks only for reviews, rating and count", async () => {
  const calls: { url: string; mask: string | null; method: string }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, mask: new Headers(init?.headers).get("X-Goog-FieldMask"), method: init?.method || "GET" });
    if (url.endsWith(":searchText")) {
      return new Response(JSON.stringify({ places: [{ id: "ChIJtest" }] }), { status: 200 });
    }
    return new Response(JSON.stringify({
      rating: 5,
      userRatingCount: 8,
      reviews: [
        { rating: 5, relativePublishTimeDescription: "a week ago", text: { text: "Brand new five star review about the loan." }, authorAttribution: { displayName: "New Client" } },
        { rating: 2, text: { text: "Too slow for me and I would not go back." }, authorAttribution: { displayName: "Unhappy" } },
        { rating: 5, text: { text: "Nick is professional, knowledgeable, and was helpful throughout." }, authorAttribution: { displayName: "Anna Langston" } },
      ],
    }), { status: 200 });
  };
  const pull = await fetchPlaceReviews({ key: "test-key", textQuery: "Lifestyle Money Management Adelaide", fetchImpl });
  assert.equal(pull.ok, true);
  if (pull.ok) {
    assert.equal(pull.placeId, "ChIJtest");
    assert.equal(pull.count, 8);
    assert.equal(pull.reviews.length, 2);
    assert.equal(pull.reviews[0].name, "New Client");
  }
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].url, `${PLACES_API}/places:searchText`);
  assert.equal(calls[0].mask, TEXT_SEARCH_FIELD_MASK);
  assert.equal(calls[1].mask, PLACE_DETAILS_FIELD_MASK);
  assert.match(calls[1].url, /\/places\/ChIJtest$/);
  const body = JSON.stringify(calls);
  assert.equal(body.includes("test-key"), false);
});

test("without a key the carousel stays on the stored reviews and does not call Google", async () => {
  let called = 0;
  const fetchImpl: typeof fetch = async () => { called++; return new Response("no"); };
  const lmm = await loadCarousel("lmm-site", { key: null, fetchImpl });
  assert.ok(lmm);
  assert.equal(lmm?.sync, "missing-key");
  assert.equal(lmm?.synced, false);
  assert.equal(lmm?.reviews.length, 7);
  assert.equal(lmm?.count, 7);
  assert.equal(called, 0);
  const stu = await loadCarousel("cycle-repair", { key: null, fetchImpl });
  assert.equal(stu?.reviews.length, CAROUSELS.find((s) => s.slug === "cycle-repair")?.stored().reviews.length);
  assert.equal(called, 0);
  assert.equal(GOOGLE_PLACES_API_KEY_ENV, "GOOGLE_PLACES_API_KEY");
});

test("a Places review that is not already stored is added, and the Google total can rise", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith(":searchText")) return new Response(JSON.stringify({ places: [{ id: "ChIJlmm" }] }), { status: 200 });
    return new Response(JSON.stringify({
      rating: 5,
      userRatingCount: 8,
      reviews: [
        { rating: 5, relativePublishTimeDescription: "3 days ago", text: { text: "Eighth review text that is not in the stored file at all." }, authorAttribution: { displayName: "Eighth Reviewer" } },
      ],
    }), { status: 200 });
  };
  const lmm = await loadCarousel("lmm-site", { key: "test-key", fetchImpl, now: new Date("2026-10-31T00:00:00Z") });
  assert.equal(lmm?.sync, "places");
  assert.equal(lmm?.reviews.length, 8);
  assert.equal(lmm?.reviews[7].name, "Eighth Reviewer");
  assert.equal(lmm?.count, 8);
  assert.equal(lmm?.updated, "2026-10-31");
  const names = lmm?.reviews.map((r) => r.name);
  assert.equal(names?.filter((n) => n === "Anna Langston").length, 1);
});

test("the cron route is secret-gated and the carousel list is the default set", async () => {
  const prev = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  try {
    const { GET } = await import("../app/api/cron/google-reviews/route");
    const res = await GET(new Request("http://localhost/api/cron/google-reviews", { headers: { authorization: "Bearer undefined" } }));
    assert.equal(res.status, 401);
  } finally {
    if (prev === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prev;
  }
  const slugs = CAROUSELS.map((s) => s.slug);
  assert.deepEqual(slugs, ["lmm-site", "cycle-repair"]);
  const cron = read("app/api/cron/google-reviews/route.ts");
  assert.match(cron, /CRON_SECRET/);
  assert.match(cron, /revalidateTag/);
  const vercel = read("vercel.json");
  assert.match(vercel, /\/api\/cron\/google-reviews/);
  assert.match(vercel, /15 18 \* \* \*/);
  const proxy = read("proxy.ts");
  assert.match(proxy, /\/api\/reviews/);
  const config = read("next.config.ts");
  assert.match(config, /\/clients\/lmm-site\/assets\/reviews\.json/);
  assert.match(config, /\/api\/reviews\/lmm-site/);
  const page = read("public/clients/lmm-site/index.html");
  assert.match(page, /\/clients\/lmm-site\/assets\/reviews\.json/);
  const widget = read("app/sites/cycle-repair/ReviewsCarousel.tsx");
  assert.match(widget, /\/api\/reviews\/cycle-repair/);
  const stored = read("public/clients/lmm-site/assets/reviews.json");
  assert.equal(JSON.parse(stored).reviews.length, 7);
});

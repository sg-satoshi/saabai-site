import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAPS_PROFILES,
  activeMapsProfiles,
  directionsUrl,
  embedApiUrl,
  embedKeylessUrl,
  localBusinessFromProfile,
  resolveEmbedSrc,
  writeReviewUrl,
} from "../lib/maps";

describe("maps pack profiles", () => {
  it("excludes Heaven Thai from active profiles", () => {
    assert.equal(MAPS_PROFILES["heaven-thai-massage"]?.excluded, true);
    assert.ok(!activeMapsProfiles().some((p) => p.slug === "heaven-thai-massage"));
  });

  it("keeps Saabai and SUNDER as service-area with no GBP sameAs", () => {
    const saabai = localBusinessFromProfile(MAPS_PROFILES.saabai);
    const sunder = localBusinessFromProfile(MAPS_PROFILES.sunder);
    assert.equal(MAPS_PROFILES.saabai.mode, "service-area");
    assert.equal(MAPS_PROFILES.sunder.mode, "service-area");
    assert.ok(!JSON.stringify(saabai).includes("maps.google"));
    assert.ok(!JSON.stringify(sunder).toLowerCase().includes("place_id"));
    assert.deepEqual(saabai.sameAs, ["https://www.linkedin.com/in/shanegoldberg-ai"]);
  });

  it("gives Stu a verified placeId, review link, and no shopfront embed", () => {
    const stu = MAPS_PROFILES["cycle-repair"];
    assert.equal(stu.placeId, "ChIJMTybEAUCkWsRN6_ET-Nqjus");
    assert.equal(stu.mode, "service-area");
    assert.equal(resolveEmbedSrc(stu, "fake-key"), null);
    assert.equal(
      writeReviewUrl(stu.placeId!),
      "https://search.google.com/local/writereview?placeid=ChIJMTybEAUCkWsRN6_ET-Nqjus",
    );
    const ld = localBusinessFromProfile(stu);
    assert.ok(String(ld.hasMap).includes("kgmid"));
    assert.ok((ld.sameAs as string[]).some((u) => u.includes("google.com/search")));
    assert.equal((ld.address as { streetAddress?: string })?.streetAddress, undefined);
  });

  it("builds Tributum shopfront embed and directions from verified address", () => {
    const trib = MAPS_PROFILES["tributum-law-v2"];
    assert.equal(trib.mode, "shopfront");
    assert.ok(trib.address?.streetAddress?.includes("Victoria Square"));
    const keyless = embedKeylessUrl(trib);
    assert.ok(keyless?.includes("output=embed"));
    assert.ok(keyless?.includes("Victoria"));
    const api = embedApiUrl(trib, "TESTKEY");
    assert.ok(api?.includes("key=TESTKEY"));
    assert.ok(api?.includes("maps/embed/v1/place"));
    const dir = directionsUrl(trib);
    assert.ok(dir?.includes("/maps/dir/"));
    const ld = localBusinessFromProfile(trib);
    assert.equal((ld.address as { postalCode: string }).postalCode, "5000");
    assert.ok(ld.hasMap);
    assert.ok(ld.openingHoursSpecification);
  });

  it("does not invent InkFX placeId or Blue Sky NAP", () => {
    assert.equal(MAPS_PROFILES["inkfx-printing"].placeId, undefined);
    assert.ok(MAPS_PROFILES["inkfx-printing"].todos.length > 0);
    assert.equal(MAPS_PROFILES["blue-sky-plumbing"].mode, "service-area");
    assert.ok(MAPS_PROFILES["blue-sky-plumbing"].todos.some((t) => /placeholder|Demo/i.test(t)));
  });

  it("contains no em dashes in profile copy", () => {
    const blob = JSON.stringify(MAPS_PROFILES);
    assert.ok(!blob.includes("\u2014"));
  });
});

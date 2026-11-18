import assert from "node:assert/strict";
import { publishSendingDomain } from "./sending_records.ts";

const calls: Array<{ method: string; path: string; body?: string }> = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  calls.push({ method: init?.method ?? "", path: url.pathname, body: init?.body as string | undefined });
  const data = url.pathname === "/v1/dns/domain/add" ? { zone_id: "zone-learning" } : url.pathname === "/v1/email/domain/verify" ? { verification: { status: "verified" } } : {};
  return new Response(JSON.stringify({ ok: true, data, metadata: {} }), { status: 200, headers: { "content-type": "application/json" } });
};
process.env.INFRAI_API_KEY = "test-key";
const result = await publishSendingDomain({ domain: "mail.learning-garden.org", dkimName: "selector1._domainkey.mail.learning-garden.org", dkimValue: "v=DKIM1; p=test" });
assert.equal(result.recordsPublished, 3);
assert.equal(result.verificationStatus, "verified");
assert.equal(calls.filter((call) => call.path === "/v1/dns/record/upsert").length, 3);
assert.ok(calls.every((call) => call.method));
globalThis.fetch = originalFetch;
console.log("sending-records decision test passed");

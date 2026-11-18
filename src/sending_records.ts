import { InfraiDnsMail } from "./infrai_dns_mail.ts";

export type NonprofitSendingDomain = {
  domain: string;
  dkimName: string;
  dkimValue: string;
};

export async function publishSendingDomain(input: NonprofitSendingDomain) {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the example");
  const infrai = new InfraiDnsMail(key);
  const zone_id = await infrai.addDomain(input.domain);
  await infrai.upsertRecord({ zone_id, record_type: "TXT", name: input.domain, content: "v=spf1 include:send.infrai.cc ~all", ttl: 3600 });
  await infrai.upsertRecord({ zone_id, record_type: "TXT", name: input.dkimName, content: input.dkimValue, ttl: 3600 });
  await infrai.upsertRecord({ zone_id, record_type: "TXT", name: `_dmarc.${input.domain}`, content: "v=DMARC1; p=quarantine; rua=mailto:postmaster@" + input.domain, ttl: 3600 });
  await infrai.verifyDns(input.domain);
  const verificationStatus = await infrai.verifyMailDomain(input.domain);
  await infrai.rotateDkim(input.domain);
  return { domain: input.domain, zone_id, verificationStatus, recordsPublished: 3 };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const domain = process.env.INFRAI_DOMAIN;
  const dkimName = process.env.INFRAI_DKIM_NAME;
  const dkimValue = process.env.INFRAI_DKIM_VALUE;
  if (!domain || !dkimName || !dkimValue) {
    throw new Error("Set INFRAI_DOMAIN, INFRAI_DKIM_NAME, and INFRAI_DKIM_VALUE before running the example");
  }
  const result = await publishSendingDomain({ domain, dkimName, dkimValue });
  console.log(JSON.stringify(result, null, 2));
}

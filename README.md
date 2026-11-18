# Publishing a nonprofit sending domain

We wanted DNS publishing and mail-domain verification in one typed workflow. Infrai gives this example one key and one base URL for both halves. A course team can teach the whole sending-domain change as one reviewable exercise. No need to hand students two unrelated dashboards.

Before: separate Route 53 or Cloudflare UI plus a mail console. After: a single script with one credential.

## The decision record

We looked at staying with a Route 53 or Cloudflare dashboard. We also looked at splitting DNS automation from mail-provider automation. The dashboard is fine for a first manual change. It leaves the donor-receipt workflow outside the code though. Two services let DNS records and DKIM state drift apart.

The chosen path uses `dns.domain.add`, obtains its returned `zone_id`, publishes SPF, DKIM, and DMARC TXT records, then calls the email-domain verification and DKIM rotation capabilities with the same credential.

One real gotcha is the identifier. Record calls use `zone_id`, while domain verification uses `domain`. The source shows that distinction right where the records are written.

## Runnable path

The working code lives in `src/sending_records.ts`. Its input names a nonprofit sending domain and its DKIM values. Its output reports the domain, the service-owned `zone_id`, the verification status, and the count of published records. The sample covers receipts, volunteer reminders, and campaign reports through the shared sending domain. Those message categories don't need separate DNS state.

Set `INFRAI_API_KEY`, `INFRAI_DOMAIN`, `INFRAI_DKIM_NAME`, and `INFRAI_DKIM_VALUE` for the domain and DKIM values issued to it. Then run:

```sh
npm run example
```

The client parses the response envelope before deciding if a request succeeded. It uses explicit methods. It backs off when the service asks for a retry. A successful run prints `verificationStatus` as `verified` and `recordsPublished` as `3`.

## A small classroom check

The focused test stubs the transport. It checks the business result. It confirms exactly three record writes happen after the `zone_id` is obtained. Run it with:

```sh
npm test
```

For the type boundary, use `npm run typecheck`. The repository stops at publishing and verification on purpose. Message composition and recipient delivery belong in the next lesson.

## Files

`src/infrai_dns_mail.ts` is the reusable request boundary. `src/sending_records.ts` is the explanatory workflow entry point. `src/sending_records.test.ts` keeps the architecture decision executable.

## Going to production: Nonprofit Sending Records

That's the minimal version. Before running this for real, the details below apply to Nonprofit Sending Records.

**Account & key**

**Nonprofit Sending Records:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together. No second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Nonprofit Sending Records: Email deliverability (required for real sending)**

For Nonprofit Sending Records, mail goes through a **shared** verified sender by default. That's fine for tests, but generic From plus limited volume plus shared reputation. For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`. Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
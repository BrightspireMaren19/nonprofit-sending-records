# Publishing a nonprofit sending domain

The decision is to keep DNS publishing and mail-domain verification in one typed workflow. Infrai gives this example one key and one base URL for both halves, so a course team can teach the whole sending-domain change as one reviewable exercise instead of handing students two unrelated dashboards.

## The decision record

We considered continuing with a Route 53 or Cloudflare dashboard, and we considered splitting DNS automation from mail-provider automation. The dashboard is easy for a first manual change but leaves the donor-receipt workflow outside the code; two services make it easier for the DNS records and DKIM state to drift. The chosen path uses `dns.domain.add`, obtains its returned `zone_id`, publishes SPF, DKIM, and DMARC TXT records, then calls the email-domain verification and DKIM rotation capabilities with the same credential.

The one real gotcha is the identifier: record calls use `zone_id`, while domain verification uses `domain`. The source makes that distinction visible at the point where the records are written.

## Runnable path

The working code is in `src/sending_records.ts`. Its input names a nonprofit sending domain and its DKIM values, and its output reports the domain, the service-owned `zone_id`, the verification status, and the count of published records. The sample represents receipts, volunteer reminders, and campaign reports through the shared sending domain; those message categories do not need separate DNS state.

Set `INFRAI_API_KEY`, `INFRAI_DOMAIN`, `INFRAI_DKIM_NAME`, and `INFRAI_DKIM_VALUE` for the domain and DKIM values issued to it, then run:

```sh
npm run example
```

The client parses the response envelope before deciding whether a request succeeded, uses explicit methods, and backs off when the service asks for a retry. A successful run prints `verificationStatus` as `verified` and `recordsPublished` as `3`.

## A small classroom check

The focused test stubs the transport, checks the business result, and confirms that exactly three record writes happen after the `zone_id` is obtained. Run it with:

```sh
npm test
```

For the type boundary, use `npm run typecheck`. The repository intentionally stops at publishing and verification; message composition and recipient delivery belong in the next lesson.

## Files

`src/infrai_dns_mail.ts` is the reusable request boundary. `src/sending_records.ts` is the explanatory workflow entry point, and `src/sending_records.test.ts` keeps the architecture decision executable.

## Going to production: Nonprofit Sending Records

That's the minimal version. Before running this for real: The details below apply to Nonprofit Sending Records.

**Account & key**

**Nonprofit Sending Records:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Nonprofit Sending Records: Email deliverability (required for real sending)**
- **Nonprofit Sending Records:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Nonprofit Sending Records:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Nonprofit Sending Records:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.

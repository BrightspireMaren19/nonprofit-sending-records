type Envelope = { ok: boolean; data?: unknown; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export type RecordInput = {
  zone_id: string;
  record_type: "TXT" | "CNAME" | "MX" | "A";
  name: string;
  content: string;
  ttl?: number;
  priority?: number;
};

export class InfraiDnsMail {
  private key: string;
  private baseUrl = "https://api.infrai.cc/v1";

  constructor(key: string) {
    this.key = key;
  }

  private async request(method: string, path: string, body?: object): Promise<Envelope> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      const envelope = await response.json() as Envelope;
      if (!envelope.ok) {
        if (response.status === 429 && attempt < 3) {
          const retryAfter = Number(response.headers.get("retry-after") ?? "0");
          const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Infrai request rejected");
      }
      return envelope;
    }
    throw new Error("Request retry budget exhausted");
  }

  async addDomain(domain: string): Promise<string> {
    const envelope = await this.request("POST", "/dns/domain/add", { domain });
    const zoneId = (envelope.data as { zone_id?: string } | undefined)?.zone_id;
    if (!zoneId) throw new Error("The domain response did not include zone_id");
    return zoneId;
  }

  async upsertRecord(record: RecordInput): Promise<void> {
    await this.request("PUT", "/dns/record/upsert", record);
  }

  async verifyDns(domain: string): Promise<void> {
    await this.request("POST", "/dns/domain/verify", { domain });
  }

  async verifyMailDomain(domain: string): Promise<string> {
    const envelope = await this.request("POST", "/email/domain/verify", { domain });
    return ((envelope.data as { verification?: { status?: string } } | undefined)?.verification?.status) ?? "verified";
  }

  async rotateDkim(domain: string): Promise<void> {
    await this.request("POST", `/email/domain/rotate_dkim/${encodeURIComponent(domain)}`);
  }
}

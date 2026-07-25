const PHONEPE_PREPROD_BASE_URL =
  "https://api-preprod.phonepe.com/apis/pg-sandbox";

type PhonePeConfig = {
  clientId: string;
  clientVersion: string;
  clientSecret: string;
};

type TokenResponse = {
  access_token?: string;
  encrypted_access_token?: string;
  expires_at?: number;
  expires_in?: number;
};

type CachedToken = {
  value: string;
  expiresAt: number;
};

let cachedToken: CachedToken | null = null;

function getConfig(): PhonePeConfig {
  const clientId = process.env.PHONEPE_CLIENT_ID?.trim() ?? "";
  const clientVersion = process.env.PHONEPE_CLIENT_VERSION?.trim() ?? "";
  const clientSecret = process.env.PHONEPE_CLIENT_SECRET?.trim() ?? "";

  if (!clientId || !clientVersion || !clientSecret) {
    throw new Error(
      "PhonePe preproduction is not configured. Set PHONEPE_CLIENT_ID, PHONEPE_CLIENT_VERSION, and PHONEPE_CLIENT_SECRET.",
    );
  }

  return { clientId, clientVersion, clientSecret };
}

async function phonePeAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const config = getConfig();
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_version: config.clientVersion,
    client_secret: config.clientSecret,
    grant_type: "client_credentials",
  });
  const response = await fetch(`${PHONEPE_PREPROD_BASE_URL}/v1/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = (await response.json().catch(() => ({}))) as TokenResponse & {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      `PhonePe authentication failed (${response.status}): ${payload.message ?? "No error message returned"}`,
    );
  }

  const token = payload.access_token ?? payload.encrypted_access_token;
  if (!token) {
    throw new Error("PhonePe authentication succeeded without an access token.");
  }

  const expiresAt = payload.expires_at
    ? payload.expires_at * 1000
    : Date.now() + Math.max(payload.expires_in ?? 300, 60) * 1000;
  cachedToken = { value: token, expiresAt };
  return token;
}

async function phonePeRequest(path: string, init: RequestInit = {}) {
  const token = await phonePeAccessToken();
  const response = await fetch(`${PHONEPE_PREPROD_BASE_URL}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      authorization: `O-Bearer ${token}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : "No error message returned";
    throw new Error(`PhonePe request failed (${response.status}): ${message}`);
  }

  return payload;
}

export function createPhonePeTestOrderId() {
  return `EPTEST${Date.now()}${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
}

export async function createPhonePePreprodOrder(input: {
  merchantOrderId: string;
  amountPaise: number;
  redirectUrl: string;
}) {
  return phonePeRequest("/checkout/v2/pay", {
    method: "POST",
    body: JSON.stringify({
      merchantOrderId: input.merchantOrderId,
      amount: input.amountPaise,
      expireAfter: 1200,
      metaInfo: {
        udf1: "EasyPay preproduction checkout test",
      },
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: "EasyPay PhonePe preproduction test",
        merchantUrls: {
          redirectUrl: input.redirectUrl,
        },
      },
    }),
  });
}

export async function getPhonePePreprodOrder(merchantOrderId: string) {
  return phonePeRequest(
    `/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status`,
  );
}

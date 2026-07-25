import {
  createPhonePePreprodOrder,
  createPhonePeTestOrderId,
} from "../../../../lib/phonepe";

function isAuthorizedTester(request: Request) {
  return (
    process.env.NODE_ENV !== "production" ||
    Boolean(request.headers.get("oai-authenticated-user-email"))
  );
}

function errorResponse(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unexpected PhonePe error";
  const status = message.includes("not configured") ? 503 : 502;
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!isAuthorizedTester(request)) {
    return Response.json(
      { error: "PhonePe preproduction testing requires an authenticated EasyPay session." },
      { status: 401 },
    );
  }

  try {
    const payload = (await request.json()) as { amountRupees?: number };
    const amountRupees = Number(payload.amountRupees);
    if (
      !Number.isFinite(amountRupees) ||
      amountRupees < 1 ||
      amountRupees > 100_000
    ) {
      return Response.json(
        { error: "Enter a test amount from ₹1 to ₹1,00,000." },
        { status: 400 },
      );
    }

    const merchantOrderId = createPhonePeTestOrderId();
    const redirectUrl = new URL(
      `/phonepe-test?orderId=${encodeURIComponent(merchantOrderId)}`,
      request.url,
    ).toString();
    const phonePe = (await createPhonePePreprodOrder({
      merchantOrderId,
      amountPaise: Math.round(amountRupees * 100),
      redirectUrl,
    })) as Record<string, unknown>;
    const checkoutUrl =
      typeof phonePe.redirectUrl === "string"
        ? phonePe.redirectUrl
        : typeof phonePe.redirect_url === "string"
          ? phonePe.redirect_url
          : null;

    if (!checkoutUrl) {
      return Response.json(
        { error: "PhonePe did not return a checkout URL.", merchantOrderId },
        { status: 502 },
      );
    }

    return Response.json({ merchantOrderId, checkoutUrl });
  } catch (error) {
    return errorResponse(error);
  }
}

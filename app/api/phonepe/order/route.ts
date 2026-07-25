import { getPhonePePreprodOrder } from "../../../../lib/phonepe";

function isAuthorizedTester(request: Request) {
  return (
    process.env.NODE_ENV !== "production" ||
    Boolean(request.headers.get("oai-authenticated-user-email"))
  );
}

export async function GET(request: Request) {
  if (!isAuthorizedTester(request)) {
    return Response.json(
      { error: "PhonePe preproduction testing requires an authenticated EasyPay session." },
      { status: 401 },
    );
  }

  const orderId = new URL(request.url).searchParams.get("orderId")?.trim() ?? "";
  if (!/^EPTEST[A-Za-z0-9]{10,50}$/.test(orderId)) {
    return Response.json(
      { error: "A valid EasyPay preproduction order ID is required." },
      { status: 400 },
    );
  }

  try {
    const order = await getPhonePePreprodOrder(orderId);
    return Response.json({ orderId, order });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected PhonePe error";
    const status = message.includes("not configured") ? 503 : 502;
    return Response.json({ error: message }, { status });
  }
}

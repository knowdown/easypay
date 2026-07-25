import assert from "node:assert/strict";
import test from "node:test";

async function worker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("phonepe-test", `${process.pid}-${Date.now()}`);
  const { default: handler } = await import(workerUrl.href);
  return handler;
}

const environment = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};
const context = { waitUntil() {}, passThroughOnException() {} };
const authHeaders = {
  accept: "application/json",
  "content-type": "application/json",
  "oai-authenticated-user-email": "tester@example.com",
};

test("rejects an invalid PhonePe preproduction test amount before calling PhonePe", async () => {
  const handler = await worker();
  const response = await handler.fetch(
    new Request("https://easypay.test/api/phonepe/orders", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ amountRupees: 0 }),
    }),
    environment,
    context,
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Enter a test amount from ₹1 to ₹1,00,000.",
  });
});

test("rejects an invalid PhonePe order ID before checking status", async () => {
  const handler = await worker();
  const response = await handler.fetch(
    new Request("https://easypay.test/api/phonepe/order?orderId=bad", {
      headers: authHeaders,
    }),
    environment,
    context,
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "A valid EasyPay preproduction order ID is required.",
  });
});

test("server-renders the isolated PhonePe preproduction test page", async () => {
  const handler = await worker();
  const response = await handler.fetch(
    new Request("https://easypay.test/phonepe-test", {
      headers: { accept: "text/html" },
    }),
    environment,
    context,
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /PHONEPE PREPRODUCTION/);
  assert.match(html, /Merchant checkout test/);
  assert.match(html, /does not pay the vendor UPI ID/i);
});

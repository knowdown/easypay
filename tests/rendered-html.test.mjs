import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the EasyPay employee app", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>EasyPay — Workplace payments, simplified<\/title>/i);
  assert.match(html, /Monthly Piti/);
  assert.match(html, /Scan\. Pay\./);
  assert.match(html, /Quick payments/);
  assert.match(html, /Recent activity/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("keeps product data and metadata in the repository", async () => {
  const [page, layout, data, upi, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../data/payments.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/upi.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /paymentTypes/);
  assert.match(page, /paymentHistory/);
  assert.match(page, /inputMode="decimal"/);
  assert.match(page, /Scan vendor UPI QR/);
  assert.match(page, /Phone \/ UPI Number/);
  assert.match(page, /Verify before entering your PIN/);
  assert.match(page, /standard upi:\/\/pay intent/);
  assert.match(page, /UPI transaction ID/);
  assert.match(page, /Pending verification/);
  assert.match(page, /window\.location\.assign/);
  assert.match(page, /buildUpiPaymentUri/);
  assert.match(page, /easypay-pending-payment/);
  assert.doesNotMatch(page, /Use demo vendor/);
  assert.doesNotMatch(page, /The production version will open/);
  assert.match(page, /PAYEE SETUP REQUIRED/);
  assert.match(layout, /EasyPay/);
  assert.match(layout, /og\.png/);
  assert.match(data, /Monthly employee contribution/);
  assert.match(upi, /upi:/);
  assert.match(upi, /amountLocked/);
  assert.match(upi, /createUpiNumberRecipient/);
  assert.match(packageJson, /qr-scanner/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

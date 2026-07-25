"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CheckoutState =
  | { kind: "idle" }
  | { kind: "loading"; message: string }
  | { kind: "error"; message: string }
  | { kind: "status"; orderId: string; order: unknown };

export default function PhonePeTestPage() {
  const [amount, setAmount] = useState("1");
  const [state, setState] = useState<CheckoutState>({ kind: "idle" });

  useEffect(() => {
    const orderId = new URLSearchParams(window.location.search).get("orderId");
    if (!orderId) return;

    fetch(`/api/phonepe/order?orderId=${encodeURIComponent(orderId)}`, {
      headers: { accept: "application/json" },
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          error?: string;
          order?: unknown;
        };
        if (!response.ok) throw new Error(payload.error ?? "Status check failed.");
        try {
          const previous = JSON.parse(
            localStorage.getItem("easypay-phonepe-test-orders") ?? "[]",
          ) as unknown[];
          localStorage.setItem(
            "easypay-phonepe-test-orders",
            JSON.stringify([
              { orderId, checkedAt: new Date().toISOString(), order: payload.order },
              ...previous,
            ].slice(0, 20)),
          );
        } catch {
          // The order status is still displayed if local browser storage is unavailable.
        }
        setState({ kind: "status", orderId, order: payload.order });
      })
      .catch((error: unknown) => {
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : "Status check failed.",
        });
      });
  }, []);

  async function beginCheckout() {
    setState({ kind: "loading", message: "Creating PhonePe checkout…" });
    try {
      const response = await fetch("/api/phonepe/orders", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({ amountRupees: Number(amount) }),
      });
      const payload = (await response.json()) as {
        error?: string;
        merchantOrderId?: string;
        checkoutUrl?: string;
      };
      if (!response.ok || !payload.checkoutUrl || !payload.merchantOrderId) {
        throw new Error(payload.error ?? "PhonePe checkout creation failed.");
      }

      sessionStorage.setItem(
        "easypay-phonepe-test-order",
        payload.merchantOrderId,
      );
      window.location.assign(payload.checkoutUrl);
    } catch (error) {
      setState({
        kind: "error",
        message:
          error instanceof Error ? error.message : "PhonePe checkout creation failed.",
      });
    }
  }

  return (
    <main className="phonepe-test-page">
      <section className="phonepe-test-card">
        <div className="brand"><span className="brand-mark">e</span><span>easypay</span></div>
        <p className="eyebrow">PHONEPE PREPRODUCTION</p>
        <h1>Merchant checkout test</h1>
        <p>
          This isolated test charges the PhonePe sandbox merchant configured for
          EasyPay. It does not pay the vendor UPI ID scanned in the expense flow.
        </p>

        <div className="preprod-warning">
          <b>Sandbox only</b>
          <p>No production money should move. Verify the final state through PhonePe&apos;s Order Status API.</p>
        </div>

        <label className="amount-field">
          <span>Test amount</span>
          <div>
            <b>₹</b>
            <input
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value.replace(/[^\d.]/g, ""))
              }
              inputMode="decimal"
              aria-label="PhonePe test amount"
            />
          </div>
        </label>
        <button
          className="primary-button"
          onClick={() => void beginCheckout()}
          disabled={
            state.kind === "loading" ||
            !amount ||
            Number(amount) < 1 ||
            Number(amount) > 100_000
          }
        >
          {state.kind === "loading" ? state.message : "Open PhonePe sandbox checkout"} <span>→</span>
        </button>

        {state.kind === "error" && (
          <p className="flow-error" role="alert">{state.message}</p>
        )}
        {state.kind === "status" && (
          <section className="phonepe-status" aria-label="PhonePe order status">
            <p className="eyebrow">ORDER STATUS RESPONSE</p>
            <b>{state.orderId}</b>
            <p>Saved to this device&apos;s EasyPay preproduction test history.</p>
            <pre>{JSON.stringify(state.order, null, 2)}</pre>
          </section>
        )}

        <Link className="phonepe-back-link" href="/">← Back to EasyPay</Link>
      </section>
    </main>
  );
}

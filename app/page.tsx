"use client";

import { useMemo, useState } from "react";
import { paymentHistory, paymentTypes } from "../data/payments";

type Tab = "home" | "payments" | "history" | "profile";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function Home() {
  const [tab, setTab] = useState<Tab>("home");
  const [selectedPayment, setSelectedPayment] = useState(paymentTypes[0]);
  const [amount, setAmount] = useState("1500");
  const [showSheet, setShowSheet] = useState(false);
  const [paid, setPaid] = useState(false);
  const [query, setQuery] = useState("");

  const filteredHistory = useMemo(
    () =>
      paymentHistory.filter((item) =>
        `${item.title} ${item.reference}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query],
  );

  function startPayment(payment = paymentTypes[0]) {
    setSelectedPayment(payment);
    setAmount(payment.suggestedAmount.toString());
    setPaid(false);
    setShowSheet(true);
  }

  function finishPayment() {
    if (!amount || Number(amount) <= 0) return;
    setPaid(true);
  }

  return (
    <main className="site-shell">
      <section className="desktop-story" aria-label="EasyPay introduction">
        <div className="brand brand-light">
          <span className="brand-mark">e</span>
          <span>easypay</span>
        </div>
        <div className="story-copy">
          <p className="eyebrow">Workplace payments, simplified</p>
          <h1>Pay your share.<br />Keep work moving.</h1>
          <p>
            A clear, secure way for employees to make piti contributions and
            organisation payments—without chasing receipts or bank details.
          </p>
          <div className="story-proof">
            <span><b>✓</b> Instant confirmation</span>
            <span><b>✓</b> Clear payment history</span>
            <span><b>✓</b> Organisation-approved</span>
          </div>
        </div>
        <p className="desktop-note">Built for teams that value clarity.</p>
      </section>

      <section className="phone" aria-label="EasyPay employee payment app">
        <header className="mobile-header">
          <div className="brand">
            <span className="brand-mark">e</span>
            <span>easypay</span>
          </div>
          <button className="avatar" aria-label="Open profile" onClick={() => setTab("profile")}>
            AS
          </button>
        </header>

        <div className="app-content">
          {tab === "home" && (
            <>
              <section className="welcome">
                <p className="eyebrow">SATURDAY, 25 JULY</p>
                <h2>Good morning, Aarav.</h2>
                <p>Everything is up to date.</p>
              </section>

              <section className="due-card">
                <div>
                  <p className="card-label">NEXT PAYMENT</p>
                  <span className="status-pill">Due in 5 days</span>
                </div>
                <h3>{money.format(1500)}</h3>
                <p>Monthly Piti · July 2026</p>
                <button className="primary-button" onClick={() => startPayment()}>
                  Pay now <span>→</span>
                </button>
              </section>

              <section className="section-block">
                <div className="section-heading">
                  <h3>Quick payments</h3>
                  <button onClick={() => setTab("payments")}>View all</button>
                </div>
                <div className="quick-grid">
                  {paymentTypes.slice(0, 4).map((payment) => (
                    <button
                      className="quick-item"
                      key={payment.id}
                      onClick={() => startPayment(payment)}
                    >
                      <span className={`quick-icon ${payment.color}`}>
                        {payment.icon}
                      </span>
                      <span>{payment.shortTitle}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="section-block">
                <div className="section-heading">
                  <h3>Recent activity</h3>
                  <button onClick={() => setTab("history")}>See history</button>
                </div>
                <div className="activity-list">
                  {paymentHistory.slice(0, 3).map((item) => (
                    <ActivityRow key={item.reference} item={item} />
                  ))}
                </div>
              </section>
            </>
          )}

          {tab === "payments" && (
            <section className="inner-page">
              <p className="eyebrow">PAYMENTS</p>
              <h2>What would you like to pay?</h2>
              <p className="page-intro">Select a category to make an organisation payment.</p>
              <div className="payment-list">
                {paymentTypes.map((payment) => (
                  <button key={payment.id} onClick={() => startPayment(payment)}>
                    <span className={`quick-icon ${payment.color}`}>{payment.icon}</span>
                    <span>
                      <b>{payment.title}</b>
                      <small>{payment.description}</small>
                    </span>
                    <i>›</i>
                  </button>
                ))}
              </div>
            </section>
          )}

          {tab === "history" && (
            <section className="inner-page">
              <p className="eyebrow">ACTIVITY</p>
              <h2>Payment history</h2>
              <label className="search-box">
                <span>⌕</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search payments"
                  aria-label="Search payments"
                />
              </label>
              <div className="history-summary">
                <span>Paid this year</span>
                <b>{money.format(9200)}</b>
              </div>
              <div className="activity-list">
                {filteredHistory.map((item) => (
                  <ActivityRow key={item.reference} item={item} showReference />
                ))}
              </div>
            </section>
          )}

          {tab === "profile" && (
            <section className="inner-page">
              <div className="profile-hero">
                <div className="profile-avatar">AS</div>
                <h2>Aarav Sharma</h2>
                <p>Product Operations · EMP-1042</p>
              </div>
              <div className="profile-card">
                <div><span>Organisation</span><b>Knowdown Technologies</b></div>
                <div><span>Work email</span><b>aarav@knowdown.in</b></div>
                <div><span>Payment method</span><b>UPI ···· 2381</b></div>
              </div>
              <button className="support-button">Get payment support <span>→</span></button>
              <p className="security-note">🔒 Your payment details are encrypted and protected.</p>
            </section>
          )}
        </div>

        <nav className="bottom-nav" aria-label="Primary navigation">
          {([
            ["home", "⌂", "Home"],
            ["payments", "₹", "Pay"],
            ["history", "↻", "History"],
            ["profile", "○", "Profile"],
          ] as const).map(([id, icon, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        {showSheet && (
          <div className="sheet-backdrop" role="presentation" onMouseDown={() => setShowSheet(false)}>
            <section
              className="payment-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Complete payment"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button className="sheet-close" onClick={() => setShowSheet(false)} aria-label="Close">×</button>
              {!paid ? (
                <>
                  <span className={`sheet-icon ${selectedPayment.color}`}>{selectedPayment.icon}</span>
                  <p className="eyebrow">SECURE PAYMENT</p>
                  <h2>{selectedPayment.title}</h2>
                  <p>{selectedPayment.description}</p>
                  <label className="amount-field">
                    <span>Amount</span>
                    <div><b>₹</b><input value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} inputMode="numeric" /></div>
                  </label>
                  <div className="pay-from">
                    <span>Pay from</span>
                    <b>UPI ···· 2381</b>
                  </div>
                  <button className="primary-button" onClick={finishPayment}>
                    Pay {amount ? money.format(Number(amount)) : "now"} <span>→</span>
                  </button>
                  <small className="secure-copy">🔒 Processed securely. No payment details are stored.</small>
                </>
              ) : (
                <div className="success-state">
                  <span className="success-check">✓</span>
                  <p className="eyebrow">PAYMENT SUCCESSFUL</p>
                  <h2>You&apos;re all set.</h2>
                  <p>{money.format(Number(amount))} paid for {selectedPayment.title}.</p>
                  <div className="receipt">
                    <span>Reference</span><b>EPY26072584</b>
                    <span>Date</span><b>25 Jul 2026, 10:42 AM</b>
                  </div>
                  <button className="primary-button" onClick={() => setShowSheet(false)}>Done</button>
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

function ActivityRow({
  item,
  showReference = false,
}: {
  item: (typeof paymentHistory)[number];
  showReference?: boolean;
}) {
  return (
    <div className="activity-row">
      <span className="activity-icon">{item.icon}</span>
      <div>
        <b>{item.title}</b>
        <small>{item.date}{showReference ? ` · ${item.reference}` : ""}</small>
      </div>
      <div className="activity-amount">
        <b>−{money.format(item.amount)}</b>
        <small>Paid</small>
      </div>
    </div>
  );
}

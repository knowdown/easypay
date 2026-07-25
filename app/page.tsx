"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type QrScanner from "qr-scanner";
import { paymentHistory, paymentTypes } from "../data/payments";
import { buildUpiPaymentUri, createUpiNumberRecipient, parseUpiQr, type VendorUpi } from "../lib/upi";

type Tab = "home" | "payments" | "history" | "profile";
type ExpenseStep = "closed" | "scan" | "confirm" | "app-handoff" | "return" | "submitted";
type LocalExpense = {
  id: string;
  vendor: string;
  vpa: string;
  amount: number;
  category: string;
  utr: string;
  receipt: string;
  date: string;
};
type PendingPayment = {
  vendor: VendorUpi;
  amount: string;
  category: string;
  note: string;
  reference: string;
};

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const expenseCategories = [
  "Meals & refreshments",
  "Local travel",
  "Office supplies",
  "Client expense",
  "Repairs & maintenance",
  "Other business expense",
];
const placeholderVendorNames = new Set(["UPI vendor", "UPI Number recipient"]);

function vendorNameRequired(vendor: VendorUpi) {
  return placeholderVendorNames.has(vendor.name);
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("home");
  const [selectedPayment, setSelectedPayment] = useState(paymentTypes[0]);
  const [amount, setAmount] = useState("1500");
  const [showSheet, setShowSheet] = useState(false);
  const [query, setQuery] = useState("");
  const [expenseStep, setExpenseStep] = useState<ExpenseStep>("closed");
  const [vendor, setVendor] = useState<VendorUpi | null>(null);
  const [expenseCategory, setExpenseCategory] = useState(expenseCategories[0]);
  const [expenseNote, setExpenseNote] = useState("");
  const [scanError, setScanError] = useState("");
  const [manualUpi, setManualUpi] = useState("");
  const [recipientEntry, setRecipientEntry] = useState<"upi-id" | "phone">("upi-id");
  const [utr, setUtr] = useState("");
  const [receiptName, setReceiptName] = useState("");
  const [copiedValue, setCopiedValue] = useState<"recipient" | "amount" | "">("");
  const [expenseReference, setExpenseReference] = useState("");
  const [localExpenses, setLocalExpenses] = useState<LocalExpense[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("easypay-expenses");
      if (saved) setLocalExpenses(JSON.parse(saved));
    } catch {
      // The expense history starts empty if local storage is unavailable.
    }

    try {
      const pending = sessionStorage.getItem("easypay-pending-payment");
      if (pending) {
        const payment = JSON.parse(pending) as PendingPayment;
        if (payment.vendor?.vpa && Number(payment.amount) > 0) {
          setVendor(payment.vendor);
          setAmount(payment.amount);
          setExpenseCategory(payment.category);
          setExpenseNote(payment.note);
          setExpenseReference(payment.reference);
          setExpenseStep("return");
        }
      }
    } catch {
      // A pending payment cannot be recovered if session storage is unavailable.
    }
  }, []);

  useEffect(() => {
    if (expenseStep !== "scan" || !videoRef.current) return;
    let active = true;

    async function startScanner() {
      try {
        const { default: Scanner } = await import("qr-scanner");
        if (!active || !videoRef.current) return;
        const scanner = new Scanner(
          videoRef.current,
          (result) => handleQrResult(result.data),
          {
            preferredCamera: "environment",
            highlightScanRegion: true,
            highlightCodeOutline: true,
            returnDetailedScanResult: true,
          },
        );
        scannerRef.current = scanner;
        await scanner.start();
      } catch {
        if (active) {
          setScanError("Camera access was unavailable. You can upload the QR image or enter the vendor UPI ID.");
        }
      }
    }

    void startScanner();
    return () => {
      active = false;
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, [expenseStep]);

  const filteredHistory = useMemo(
    () =>
      paymentHistory.filter((item) =>
        `${item.title} ${item.reference}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );

  function startPayment(payment = paymentTypes[0]) {
    setSelectedPayment(payment);
    setAmount(payment.suggestedAmount.toString());
    setShowSheet(true);
  }

  function startVendorExpense(category = expenseCategories[0]) {
    try {
      sessionStorage.removeItem("easypay-pending-payment");
    } catch {
      // The payment flow still works if session storage is unavailable.
    }
    setVendor(null);
    setAmount("");
    setExpenseCategory(expenseCategories.includes(category) ? category : expenseCategories[0]);
    setExpenseNote("");
    setScanError("");
    setManualUpi("");
    setRecipientEntry("upi-id");
    setUtr("");
    setReceiptName("");
    setCopiedValue("");
    setExpenseReference(`EPX${Date.now().toString().slice(-10)}`);
    setExpenseStep("scan");
  }

  function handleQrResult(raw: string) {
    try {
      const parsed = parseUpiQr(raw);
      scannerRef.current?.stop();
      setVendor(parsed);
      setAmount(parsed.amount);
      setScanError("");
      setExpenseStep("confirm");
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Unable to read this QR code.");
    }
  }

  async function scanUploadedQr(file?: File) {
    if (!file) return;
    try {
      const { default: Scanner } = await import("qr-scanner");
      const result = await Scanner.scanImage(file, { returnDetailedScanResult: true });
      handleQrResult(result.data);
    } catch {
      setScanError("No valid UPI QR code was found in that image.");
    }
  }

  function useManualUpi() {
    handleQrResult(
      `upi://pay?pa=${encodeURIComponent(manualUpi.trim())}&cu=INR`,
    );
  }

  function usePhoneNumber() {
    try {
      const recipient = createUpiNumberRecipient(manualUpi);
      setVendor(recipient);
      setAmount("");
      setScanError("");
      setExpenseStep("confirm");
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Enter a valid UPI Number.");
    }
  }

  async function prepareUpiPayment() {
    if (!vendor || !amount || Number(amount) <= 0) return;
    try {
      await navigator.clipboard.writeText(vendor.vpa);
      setCopiedValue("recipient");
    } catch {
      setCopiedValue("");
    }
    setExpenseStep("app-handoff");
  }

  function launchUpiApp() {
    if (!vendor || vendor.recipientType !== "vpa" || !amount || Number(amount) <= 0 || vendorNameRequired(vendor)) return;

    const pendingPayment: PendingPayment = {
      vendor,
      amount,
      category: expenseCategory,
      note: expenseNote,
      reference: expenseReference,
    };
    try {
      sessionStorage.setItem("easypay-pending-payment", JSON.stringify(pendingPayment));
    } catch {
      // The browser can still launch the UPI app without return-state recovery.
    }

    const uri = buildUpiPaymentUri(vendor, amount, expenseCategory);
    setExpenseStep("return");
    window.location.assign(uri);
  }

  async function copyPaymentValue(value: "recipient" | "amount") {
    if (!vendor) return;
    try {
      await navigator.clipboard.writeText(value === "recipient" ? vendor.vpa : amount);
      setCopiedValue(value);
    } catch {
      setCopiedValue("");
    }
  }

  function submitExpense() {
    if (!vendor || utr.trim().length < 8) return;
    const expense: LocalExpense = {
      id: expenseReference,
      vendor: vendor.name,
      vpa: vendor.vpa,
      amount: Number(amount),
      category: expenseCategory,
      utr: utr.trim().toUpperCase(),
      receipt: receiptName,
      date: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };
    const updated = [expense, ...localExpenses];
    setLocalExpenses(updated);
    try {
      localStorage.setItem("easypay-expenses", JSON.stringify(updated));
    } catch {
      // Submission still completes when browser storage is unavailable.
    }
    try {
      sessionStorage.removeItem("easypay-pending-payment");
    } catch {
      // The submitted state remains available for the current page session.
    }
    setExpenseStep("submitted");
  }

  function cancelPendingPayment() {
    try {
      sessionStorage.removeItem("easypay-pending-payment");
    } catch {
      // Returning to the confirmation screen does not depend on storage.
    }
    setExpenseStep("confirm");
  }

  return (
    <main className="site-shell">
      <section className="desktop-story" aria-label="EasyPay introduction">
        <div className="brand brand-light"><span className="brand-mark">e</span><span>easypay</span></div>
        <div className="story-copy">
          <p className="eyebrow">Workplace expenses, simplified</p>
          <h1>Scan. Pay.<br />Get it recorded.</h1>
          <p>
            Employees pay vendors securely from their personal UPI account using
            PhonePe, Google Pay, or another installed UPI app.
          </p>
          <div className="story-proof">
            <span><b>✓</b> Vendor QR scanning</span>
            <span><b>✓</b> Personal UPI payment</span>
            <span><b>✓</b> Expense-ready record</span>
          </div>
        </div>
        <p className="desktop-note">EasyPay never sees or stores an employee&apos;s UPI PIN.</p>
      </section>

      <section className="phone" aria-label="EasyPay employee payment app">
        <header className="mobile-header">
          <div className="brand"><span className="brand-mark">e</span><span>easypay</span><span className="live-badge">LIVE</span></div>
          <button className="avatar" aria-label="Open profile" onClick={() => setTab("profile")}>AS</button>
        </header>

        <div className="app-content">
          {tab === "home" && (
            <>
              <section className="welcome">
                <p className="eyebrow">SATURDAY, 25 JULY</p>
                <h2>Good morning, Aarav.</h2>
                <p>Ready to record a work expense?</p>
              </section>

              <section className="scan-card">
                <span className="scan-card-icon">⌗</span>
                <div>
                  <p className="card-label">PAY A VENDOR</p>
                  <h3>Scan their UPI QR</h3>
                  <p>Pay with your personal UPI app and save the expense.</p>
                </div>
                <button className="primary-button" onClick={() => startVendorExpense()}>
                  Scan & pay <span>→</span>
                </button>
              </section>

              <section className="due-card compact-due">
                <div><p className="card-label">NEXT CONTRIBUTION</p><span className="status-pill">Due in 5 days</span></div>
                <h3>{money.format(1500)}</h3>
                <p>Monthly Piti · July 2026</p>
                <button className="secondary-light-button" onClick={() => startPayment()}>Piti setup required <span>→</span></button>
              </section>

              <section className="section-block">
                <div className="section-heading"><h3>Quick payments</h3><button onClick={() => setTab("payments")}>View all</button></div>
                <div className="quick-grid">
                  {paymentTypes.slice(0, 4).map((payment) => (
                    <button
                      className="quick-item"
                      key={payment.id}
                      onClick={() => payment.id === "piti" ? startPayment(payment) : startVendorExpense(
                        payment.id === "meals" ? "Meals & refreshments" :
                        payment.id === "travel" ? "Local travel" :
                        "Other business expense",
                      )}
                    >
                      <span className={`quick-icon ${payment.color}`}>{payment.icon}</span>
                      <span>{payment.shortTitle}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="section-block">
                <div className="section-heading"><h3>Recent activity</h3><button onClick={() => setTab("history")}>See history</button></div>
                <div className="activity-list">
                  {localExpenses.slice(0, 1).map((item) => <ExpenseRow key={item.id} item={item} />)}
                  {paymentHistory.slice(0, localExpenses.length ? 2 : 3).map((item) => <ActivityRow key={item.reference} item={item} />)}
                </div>
              </section>
            </>
          )}

          {tab === "payments" && (
            <section className="inner-page">
              <p className="eyebrow">PAYMENTS</p>
              <h2>What would you like to pay?</h2>
              <button className="vendor-pay-banner" onClick={() => startVendorExpense()}>
                <span className="scan-card-icon">⌗</span>
                <span><b>Scan vendor UPI QR</b><small>Pay a work expense from your personal account</small></span>
                <i>›</i>
              </button>
              <p className="list-label">OTHER ORGANISATION PAYMENTS</p>
              <div className="payment-list">
                {paymentTypes.map((payment) => (
                  <button
                    key={payment.id}
                    onClick={() => payment.id === "piti" ? startPayment(payment) : startVendorExpense(
                      payment.id === "meals" ? "Meals & refreshments" :
                      payment.id === "travel" ? "Local travel" :
                      "Other business expense",
                    )}
                  >
                    <span className={`quick-icon ${payment.color}`}>{payment.icon}</span>
                    <span><b>{payment.title}</b><small>{payment.description}</small></span>
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
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search payments" aria-label="Search payments" />
              </label>
              {localExpenses.length > 0 && (
                <>
                  <p className="list-label">VENDOR EXPENSES</p>
                  <div className="activity-list local-expenses">
                    {localExpenses.map((item) => <ExpenseRow key={item.id} item={item} showReference />)}
                  </div>
                </>
              )}
              <p className="list-label">ORGANISATION PAYMENTS</p>
              <div className="activity-list">
                {filteredHistory.map((item) => <ActivityRow key={item.reference} item={item} showReference />)}
              </div>
            </section>
          )}

          {tab === "profile" && (
            <section className="inner-page">
              <div className="profile-hero">
                <div className="profile-avatar">AS</div><h2>Aarav Sharma</h2><p>Product Operations · EMP-1042</p>
              </div>
              <div className="profile-card">
                <div><span>Organisation</span><b>Knowdown Technologies</b></div>
                <div><span>Work email</span><b>aarav@knowdown.in</b></div>
                <div><span>Vendor expenses</span><b>Paid from personal UPI account</b></div>
              </div>
              <button className="support-button">Get payment support <span>→</span></button>
              <p className="security-note">🔒 EasyPay never asks for or stores your UPI PIN.</p>
            </section>
          )}
        </div>

        <nav className="bottom-nav" aria-label="Primary navigation">
          {([["home", "⌂", "Home"], ["payments", "₹", "Pay"], ["history", "↻", "History"], ["profile", "○", "Profile"]] as const).map(([id, icon, label]) => (
            <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </nav>

        {showSheet && (
          <div className="sheet-backdrop" role="presentation" onMouseDown={() => setShowSheet(false)}>
            <section className="payment-sheet" role="dialog" aria-modal="true" aria-label="Complete payment" onMouseDown={(event) => event.stopPropagation()}>
              <button className="sheet-close" onClick={() => setShowSheet(false)} aria-label="Close">×</button>
              <span className={`sheet-icon ${selectedPayment.color}`}>{selectedPayment.icon}</span>
              <p className="eyebrow">PAYEE SETUP REQUIRED</p>
              <h2>{selectedPayment.title}</h2>
              <p>
                This payment cannot be initiated until the organisation&apos;s
                approved receiving UPI ID and display name are configured.
              </p>
              <div className="setup-required-note">
                <b>No bank login is needed</b>
                <p>EasyPay only needs the organisation&apos;s receiving UPI ID. Employees still authorise payment from their own bank account inside PhonePe, Google Pay, or another UPI app.</p>
              </div>
              <button className="primary-button" onClick={() => setShowSheet(false)}>Back to payments</button>
            </section>
          </div>
        )}

        {expenseStep !== "closed" && (
          <div className="expense-flow" role="dialog" aria-modal="true" aria-label="Pay vendor expense">
            <header>
              <button onClick={() => expenseStep === "scan" ? setExpenseStep("closed") : setExpenseStep("scan")} aria-label={expenseStep === "scan" ? "Close" : "Go back"}>
                {expenseStep === "scan" ? "×" : "‹"}
              </button>
              <div><span>Vendor expense</span><small>Personal UPI payment</small></div>
              <span className="flow-lock">🔒</span>
            </header>

            {expenseStep === "scan" && (
              <section className="flow-body scan-step">
                <p className="eyebrow">STEP 1 OF 3</p>
                <h2>Scan the vendor&apos;s UPI QR</h2>
                <p>Position the complete QR code inside the frame.</p>
                <div className="camera-frame">
                  <video ref={videoRef} muted playsInline aria-label="Vendor QR scanner" />
                  <span className="camera-corner top-left" /><span className="camera-corner top-right" />
                  <span className="camera-corner bottom-left" /><span className="camera-corner bottom-right" />
                  <div className="scan-line" />
                </div>
                {scanError && <p className="flow-error" role="alert">{scanError}</p>}
                <label className="upload-button">
                  <input type="file" accept="image/*" onChange={(event) => void scanUploadedQr(event.target.files?.[0])} />
                  Upload QR image
                </label>
                <div className="manual-divider"><span>or enter recipient details</span></div>
                <div className="recipient-tabs" role="tablist" aria-label="Recipient identifier">
                  <button className={recipientEntry === "upi-id" ? "active" : ""} onClick={() => { setRecipientEntry("upi-id"); setManualUpi(""); setScanError(""); }}>UPI ID</button>
                  <button className={recipientEntry === "phone" ? "active" : ""} onClick={() => { setRecipientEntry("phone"); setManualUpi(""); setScanError(""); }}>Phone / UPI Number</button>
                </div>
                <div className="manual-upi">
                  <input
                    value={manualUpi}
                    onChange={(event) => setManualUpi(recipientEntry === "phone" ? event.target.value.replace(/\D/g, "").slice(0, 10) : event.target.value)}
                    placeholder={recipientEntry === "phone" ? "10-digit mobile number" : "vendor@bank"}
                    inputMode={recipientEntry === "phone" ? "tel" : "email"}
                    aria-label={recipientEntry === "phone" ? "Vendor UPI Number" : "Vendor UPI ID"}
                  />
                  <button
                    onClick={recipientEntry === "phone" ? usePhoneNumber : useManualUpi}
                    disabled={recipientEntry === "phone" ? manualUpi.length !== 10 : !manualUpi.includes("@")}
                  >
                    Continue
                  </button>
                </div>
                {recipientEntry === "phone" && (
                  <p className="upi-number-help">
                    The number must be registered by the vendor as their interoperable UPI Number. Your UPI app will resolve it before payment.
                  </p>
                )}
              </section>
            )}

            {expenseStep === "confirm" && vendor && (
              <section className="flow-body confirm-step">
                <p className="eyebrow">STEP 2 OF 3</p><h2>Confirm vendor and expense</h2>
                <div className="vendor-card">
                  <span className="vendor-avatar">{vendor.name.slice(0, 1).toUpperCase()}</span>
                  <div><b>{vendor.name}</b><small>{vendor.recipientType === "upi-number" ? `UPI Number · ${vendor.vpa}` : vendor.vpa}</small></div>
                  <span className={vendor.recipientType === "upi-number" ? "resolve-vendor" : "verified-vendor"}>
                    {vendor.recipientType === "upi-number" ? "Resolve in app" : "UPI ID"}
                  </span>
                </div>
                {vendorNameRequired(vendor) && (
                  <>
                    <label className="text-field">
                      <span>Vendor name for the expense</span>
                      <input
                        value={placeholderVendorNames.has(vendor.name) ? "" : vendor.name}
                        onChange={(event) => setVendor({
                          ...vendor,
                          name: event.target.value || (vendor.recipientType === "upi-number" ? "UPI Number recipient" : "UPI vendor"),
                        })}
                        placeholder="Enter the vendor's real name"
                      />
                    </label>
                    <div className="recipient-warning">
                      <b>Verify before entering your PIN</b>
                      <p>PhonePe or Google Pay must resolve this payment address. Continue only if the verified recipient name shown there matches your vendor.</p>
                    </div>
                  </>
                )}
                {vendor.recipientType === "vpa" && !vendorNameRequired(vendor) && (
                  <div className="recipient-warning">
                    <b>Verify the recipient in your UPI app</b>
                    <p>EasyPay can read the UPI ID from a QR, but only your UPI app can resolve the current account holder. Pay only if its verified name matches the vendor.</p>
                  </div>
                )}
                <label className="amount-field">
                  <span>Amount {vendor.amountLocked && "· Set by vendor QR"}</span>
                  <div><b>₹</b><input value={amount} readOnly={vendor.amountLocked} onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="0" /></div>
                </label>
                <label className="select-field"><span>Expense category</span><select value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value)}>{expenseCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
                <label className="text-field"><span>Note for accounts <i>Optional</i></span><input value={expenseNote} onChange={(event) => setExpenseNote(event.target.value)} placeholder="What was this expense for?" /></label>
                <div className="personal-account-note"><b>Paying from your personal account</b><p>Your UPI app will let you choose the linked bank account. EasyPay cannot access your PIN.</p></div>
                <button
                  className="primary-button"
                  onClick={vendor.recipientType === "vpa" ? launchUpiApp : () => void prepareUpiPayment()}
                  disabled={!amount || Number(amount) <= 0 || vendorNameRequired(vendor)}
                >
                  {vendor.recipientType === "vpa" ? "Open PhonePe or UPI app" : "Continue with UPI Number"} <span>→</span>
                </button>
                <small className="secure-copy">
                  {vendor.recipientType === "vpa"
                    ? "Opens the standard upi://pay intent using the scanned or confirmed vendor details"
                    : "UPI Numbers are resolved inside the selected UPI app"}
                </small>
                {vendor.recipientType === "vpa" && (
                  <button className="text-button" onClick={() => void prepareUpiPayment()}>
                    Copy details instead
                  </button>
                )}
              </section>
            )}

            {expenseStep === "app-handoff" && vendor && (
              <section className="flow-body phone-handoff-step">
                <p className="eyebrow">COMPLETE IN YOUR UPI APP</p>
                <h2>
                  Pay using the vendor&apos;s {vendor.recipientType === "upi-number" ? "phone number" : "UPI ID"}
                </h2>
                <p>
                  Use this fallback if the UPI intent did not open or your
                  selected UPI app declined the handoff.
                </p>
                <div className="phone-payment-summary">
                  <div><span>Vendor</span><b>{vendor.name}</b></div>
                  <div>
                    <span>{vendor.recipientType === "upi-number" ? "UPI Number" : "UPI ID"}</span>
                    <b>{vendor.vpa}</b>
                    <button onClick={() => void copyPaymentValue("recipient")}>{copiedValue === "recipient" ? "Copied" : "Copy"}</button>
                  </div>
                  <div><span>Amount</span><b>{money.format(Number(amount))}</b><button onClick={() => void copyPaymentValue("amount")}>{copiedValue === "amount" ? "Copied" : "Copy"}</button></div>
                </div>
                <ol className="phone-payment-steps">
                  <li>Open PhonePe, Google Pay, BHIM, or your preferred UPI app.</li>
                  <li>
                    Choose <b>{vendor.recipientType === "upi-number" ? "To mobile number" : "To UPI ID"}</b>
                    {vendor.recipientType === "upi-number" ? " or UPI Number" : ""}.
                  </li>
                  <li>Paste the {vendor.recipientType === "upi-number" ? "number" : "UPI ID"} above and confirm the resolved recipient matches the vendor.</li>
                  <li>Enter {money.format(Number(amount))} and complete the payment.</li>
                </ol>
                <div className="recipient-warning">
                  <b>Do not pay if the name does not match</b>
                  <p>
                    {vendor.recipientType === "upi-number"
                      ? "The number may be unmapped or registered to a different person. Use the vendor's QR or full UPI ID instead."
                      : "A QR label or UPI ID is not proof of account ownership. Confirm the verified recipient name shown by your UPI app."}
                  </p>
                </div>
                <button className="primary-button" onClick={() => setExpenseStep("return")}>I completed the payment <span>→</span></button>
                <button className="text-button" onClick={cancelPendingPayment}>Go back</button>
              </section>
            )}

            {expenseStep === "return" && vendor && (
              <section className="flow-body return-step">
                <p className="eyebrow">STEP 3 OF 3</p><h2>Record the completed payment</h2>
                <p>EasyPay resumed after the UPI handoff. Enter the transaction reference shown by your UPI app.</p>
                <div className="payment-recap"><span>{vendor.name}</span><b>{money.format(Number(amount))}</b><small>{vendor.vpa}</small></div>
                <label className="text-field"><span>UPI transaction ID / UTR</span><input value={utr} onChange={(event) => setUtr(event.target.value.replace(/[^a-zA-Z0-9]/g, ""))} placeholder="Enter the reference from your UPI app" /></label>
                <label className="receipt-upload">
                  <input type="file" accept="image/*,.pdf" onChange={(event) => setReceiptName(event.target.files?.[0]?.name ?? "")} />
                  <span>＋</span><div><b>{receiptName || "Attach payment screenshot"}</b><small>Optional · JPG, PNG or PDF</small></div>
                </label>
                <div className="verification-note"><b>Why we ask for this</b><p>A return from a UPI app does not independently confirm the bank transfer. Accounts can verify the UTR against the receipt.</p></div>
                <button className="primary-button" onClick={submitExpense} disabled={utr.trim().length < 8}>Submit expense <span>→</span></button>
                <button className="text-button" onClick={cancelPendingPayment}>Payment was not completed</button>
              </section>
            )}

            {expenseStep === "submitted" && vendor && (
              <section className="flow-body submitted-step">
                <span className="success-check">✓</span><p className="eyebrow">SUBMITTED FOR VERIFICATION</p><h2>Expense recorded.</h2>
                <p>{money.format(Number(amount))} paid to {vendor.name} has been added to your EasyPay history.</p>
                <div className="receipt">
                  <span>EasyPay reference</span><b>{expenseReference}</b>
                  <span>UPI transaction ID</span><b>{utr.toUpperCase()}</b>
                  <span>Status</span><b className="pending-text">Pending verification</b>
                </div>
                <button className="primary-button" onClick={() => { setExpenseStep("closed"); setTab("history"); }}>View expense history</button>
                <button className="text-button" onClick={() => setExpenseStep("closed")}>Back to home</button>
              </section>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function ActivityRow({ item, showReference = false }: { item: (typeof paymentHistory)[number]; showReference?: boolean }) {
  return (
    <div className="activity-row">
      <span className="activity-icon">{item.icon}</span><div><b>{item.title}</b><small>{item.date}{showReference ? ` · ${item.reference}` : ""}</small></div>
      <div className="activity-amount"><b>−{money.format(item.amount)}</b><small>Paid</small></div>
    </div>
  );
}

function ExpenseRow({ item, showReference = false }: { item: LocalExpense; showReference?: boolean }) {
  return (
    <div className="activity-row">
      <span className="activity-icon vendor-history-icon">⌗</span><div><b>{item.vendor}</b><small>{item.category} · {item.date}{showReference ? ` · ${item.utr}` : ""}</small></div>
      <div className="activity-amount"><b>−{money.format(item.amount)}</b><small className="pending-small">Pending</small></div>
    </div>
  );
}

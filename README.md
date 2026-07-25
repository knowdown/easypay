# EasyPay

EasyPay is a mobile-first workplace payment app for employee piti contributions
and other organisation payments.

## Production web flow

- Employee payment dashboard
- Vendor UPI QR scanning through the phone camera
- QR image upload and manual vendor UPI ID fallback
- Safe phone-number handoff for a 10-digit number registered as an interoperable UPI Number
- Browser-generated `upi://pay` handoff to PhonePe, Google Pay, BHIM, or another installed UPI app
- UTR and optional receipt capture after personal-account payment
- Locally saved vendor expense history with verification status
- Monthly piti due card and payment flow
- Organisation payment categories
- Searchable payment history
- Employee profile and stored payment method view
- Responsive desktop presentation and mobile app layout

Displayed organisation-payment data lives in `data/payments.ts`. Vendor expense
records are currently saved locally in the employee's browser.

The live vendor flow never requests or stores a UPI PIN. Returning from a UPI app is
not treated as bank confirmation; submitted expenses remain pending until the
UTR and receipt are verified by accounts.

Phone-number payments work only when the recipient has registered the number as
their UPI Number. EasyPay never guesses a UPI handle from a mobile number.

EasyPay launches a standard `upi://pay` browser intent for full vendor UPI IDs.
Signed QR payloads are passed to the UPI app byte-for-byte. For unsigned scanned
QRs, EasyPay preserves the QR-issued merchant fields and adds only the
employee-confirmed amount when the QR did not lock one. For manual UPI IDs,
EasyPay requires the real vendor name and does not invent a merchant code,
transaction ID, acquiring-bank reference, or signature. A copy-and-confirm
fallback remains available when the selected UPI app declines the intent.

Before launching the UPI app, EasyPay stores the pending expense in the current
browser session. When the employee returns, the expense form resumes and asks
for the UPI transaction ID/UTR. A generic browser `upi://pay` handoff does not
provide a trustworthy transaction-status callback; automatic confirmation
requires an approved PSP/payment-gateway backend with authenticated callbacks
and status APIs.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Build

```bash
npm run build
```

# EasyPay

EasyPay is a mobile-first workplace payment app for employee piti contributions
and other organisation payments.

## Production web flow

- Employee payment dashboard
- Vendor UPI QR scanning through the phone camera
- QR image upload and manual vendor UPI ID fallback
- Payments to a 10-digit mobile number registered as an interoperable UPI Number
- Handoff to PhonePe, Google Pay, BHIM, or another installed UPI app
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
their UPI Number. EasyPay does not guess a UPI handle from a mobile number; the
employee must verify the recipient resolved by their UPI app before authorising.

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

export type VendorUpi = {
  recipientType: "vpa" | "upi-number";
  raw: string;
  vpa: string;
  name: string;
  amount: string;
  amountLocked: boolean;
  note: string;
  reference: string;
  merchantCode: string;
};

export function parseUpiQr(rawValue: string): VendorUpi {
  const raw = rawValue.trim();
  let uri: URL;

  try {
    uri = new URL(raw);
  } catch {
    throw new Error("This QR code does not contain a valid UPI payment link.");
  }

  if (uri.protocol.toLowerCase() !== "upi:" || uri.hostname.toLowerCase() !== "pay") {
    throw new Error("Please scan a vendor UPI payment QR code.");
  }

  const vpa = uri.searchParams.get("pa")?.trim() ?? "";
  if (!vpa || !/^[\w.+-]+@[\w.-]+$/i.test(vpa)) {
    throw new Error("The QR code is missing a valid vendor UPI ID.");
  }

  const currency = uri.searchParams.get("cu");
  if (currency && currency.toUpperCase() !== "INR") {
    throw new Error("EasyPay currently supports INR vendor payments only.");
  }

  const amount = uri.searchParams.get("am")?.trim() ?? "";
  if (amount && (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0)) {
    throw new Error("The amount encoded in this QR code is invalid.");
  }

  return {
    recipientType: "vpa",
    raw,
    vpa,
    name: uri.searchParams.get("pn")?.trim() || "UPI vendor",
    amount,
    amountLocked: Boolean(amount),
    note: uri.searchParams.get("tn")?.trim() ?? "",
    reference: uri.searchParams.get("tr")?.trim() ?? "",
    merchantCode: uri.searchParams.get("mc")?.trim() ?? "",
  };
}

export function createUpiNumberRecipient(phoneNumber: string): VendorUpi {
  const number = phoneNumber.replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(number)) {
    throw new Error("Enter a valid 10-digit Indian mobile number.");
  }

  return {
    recipientType: "upi-number",
    raw: `upi-number:${number}`,
    vpa: number,
    name: "UPI Number recipient",
    amount: "",
    amountLocked: false,
    note: "",
    reference: "",
    merchantCode: "",
  };
}

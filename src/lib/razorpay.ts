/** Basic-auth header for Razorpay's REST API — no SDK, just Key Id : Key Secret. */
export function razorpayAuthHeader(): string | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

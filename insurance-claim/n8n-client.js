const N8N_WEBHOOK_URL = 'https://goldenflow.app.n8n.cloud/webhook/insurance-claim';

/**
 * Submits a fully-analysed claim to n8n and returns the confirmed routing decision.
 *
 * @param {{ claim, intake, classification, routing }} payload  Full crew-agents output
 * @returns {Promise<{ status, client_number, client_name, route_to, route_reason,
 *                     priority, damage_type, severity, fraud_risk, requires_human_review }>}
 * @throws {{ status: 'rejected', reason: string, client_number: string }} on 4xx
 */
export async function submitClaimToN8n(payload) {
  const response = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw Object.assign(new Error(data.reason ?? 'Claim rejected by n8n'), data);
  }

  return data;
}

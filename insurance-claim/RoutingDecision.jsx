import { useState } from 'react';
import { submitClaimToN8n } from './n8n-client.js';

/**
 * Drop-in replacement for any component that was showing the routing decision
 * directly from crew-agents output.
 *
 * Usage:
 *   <RoutingDecision payload={crewAgentsResult} />
 *
 * Where `payload` is the full { claim, intake, classification, routing } object
 * produced by the crew-agents pipeline.
 */
export function RoutingDecision({ payload }) {
  const [state, setState] = useState('idle'); // idle | loading | accepted | rejected | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    setState('loading');
    setError(null);
    try {
      const data = await submitClaimToN8n(payload);
      setResult(data);
      setState(data.status === 'rejected' ? 'rejected' : 'accepted');
    } catch (err) {
      setError(err.reason ?? err.message ?? 'Unexpected error');
      setState(err.status === 'rejected' ? 'rejected' : 'error');
      if (err.status === 'rejected') setResult(err);
    }
  }

  if (state === 'idle') {
    return (
      <button onClick={handleSubmit} style={styles.submitBtn}>
        Confirm &amp; Submit to n8n
      </button>
    );
  }

  if (state === 'loading') {
    return (
      <div style={styles.card}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Submitting claim — waiting for n8n confirmation…</p>
      </div>
    );
  }

  if (state === 'rejected') {
    return (
      <div style={{ ...styles.card, borderColor: '#f85149' }}>
        <h3 style={{ ...styles.heading, color: '#f85149' }}>Claim Rejected</h3>
        <p style={styles.label}>Reason</p>
        <p style={styles.value}>{result?.reason ?? error}</p>
        <p style={styles.label}>Client number</p>
        <p style={styles.value}>{result?.client_number ?? payload?.claim?.client_number}</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div style={{ ...styles.card, borderColor: '#e3b341' }}>
        <h3 style={{ ...styles.heading, color: '#e3b341' }}>Submission Error</h3>
        <p style={styles.value}>{error}</p>
        <button onClick={handleSubmit} style={{ ...styles.submitBtn, marginTop: 12 }}>
          Retry
        </button>
      </div>
    );
  }

  // accepted
  return (
    <div style={styles.card}>
      <h3 style={styles.heading}>Routing Decision</h3>

      <div style={styles.grid}>
        <Field label="Route to"     value={result.route_to} />
        <Field label="Reason"       value={result.route_reason} />
        <Field label="Priority"     value={result.priority}    badge badgeColor={priorityColor(result.priority)} />
        <Field label="Damage type"  value={result.damage_type} />
        <Field label="Severity"     value={result.severity}    badge badgeColor={severityColor(result.severity)} />
        <Field label="Fraud risk"   value={result.fraud_risk}  badge badgeColor={fraudColor(result.fraud_risk)} />
      </div>

      {result.requires_human_review && (
        <div style={styles.reviewBanner}>
          ⚠ Flagged for human review
        </div>
      )}
    </div>
  );
}

function Field({ label, value, badge, badgeColor }) {
  return (
    <div style={styles.field}>
      <span style={styles.label}>{label}</span>
      {badge
        ? <span style={{ ...styles.badge, background: badgeColor }}>{value}</span>
        : <span style={styles.value}>{value ?? '—'}</span>
      }
    </div>
  );
}

function priorityColor(p) {
  return p === 'high' ? '#f85149' : p === 'normal' ? '#3fb950' : '#8b949e';
}
function severityColor(s) {
  return s === 'severe' || s === 'high' ? '#f85149' : s === 'medium' ? '#e3b341' : '#3fb950';
}
function fraudColor(f) {
  return f === 'high' ? '#f85149' : f === 'medium' ? '#e3b341' : '#3fb950';
}

const styles = {
  card: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 8,
    padding: 20,
    fontFamily: 'inherit',
  },
  heading: {
    margin: '0 0 16px',
    fontSize: 16,
    fontWeight: 600,
    color: '#e6edf3',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px 24px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  label: {
    fontSize: 11,
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  value: {
    fontSize: 14,
    color: '#e6edf3',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
    width: 'fit-content',
  },
  reviewBanner: {
    marginTop: 14,
    padding: '8px 12px',
    background: '#2d1e00',
    border: '1px solid #e3b341',
    borderRadius: 6,
    color: '#e3b341',
    fontSize: 13,
  },
  submitBtn: {
    padding: '8px 18px',
    background: '#238636',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    cursor: 'pointer',
  },
  spinner: {
    width: 28,
    height: 28,
    border: '3px solid #30363d',
    borderTopColor: '#58a6ff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 12px',
  },
  loadingText: {
    color: '#8b949e',
    fontSize: 14,
    textAlign: 'center',
    margin: 0,
  },
};

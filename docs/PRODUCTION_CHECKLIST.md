# 🚀 Snackzo Production Hardening & Launch Checklist

This checklist acts as a final gatekeeper before allowing real users onto the Snackzo platform.

## 🏗 Infrastructure & Environment
- [ ] **Environment Separation**: Ensure `dev`, `staging`, and `prod` environments are completely isolated (separate DBs, separate API keys).
- [ ] **Secure Variables**: Verify no secrets (`SERVICE_ROLE_KEY`, `PAYMENT_SECRET`) are leaking in frontend bundles. Use `VITE_` prefix cautiously.
- [ ] **HTTPS Enforcement**: `Strict-Transport-Security` (HSTS) header is active (max-age=63072000; includeSubDomains; preload).
- [ ] **Cloudflare WAF**: Managed Ruleset is ENABLED. Bot Fight Mode is ON.
- [ ] **CDN Optimization**: Assets are being cached by Cloudflare/Vercel Edge.

## 🔒 Database & Data Integrity
- [ ] **RLS Verification**: Run the "Simulated Attack Plan" to confirm users cannot access others' data.
- [ ] **Backup Strategy**: Daily Point-in-Time Recovery (PITR) is active in Supabase.
- [ ] **Encryption**: Confirm all sensitive columns (if any beyond standard) are encrypted at rest.
- [ ] **Connection Pooling**: Use Supabase Transaction Mode (Supavisor) for high-scale connection handling.

## 🛡️ Access Control & Authentication
- [ ] **Admin Protection**: Confirm `/admin` routes reject non-admin users immediately.
- [ ] **Rate Limiting**: Verify `check_rate_limit` function is blocking repeated failed logins/OTPs.
- [ ] **Account Locking**: Confirm accounts lock after 5 failed attempts.
- [ ] **Session Timeout**: Ensure JWT expiry is set to a reasonable limit (e.g., 1 hour access, 2 weeks refresh).

## 💸 Payment & Financial Security
- [ ] **Tamper Proofing**: Confirm prices are calculated server-side, not trusted from frontend payload.
- [ ] **Idempotency**: Ensure double-clicking "Pay" doesn't charge/deduct wallet twice.
- [ ] **Webhook Validation**: If using real gateways, verify webhook signatures are strictly checked.
- [ ] **Demo Separation**: Ensure "Test Mode" payments cannot trigger real "Order Success" in Production environment.

## 📊 Monitoring & Observability
- [ ] **Audit Logs**: Verify `security_audit_logs` is capturing critical events (Role change, Money movement).
- [ ] **Error Tracking**: Integration with Sentry/LogRocket is active (clean of sensitive PII).
- [ ] **Alerting**: Set up database CPU/RAM alerts in Supabase dashboard.

## 🚦 Rollback & Failure Management
- [ ] **Deployment Strategy**: Use Vercel's "Instant Rollback" feature if a bad deploy goes live.
- [ ] **Database Migrations**: Ensure all SQL migrations are non-breaking or have a `down` script.

---
**Sign-off required by:** CTO / Security Lead

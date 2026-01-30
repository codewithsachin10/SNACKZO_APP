# 🧪 Snackzo Internal Security Testing Plan

**Objective**: Simulate malicious activity to verify defenses are working.
**Scope**: Internal testing ONLY. Do not perform these tests on Production if real users are active. Use Staging.

## 1. Authentication Attacks
### 🔨 Brute Force Login
- **Test**: Attempt to login with a user email 10 times in 1 minute with wrong passwords.
- **Expected**: After 5 attempts, the system should return a 429 Too Many Requests or specific "Locked" error.
- **Check**: Look at `rate_limit_tracking` table to see the blocked attempts.

### 🔨 OTP Bypass
- **Test**: Request an OTP, then try to verify with random 6-digit codes (000000, 111111, etc.).
- **Expected**: Verification fails. Rate limit kicks in after 3-5 incorrect tries.

## 2. Authorization & Access Control
### 🔨 IDOR (Insecure Direct Object Reference)
- **Test**: Login as User A. Capture the API request for fetching an order (e.g., `/rest/v1/orders?id=eq.ORDER_ID_OF_USER_B`).
- **Expected**: Database should return 0 rows or 403 Forbidden.
- **Check**: Users must NEVER see orders they don't own.

### 🔨 Unauthorized Admin Access
- **Test**: As a normal user, try to navigate to `/admin` or manually fetch `/rest/v1/admin_dashboard_stats`.
- **Expected**: Immediate redirect to Home or 403 Forbidden error.

## 3. Financial Manipulation
### 🔨 Wallet Theft (Self-Update)
- **Test**: Use Supabase Client (in browser console) to run: 
  `supabase.from('profiles').update({ wallet_balance: 1000000 }).eq('id', 'MY_ID')`
- **Expected**: 403 Forbidden / Policy Violation.
- **Reason**: RLS policy should prevent users from updating their own `wallet_balance`.

### 🔨 Order Price Tampering
- **Test**: Intercept the "Create Order" network request. Change the item price to `0.1`.
- **Expected**: Backend (Trigger/Function) should recalculate price based on Product DB price, OR the insert should fail validation.

## 4. Input Validation
### 🔨 XSS in Profile Name
- **Test**: Update profile name to: `<script>alert('HACKED')</script>`.
- **Expected**: The name should be saved as text, but when displayed, it should NOT execute the alert. Zod should sanitise it or React should escape it.

### 🔨 SQL Injection
- **Test**: Input `' OR 1=1 --` into the Search bar or Login fields.
- **Expected**: App should handle it gracefully (Supabase/Postgres is inherently protected against this if using variable binding, which JS library does).

## 5. Snackzo Pay "Free Money" Glitch
### 🔨 Fake Success Callback
- **Test**: Manually call the `onSuccess` JavaScript function from the browser console while on the payment page.
- **Expected**: The frontend moves to "Success" UI, BUT the backend order status remains "Pending" because no secure server verification happened.

---
**Run Frequency**:
- Before every major release.
- Monthly scheduled audit.

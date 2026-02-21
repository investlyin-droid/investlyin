# Google & Apple Authentication – Audit & Production Readiness

This document summarizes the full audit, fixes, and validation of Firebase-based Google and Apple sign-in for the trading platform.

---

## 1. Root Causes Addressed

| Issue | Root cause | Fix |
|-------|------------|-----|
| Hardcoded Firebase config | Frontend used fallback API key and project IDs, exposing a fixed project in production | Removed all fallbacks; config comes only from `NEXT_PUBLIC_FIREBASE_*` env vars. Added `isFirebaseConfigMissing()` and guard in Google/Apple methods. |
| Post-login not redirecting | Client-side `router.push` could run before cookie was sent; middleware saw unauthenticated request | Email/password and OAuth success now use `window.location.replace(path)` after a short delay (150–200 ms) so cookie is set before navigation. |
| OAuth redirect back to login | `getRedirectResult()` often returns null (e.g. sessionStorage); only waited for Firebase user when URL had OAuth params | On login/register, when redirect result is null we now always wait up to 5 s for Firebase user (and poll), then sync with backend and redirect. |
| Token in error responses | Backend could expose raw Firebase error message including token details | `firebase.service.ts` now returns generic messages (e.g. "Session expired", "Invalid token") and never logs or returns the token. |
| Logout not clearing session | `router.push('/login')` did not force a full load; cookie could still be sent on next request | Logout clears cookie and storage first, then uses `window.location.href = '/login'` so middleware sees unauthenticated state. |
| No rate limiting on auth | Auth endpoints were only under global throttling | `firebase-login`: 20 req/min per IP; `firebase-register`: 10 req/min per IP via `@Throttle`. |

---

## 2. Authentication Flow (Button Click → Session)

### 2.1 Email/password login

1. User submits email/password on `/login`.
2. Frontend: `FirebaseAuthService.signIn()` → Firebase Auth → `getIdToken()`.
3. Frontend: `POST /auth/firebase-login` with `firebaseToken`, optional `email`, `displayName`.
4. Backend: `FirebaseService.verifyToken(firebaseToken)` → Firebase Admin `verifyIdToken()` (rejects invalid/expired).
5. Backend: `FirestoreUsersService.findOneByFirebaseUid(uid)`; if not found, find by email or create new user in Firestore (doc id = Firebase UID).
6. Backend: Returns JWT + user (role from backend/Firestore; admin allowlist applied).
7. Frontend: `persistAuth(access_token, user)` → localStorage + `auth_token` cookie.
8. Frontend: `setTimeout(() => window.location.replace(path), 150)` → full navigation to `/dashboard` (or `/admin` for allowed admins).
9. Middleware: Sees `auth_token` cookie, allows access.

### 2.2 Google / Apple (redirect flow)

1. User clicks "Google" or "Apple" on `/login` or `/register`.
2. Frontend: `isFirebaseConfigMissing()` checked; if missing, error and buttons disabled.
3. Frontend: `signInWithRedirect(auth, provider)` → browser redirects to Google/Apple.
4. User signs in and consents; redirects back to app (e.g. `/login` or `/register`).
5. On load: `handleRedirectResult()`:
   - Calls `getRedirectResult(auth)`. If it returns a result: get ID token → `POST /auth/firebase-login` → persist auth → `redirectAfterAuth(path)` (200 ms then `window.location.replace`).
   - If `getRedirectResult()` returns null (e.g. sessionStorage): on login/register we wait up to 5 s for Firebase user via `waitForFirebaseUser(5000)`, then same sync + `redirectAfterAuth(path)`.
6. Backend: Same as 2.1 (verify token, find or create user, return JWT).
7. Cookie set; full redirect to dashboard/admin.

### 2.3 Logout

1. Frontend: Clear token/user from state, localStorage, and `auth_token` cookie.
2. Firebase: `signOut(auth)`.
3. `window.location.href = '/login'` so the next request has no cookie and middleware redirects to login if needed.

---

## 3. Backend Verification (Critical)

- **Firebase Admin**: Initialized from `FIREBASE_SERVICE_ACCOUNT_PATH`, `FIREBASE_SERVICE_ACCOUNT_JSON`, or `GOOGLE_APPLICATION_CREDENTIALS`. No token verification without credentials.
- **ID token**: Only validated with `admin.auth().verifyIdToken(idToken)`. Invalid/expired tokens are rejected; no token or payload logged.
- **User record**: Lookup by Firebase UID in Firestore; if missing, by email (account linking) or new user creation. Role comes from Firestore/backend; admin allowlist enforced.
- **No trust of frontend**: Role and identity come from verified token and Firestore only.

---

## 4. Database / User Handling

- **Firestore** (used for auth user records): Document ID = Firebase UID. Fields include email, firstName, lastName, role, isEmailVerified, isActive, etc.
- **Account linking**: If login presents a new Firebase UID but same email as existing user, backend creates a new Firestore doc for that UID with same email/role/profile (same person, different provider).
- **Apple missing email**: Backend uses `email` from request or decoded token; if both missing, uses `uid + '@oauth.local'`.
- **Duplicate prevention**: Register checks `findOneByEmail` and returns error if email exists. Login creates by UID or links by email.

---

## 5. Edge Cases Handled

- **Account exists with different credential**: Firebase error formatted as "An account already exists with this email using a different sign-in method. Please use that method instead."
- **Token expiration**: Backend returns "Session expired. Please sign in again."; frontend 401 handler can trigger logout.
- **Firebase not configured**: `isFirebaseConfigMissing()` disables Google/Apple buttons and shows banner; `signInWithGoogle`/`signInWithApple` throw clear error if called.
- **Popup blocked**: Not applicable; redirect flow is used.
- **User cancels**: Redirect returns to app without result; no crash; user remains on login.
- **Network failure**: Backend sync failure throws; frontend shows error message.
- **Rate limiting**: Auth endpoints have per-IP limits; excess returns 429.

---

## 6. Security Hardening

- **No hardcoded secrets**: Firebase client config from env only (no fallback API keys).
- **Tokens**: Verified server-side only; never logged; generic error messages on failure.
- **CORS**: Backend uses `ALLOWED_ORIGINS`; production must set it.
- **Cookies**: `auth_token` with path `/`, SameSite=Lax, Secure in production; used by middleware for protected routes.
- **Rate limiting**: Stricter limits on `POST /auth/firebase-login` and `POST /auth/firebase-register`.
- **Logout**: Full navigation after clearing cookie so no stale session.

---

## 7. Production Checklist

- [ ] Set all `NEXT_PUBLIC_FIREBASE_*` in frontend env (apiKey, authDomain, projectId, appId, etc.).
- [ ] Enable Google and Apple providers in Firebase Console → Authentication → Sign-in method.
- [ ] Add production domain to Firebase authorized domains.
- [ ] Configure backend: `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_SERVICE_ACCOUNT_JSON`, `JWT_SECRET`, `ALLOWED_ORIGINS`, `MONGO_URI`.
- [ ] Ensure HTTPS in production (cookie Secure, CORS origins).

---

## 8. Confirmation

**Google & Apple Auth – Production-Oriented**

- Firebase config is env-only and guarded when missing.
- Google and Apple use redirect flow; post-OAuth redirect and cookie timing are fixed.
- Backend verifies ID tokens only; no token in logs; user/role from Firestore.
- Account linking, missing email (Apple), and logout are handled.
- Rate limiting and safe error messages are in place.

Deploy with the production checklist above and test in staging (and production) on real domains and browsers (including incognito and mobile) before going live.

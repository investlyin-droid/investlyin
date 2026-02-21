# Firebase Admin credentials setup

Your backend needs a **Firebase service account** so it can verify ID tokens. Use one of these methods. **Never commit the JSON file or paste the key into source code.**

## Option 1: JSON file (recommended for local dev)

1. Save your service account JSON as a file **outside** the repo or in a folder that is gitignored, for example:
   - `backend/keys/firebase-service-account.json` (the `keys/` folder is in `.gitignore`), or
   - Any path like `C:\secrets\exchange-f2346-firebase-adminsdk.json` (Windows) or `~/secrets/firebase-adminsdk.json` (Mac/Linux).

2. In `backend/.env` set:
   ```env
   FIREBASE_PROJECT_ID=exchange-f2346
   FIREBASE_SERVICE_ACCOUNT_PATH=./keys/firebase-service-account.json
   ```
   (Use an absolute path if you saved the file outside the backend folder.)

3. Restart the backend. You should see: `Firebase Admin initialized with service account file`.

## Option 2: JSON in environment variable (e.g. production / PaaS)

**Option 2a – Base64 (recommended for .env, no quote issues)**

1. Minify your service account JSON to one line, then Base64-encode it (e.g. [base64encode.org](https://www.base64encode.org/) or in Node: `Buffer.from(JSON.stringify(obj)).toString('base64')`).
2. In `backend/.env` or your host’s env:
   ```env
   FIREBASE_PROJECT_ID=exchange-f2346
   FIREBASE_SERVICE_ACCOUNT_JSON=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJvamVjdF9pZCI6...
   ```
   (Paste your full Base64 string; if the variable name is `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64`, that works too.)

**Option 2b – Raw JSON**

Use a **single-quoted** value so inner double quotes don’t break parsing:
   ```env
   FIREBASE_PROJECT_ID=exchange-f2346
   FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"exchange-f2346",...}'
   ```
   (Paste the entire minified JSON inside the single quotes.)

3. Restart the backend. You should see: `Firebase Admin initialized with service account JSON`.

## Option 3: GOOGLE_APPLICATION_CREDENTIALS

If you prefer the standard Google env var:

```env
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/your-serviceAccountKey.json
FIREBASE_PROJECT_ID=exchange-f2346
```

---

After setup, the “No service account credentials found” warning should disappear and token verification will work.

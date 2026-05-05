# Environment Variables Template

This file shows all required environment variables.
**Do NOT commit this to GitHub**

## For Local Development: 
Create files:
- `backend/.env.local`
- `twiller_clone/.env.local`

## For Production (Vercel/Render):
Add variables through dashboard UI (never paste .env files)

---

## BACKEND ENVIRONMENT VARIABLES

File: `backend/.env.local`

```env
# Server Configuration
PORT=5000

# Database (MongoDB Atlas)
MONGODB_URL=mongodb+srv://twitter_user:YOUR_PASSWORD@cluster0.mongodb.net/twitter_clone?retryWrites=true&w=majority

# Firebase Admin (Backend Only - Server Secret)
# This is the full service account JSON from Firebase
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"twittterr-6789a","private_key_id":"key123","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk@project.iam.gserviceaccount.com","client_id":"123456","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs"}

# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXX
RAZORPAY_KEY_SECRET=abcdef123456

# SMS Service (Twilio) - Optional
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### How to Get Backend Variables:

**MONGODB_URL**:
1. Go to MongoDB Atlas
2. Clusters > Connect > Drivers > Node.js
3. Copy connection string
4. Replace `<password>` with database password

**FIREBASE_SERVICE_ACCOUNT**:
1. Firebase Console > Project Settings > Service Accounts
2. Generate New Private Key (downloads JSON)
3. Copy entire contents as one line (remove newlines, replace \n with \\n)
4. Or keep multi-line (Node.js will handle it)

**RAZORPAY_KEY_ID & SECRET**:
1. Razorpay Dashboard > Settings > API Keys
2. Copy Key ID and Key Secret
3. Use test keys during development

**TWILIO Variables**:
1. Twilio Console > Account
2. Copy Account SID and Auth Token
3. Find your Twilio phone number

---

## FRONTEND ENVIRONMENT VARIABLES

File: `twiller_clone/.env.local`

```env
# Backend API Endpoint
# For local dev:
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000

# For production (replace with actual Render URL):
# NEXT_PUBLIC_BACKEND_URL=https://twitter-clone-backend-abc.onrender.com

# Firebase Configuration (Public Keys Only - SAFE for frontend)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDkME-tf57YlideGfQ30gaGD3FTWbyK9rg
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=twittterr-6789a.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=twittterr-6789a
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=twittterr-6789a.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=109926979644
NEXT_PUBLIC_FIREBASE_APP_ID=1:109926979644:web:757ac4d0d85b3ec9ca8b39
```

### How to Get Frontend Variables:

**NEXT_PUBLIC_BACKEND_URL**:
- Local: `http://localhost:5000`
- Production: `https://your-backend.onrender.com`

**NEXT_PUBLIC_FIREBASE_***:
1. Firebase Console > Project Settings
2. Under "Your apps" > Web app
3. Copy the config object
4. Map each field to env variable:
   - `apiKey` → `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `authDomain` → `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `projectId` → `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `storageBucket` → `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` → `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` → `NEXT_PUBLIC_FIREBASE_APP_ID`

---

## Environment Variable Rules

### Backend (.env - Server Only, Secure)
- ✅ Can contain secrets
- ✅ NOT accessible from browser
- ✅ Safe to store API keys, passwords
- ✅ Examples: database passwords, private API keys

### Frontend (NEXT_PUBLIC_* - Browser, Public)
- ❌ NEVER store secrets here
- ✅ Accessible from browser (visible in DevTools)
- ✅ Can store Firebase public keys, API endpoints
- ✅ Prefix MUST be `NEXT_PUBLIC_`

---

## Common Issues

### "FIREBASE_SERVICE_ACCOUNT is not valid JSON"
**Solution**: 
- Ensure JSON is valid (use jsonlint.com)
- Escape newlines: \n in the JSON
- For Node.js, multi-line JSON in .env is fine

### "Request failed with status code 404"
**Solution**:
- Check `NEXT_PUBLIC_BACKEND_URL` is correct
- Ensure backend is running
- Backend should respond to GET /

### "Socket connection error"
**Solution**:
- Check `NEXT_PUBLIC_BACKEND_URL` matches backend host:port
- Verify backend has Socket.IO configured
- Check CORS settings in backend

### "Firebase: Error (auth/invalid-api-key)"
**Solution**:
- Verify all `NEXT_PUBLIC_FIREBASE_*` values match Firebase Console
- Check for typos and trailing spaces
- Ensure Firebase project is active

---

## Production Deployment

### For Vercel (Frontend):
1. Go to Vercel > Dashboard > Settings > Environment Variables
2. Add all `NEXT_PUBLIC_FIREBASE_*` variables
3. Set `NEXT_PUBLIC_BACKEND_URL` to your Render backend URL
4. Redeploy after adding variables

### For Render (Backend):
1. Go to Render > Dashboard > Service Settings > Environment
2. Add all backend variables (PORT, MONGODB_URL, etc.)
3. Save and redeploy
4. Verify: visit backend URL, should see "Twitter backend is running ✅"

### For MongoDB Atlas (Database):
1. Network Access > Allow 0.0.0.0/0 (for dev)
2. In production: restrict to Render server IP
3. Get IP from Render dashboard

---

## Security Best Practices

1. **Never commit .env files** - Use .gitignore (already configured)
2. **Rotate keys regularly** - Especially for production
3. **Use different keys for dev/prod** - Don't reuse test keys in production
4. **Restrict database access** - MongoDB: whitelist Render IP only in prod
5. **Enable 2FA** - On Firebase, Razorpay, MongoDB accounts
6. **Monitor usage** - Set up alerts for unusual activity
7. **Keep backups** - Export database regularly

---

Last Updated: May 2026

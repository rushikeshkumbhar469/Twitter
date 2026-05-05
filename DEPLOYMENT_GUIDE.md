# Twitter Clone - Complete Deployment Guide

This guide covers deploying your Twitter Clone application to **Vercel** (frontend) and **Render** (backend) with full production setup.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup (MongoDB Atlas)](#database-setup-mongodb-atlas)
5. [Firebase Setup](#firebase-setup)
6. [Razorpay Integration](#razorpay-integration)
7. [Vercel Deployment (Frontend)](#vercel-deployment-frontend)
8. [Render Deployment (Backend)](#render-deployment-backend)
9. [Post-Deployment Configuration](#post-deployment-configuration)
10. [Testing & Troubleshooting](#testing--troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- **GitHub Account** (for version control)
- **Vercel Account** (for frontend hosting) - www.vercel.com
- **Render Account** (for backend hosting) - www.render.com
- **MongoDB Atlas Account** (for database) - www.mongodb.com/cloud/atlas
- **Firebase Account** (for authentication) - www.firebase.google.com
- **Razorpay Account** (for payments) - www.razorpay.com
- **Node.js v16+** (local development)
- **Git** (version control)

---

## Local Development Setup

### 1. Clone or Initialize Repository

```bash
# If cloning from GitHub
git clone <your-repo-url>
cd Twitter

# If initializing new repo
git init
```

### 2. Install Dependencies

```bash
# Frontend dependencies
cd twiller_clone
npm install

# Backend dependencies (in separate terminal)
cd backend
npm install
```

### 3. Create Environment Files

Copy `.env.example` files to `.env.local`:

```bash
# Frontend
cp twiller_clone/.env.example twiller_clone/.env.local

# Backend
cp backend/.env.example backend/.env.local
```

### 4. Configure Local Environment Variables

#### Frontend - `twiller_clone/.env.local`

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
```

#### Backend - `backend/.env.local`

```env
PORT=5000
MONGODB_URL=your_mongodb_connection_string
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
```

### 5. Run Locally

```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend
cd twiller_clone
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## Environment Configuration

### Understanding Environment Variables

**Frontend (NEXT_PUBLIC_*)**
- Prefix `NEXT_PUBLIC_` makes these variables accessible in the browser
- **Never** expose secrets like API keys in frontend envs
- Only include Firebase public keys and backend URL

**Backend**
- Environment variables are server-only and secure
- Can contain secrets (API keys, database credentials)
- Not exposed to the browser

### Variable Reference

| Variable | Type | Where | Purpose |
|----------|------|-------|---------|
| `NEXT_PUBLIC_BACKEND_URL` | Frontend | Browser | Backend API endpoint for axios |
| `NEXT_PUBLIC_FIREBASE_*` | Frontend | Browser | Firebase authentication keys |
| `PORT` | Backend | Server | Server port (default: 5000) |
| `MONGODB_URL` | Backend | Server | MongoDB database connection |
| `FIREBASE_SERVICE_ACCOUNT` | Backend | Server | Firebase admin credentials |
| `RAZORPAY_KEY_ID` | Backend | Server | Razorpay public key |
| `RAZORPAY_KEY_SECRET` | Backend | Server | Razorpay secret key |
| `TWILIO_ACCOUNT_SID` | Backend | Server | Twilio account ID |
| `TWILIO_AUTH_TOKEN` | Backend | Server | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Backend | Server | Twilio phone for SMS |

---

## Database Setup (MongoDB Atlas)

### Step 1: Create MongoDB Account
1. Go to www.mongodb.com/cloud/atlas
2. Sign up for free account
3. Create a new project named "twitter-clone"

### Step 2: Create Cluster
1. Click "Create Deployment"
2. Choose "Shared Cluster" (free tier)
3. Select region closest to your users
4. Wait for cluster to be created (5-10 minutes)

### Step 3: Setup Security
1. Go to **Network Access**
   - Click **Add IP Address**
   - Add `0.0.0.0/0` to allow all IPs (for testing)
   - In production, restrict to your Render server IP

2. Go to **Database Access**
   - Click **Create Database User**
   - Username: `twitter_user`
   - Password: Generate secure password (copy it!)
   - Save credentials for later

### Step 4: Get Connection String
1. Click **Connect** button on your cluster
2. Choose **Drivers** > **Node.js**
3. Copy the connection string
4. Replace `<password>` with your actual password
5. Replace `myFirstDatabase` with `twitter_clone`

**Example connection string:**
```
mongodb+srv://twitter_user:your_password@cluster0.mongodb.net/twitter_clone?retryWrites=true&w=majority
```

### Step 5: Create Collections
The backend will auto-create collections when you start it. But you can pre-create them:

In MongoDB Atlas:
1. Go to **Collections**
2. Click **Create Database**
3. Database: `twitter_clone`
4. Collections: (leave empty - will be auto-created)

---

## Firebase Setup

### Step 1: Create Firebase Project
1. Go to www.firebase.google.com
2. Click **Go to console**
3. Click **Create a project**
4. Project name: `twitter-clone`
5. Accept terms and create

### Step 2: Enable Authentication
1. In left sidebar, go to **Authentication**
2. Click **Get started**
3. Enable **Email/Password** provider
   - Click the **Email/Password** option
   - Toggle **Enabled** ON
   - Save

### Step 3: Get Firebase Config
1. Go to **Project Settings** (gear icon)
2. Under **Your apps**, find or create Web app
3. Copy the config object:

```javascript
{
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
}
```

4. Add these to `twiller_clone/.env.local` as:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - etc.

### Step 4: Generate Admin Credentials (Backend)
1. Go to **Project Settings** > **Service Accounts**
2. Click **Generate New Private Key**
3. A JSON file downloads - this is your `FIREBASE_SERVICE_ACCOUNT`
4. Copy the entire JSON content
5. Add to `backend/.env.local` as one line:

```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
```

---

## Razorpay Integration

### Step 1: Create Razorpay Account
1. Go to www.razorpay.com
2. Sign up
3. Verify email and complete KYC

### Step 2: Get API Keys
1. Go to **Dashboard** > **Settings** > **API Keys**
2. Copy **Key ID** and **Key Secret**
3. Add to `backend/.env.local`:

```env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

### Step 3: Webhook Configuration (Optional - for production)
1. Go to **Settings** > **Webhooks**
2. Add webhook URL from Render backend: `https://your-backend.onrender.com/webhook/razorpay`
3. Select events: `payment.authorized`, `payment.failed`

---

## Vercel Deployment (Frontend)

### Step 1: Prepare Git Repository
```bash
cd ~/Desktop/TREE/All\ Folders/DOn\'t\ Open\ \!\!/NullClass/Twitter

# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit for deployment"
```

### Step 2: Push to GitHub
1. Go to www.github.com
2. Create new repository: `twitter-clone`
3. Push your code:

```bash
git remote add origin https://github.com/YOUR_USERNAME/twitter-clone.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Vercel
1. Go to www.vercel.com
2. Click **Import Project**
3. Connect GitHub account
4. Select `twitter-clone` repository
5. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `twiller_clone`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### Step 4: Add Environment Variables to Vercel
1. In the deployment settings, go to **Environment Variables**
2. Add these variables:

```
NEXT_PUBLIC_BACKEND_URL=https://your-backend-name.onrender.com
NEXT_PUBLIC_FIREBASE_API_KEY=***
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=***
NEXT_PUBLIC_FIREBASE_PROJECT_ID=***
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=***
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=***
NEXT_PUBLIC_FIREBASE_APP_ID=***
```

### Step 5: Deploy
1. Click **Deploy**
2. Wait for build to complete
3. Your site will be at: `https://twitter-clone-xyz.vercel.app`

---

## Render Deployment (Backend)

### Step 1: Prepare Backend for Production
1. Update `backend/.env.local` with production values
2. Ensure `backend/package.json` has correct start script:

```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  }
}
```

### Step 2: Push Backend to Separate Branch (Optional)
```bash
# Create a deploy branch with only backend files
git checkout -b render-deploy
git rm -r twiller_clone .gitignore README.md
mv backend/* .
git commit -m "Backend deployment"
git push origin render-deploy
```

**Or** push full repo - Render can handle monorepo.

### Step 3: Deploy to Render
1. Go to www.render.com
2. Sign up with GitHub
3. Click **New** > **Web Service**
4. Connect GitHub repository
5. Configure:
   - **Name**: `twitter-clone-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: `backend` (if monorepo)

### Step 4: Add Environment Variables to Render
1. Go to **Environment** section
2. Add these variables:

```
PORT=5000
MONGODB_URL=mongodb+srv://twitter_user:PASSWORD@cluster0.mongodb.net/twitter_clone?retryWrites=true&w=majority
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
RAZORPAY_KEY_ID=***
RAZORPAY_KEY_SECRET=***
TWILIO_ACCOUNT_SID=***
TWILIO_AUTH_TOKEN=***
TWILIO_PHONE_NUMBER=+1234567890
```

### Step 5: Deploy
1. Click **Create Web Service**
2. Wait for deployment (2-5 minutes)
3. Your backend will be at: `https://twitter-clone-backend-abc.onrender.com`

### Step 6: Update Frontend Backend URL
1. Go back to Vercel
2. Update `NEXT_PUBLIC_BACKEND_URL` to Render URL
3. Redeploy frontend

---

## Post-Deployment Configuration

### Step 1: Update Firebase Console
1. Go to Firebase Console
2. Project Settings > Authorized Domains
3. Add your Vercel domain:
   - `twitter-clone-xyz.vercel.app`

### Step 2: Update CORS in Backend
If you get CORS errors, update `backend/index.js`:

```javascript
const io = new Server(httpServer, {
  cors: {
    origin: [
      "https://twitter-clone-xyz.vercel.app",
      "https://twitter-clone-backend-abc.onrender.com",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors({
  origin: ["https://twitter-clone-xyz.vercel.app", "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true,
}));
```

### Step 3: Verify Backend Health
1. Visit: `https://your-backend.onrender.com/`
2. Should see: "Twitter backend is running ✅"

### Step 4: Test Socket Connection
1. Open browser DevTools (F12)
2. Go to frontend
3. Check Console for: "✅ Socket connected"

---

## Testing & Troubleshooting

### Common Errors & Solutions

#### 1. "Request failed with status code 404"
**Cause**: Backend not running or endpoint doesn't exist
**Solution**:
- Ensure Render backend is deployed and running
- Check backend logs in Render dashboard
- Verify `NEXT_PUBLIC_BACKEND_URL` is correct

#### 2. "Socket connect_error: xhr poll error"
**Cause**: Socket.IO can't reach backend
**Solution**:
- Check backend is running: visit backend URL in browser
- Verify CORS configuration in backend
- Check browser console for correct backend URL
- Try: `NEXT_PUBLIC_BACKEND_URL=https://backend-url.onrender.com` (with https)

#### 3. "Firebase: Error (auth/invalid-api-key)"
**Cause**: Wrong or missing Firebase config
**Solution**:
- Double-check all `NEXT_PUBLIC_FIREBASE_*` env vars
- Ensure they match your Firebase project
- Check for typos in the config

#### 4. "MongoDB connection refused"
**Cause**: Connection string is wrong or IP not whitelisted
**Solution**:
- Verify connection string: `mongodb+srv://user:password@...`
- Check MongoDB Atlas > Network Access includes your IP
- For Render, add `0.0.0.0/0` temporarily, then restrict later

#### 5. Feed data disappeared after refresh
**Cause**: Data not persisting to localStorage or API down
**Solution**:
- Ensure localStorage is enabled in browser
- Check API endpoint returns data: visit `/post` in browser
- Check browser DevTools > Application > localStorage

### Test Checklist

After deployment, verify:

- [ ] Frontend loads without errors
- [ ] Can sign up with email/password
- [ ] Can log in
- [ ] Feed displays posts
- [ ] Can create a new post
- [ ] Can follow/unfollow users
- [ ] Messages page loads and can send messages
- [ ] Profile page displays user info
- [ ] Socket.IO connects (check console for ✅)
- [ ] Data persists after page refresh

---

## Production Monitoring

### Vercel Dashboard
- Go to www.vercel.com/dashboard
- Monitor deployments, logs, and performance
- Set up notifications for failed builds

### Render Dashboard
- Go to www.render.com/dashboard
- Monitor backend logs and performance
- Set up auto-deploy on GitHub push

### MongoDB Atlas
- Go to MongoDB Atlas console
- Monitor connection count and memory usage
- Set up alerts for high disk usage

---

## Scaling Tips

As your app grows:

1. **Database**: Upgrade MongoDB to paid tier if over 1GB
2. **Backend**: Upgrade Render plan if hitting CPU/memory limits
3. **Frontend**: Vercel handles auto-scaling
4. **CDN**: Vercel includes global CDN automatically
5. **Caching**: Implement Redis for session caching

---

## Security Checklist

- [ ] Never commit `.env` files to GitHub
- [ ] Use strong MongoDB passwords
- [ ] Restrict MongoDB IP whitelist to Render IP only
- [ ] Enable HTTPS everywhere (Vercel/Render handle this)
- [ ] Rotate API keys regularly
- [ ] Use environment variables for all secrets
- [ ] Enable 2FA on Razorpay, Firebase, MongoDB accounts
- [ ] Review CORS configuration regularly

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Render Docs**: https://render.com/docs
- **MongoDB Docs**: https://docs.mongodb.com
- **Firebase Docs**: https://firebase.google.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Socket.IO Docs**: https://socket.io/docs

---

## Quick Reference Commands

```bash
# Local development
npm install              # Install dependencies
npm run dev             # Start dev server

# Building
npm run build           # Build for production
npm run lint            # Check code quality

# Git
git add .              # Stage changes
git commit -m "msg"    # Commit changes
git push origin main   # Push to GitHub

# Environment
cp .env.example .env.local    # Create local env file
```

---

**Last Updated**: May 2026
**Version**: 1.0

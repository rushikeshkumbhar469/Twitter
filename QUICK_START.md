# Quick Start - Local Development

Get your Twitter Clone running locally in 10 minutes.

## Prerequisites

- Node.js v16+ installed
- MongoDB Atlas account (free tier)
- Firebase project
- `.env.local` files configured (see DEPLOYMENT_GUIDE.md)

## Step 1: Configure Environment Files

### Frontend - `twiller_clone/.env.local`

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_FIREBASE_API_KEY=your_value
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_value
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_value
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_value
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_value
NEXT_PUBLIC_FIREBASE_APP_ID=your_value
```

### Backend - `backend/.env.local`

```env
PORT=5000
MONGODB_URL=mongodb+srv://user:password@cluster.mongodb.net/twitter_clone?retryWrites=true&w=majority
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
TWILIO_ACCOUNT_SID=optional
TWILIO_AUTH_TOKEN=optional
TWILIO_PHONE_NUMBER=optional
```

## Step 2: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in new terminal)
cd twiller_clone
npm install
```

## Step 3: Start Backend

```bash
cd backend
npm start

# Expected output:
# Twitter backend is running ✅
# Socket.IO ready
# Connected to MongoDB ✅
```

## Step 4: Start Frontend (New Terminal)

```bash
cd twiller_clone
npm run dev

# Expected output:
# ▲ Next.js 16.2.4
# - Local: http://localhost:3000
```

## Step 5: Verify Connection

1. Open http://localhost:3000 in browser
2. Open DevTools (F12)
3. Go to Console tab
4. You should see:
   - No red errors
   - "✅ Socket connected: <socket-id>"

## Troubleshooting

### Socket Connection Fails
```
Error: xhr poll error
```

**Fix**: 
1. Ensure backend is running on port 5000
2. Check `NEXT_PUBLIC_BACKEND_URL=http://localhost:5000`
3. Check backend CORS config allows localhost:3000

### MongoDB Connection Fails
```
Error: MONGODB_URL is invalid
```

**Fix**:
1. Check MongoDB Atlas is running
2. Verify connection string format
3. Check IP whitelist includes your machine (0.0.0.0/0 for dev)
4. Test: visit http://localhost:5000 in browser

### Firebase Auth Fails
```
Error: auth/invalid-api-key
```

**Fix**:
1. Double-check `NEXT_PUBLIC_FIREBASE_*` values
2. Compare with Firebase Console settings
3. No trailing/leading spaces in env variables

### Feed Data Disappeared
**Cause**: localStorage cleared or API down

**Fix**:
1. Open DevTools > Application > Storage > localStorage
2. Check if `twitter-user` exists
3. Clear site data and try again
4. Check Network tab: GET /post should return data

## Development Commands

```bash
# Terminal 1: Backend
cd backend
npm start          # Run with auto-reload
npm run dev        # Alternative

# Terminal 2: Frontend
cd twiller_clone
npm run dev        # Dev server with hot reload
npm run build      # Production build
npm run lint       # Check code quality
```

## Useful URLs

- Frontend: http://localhost:3000
- Backend Health: http://localhost:5000
- Socket.IO: ws://localhost:5000/socket.io

## Next Steps

Once local dev works:
1. Read DEPLOYMENT_GUIDE.md
2. Set up MongoDB Atlas production database
3. Create production Firebase project
4. Deploy backend to Render
5. Deploy frontend to Vercel

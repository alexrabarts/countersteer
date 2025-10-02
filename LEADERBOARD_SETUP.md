# Leaderboard Setup Guide

This guide explains how to set up the Firebase Realtime Database leaderboard for Twisty Game.

## Overview

The leaderboard system uses:
- **Firebase Realtime Database** for data storage
- **Firebase Cloud Functions** for server-side validation and anti-cheat
- **HMAC-based cryptographic proofs** to prevent cheating
- **Physics validation** to reject impossible times
- **Statistical anomaly detection** to flag outliers

## Prerequisites

1. Node.js 18+ installed
2. Firebase CLI installed: `npm install -g firebase-tools`
3. Firebase project created

## Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Name it `twisty-game-leaderboard`
4. Disable Google Analytics (optional)
5. Create project

## Step 2: Enable Realtime Database

1. In Firebase Console, go to "Realtime Database"
2. Click "Create Database"
3. Choose location (e.g., `us-central1`)
4. Start in **test mode** (we'll deploy rules later)

## Step 3: Get Firebase Config

1. Go to Project Settings (gear icon)
2. Scroll to "Your apps"
3. Click "Add app" → Web app
4. Register app with nickname "twisty-game-web"
5. Copy the `firebaseConfig` object

## Step 4: Update Firebase Config

Edit `js/firebase-config.js` and replace the placeholder config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "twisty-game-leaderboard.firebaseapp.com",
    databaseURL: "https://twisty-game-leaderboard-default-rtdb.firebaseio.com",
    projectId: "twisty-game-leaderboard",
    storageBucket: "twisty-game-leaderboard.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

## Step 5: Initialize Firebase CLI

```bash
firebase login
firebase use --add
# Select your project: twisty-game-leaderboard
# Set alias: default
```

## Step 6: Install Cloud Functions Dependencies

```bash
cd functions
npm install
```

## Step 7: Deploy to Firebase

```bash
# Deploy database rules
firebase deploy --only database

# Deploy cloud functions
firebase deploy --only functions

# Deploy hosting (optional)
firebase deploy --only hosting
```

## Step 8: Verify Deployment

1. Go to Firebase Console → Realtime Database
2. You should see the security rules deployed
3. Go to Functions → you should see 4 functions:
   - `startRun`
   - `submitRun`
   - `getLeaderboard`
   - `cleanupExpiredSessions`

## Step 9: Test Locally (Optional)

To test with Firebase emulators before deploying:

```bash
# Install emulator
firebase init emulators
# Select: Functions, Database

# Start emulators
firebase emulators:start

# In js/firebase-config.js, the code will automatically
# use emulators when running on localhost
```

## Step 10: Run Tests

```bash
# Install test dependencies
npm install --save-dev jest

# Run unit tests
npm test tests/unit/leaderboard.test.js

# Run Cloud Functions tests
cd functions
npm test

# Run integration tests (requires emulators running)
npm test tests/integration/leaderboard-flow.test.js
```

## Database Structure

```
/leaderboards
  /{legId}
    /{entryId}
      playerName: "ALEX"
      totalTime: 50000
      checkpointTimes: [5000, 10000, ..., 50000]
      finishTimestamp: 1234567890
      deviceFingerprint: "abc123..."
      validated: true
      flagged: false

/sessions
  /{sessionId}
    legId: "mountain-dawn"
    startTime: 1234567890
    token: "secret-token-abc123"
    deviceFingerprint: "abc123..."
    expiresAt: 1234567890
```

## Anti-Cheat Features

1. **Session Tokens**: Server generates 32-byte secret token per run
2. **Proof Chain**: Each checkpoint has HMAC proof chaining to previous
3. **Physics Validation**:
   - Min checkpoint time: 2 seconds
   - Max checkpoint time: 5 minutes
   - Monotonic increase required
4. **Statistical Detection**: Flags times > 3σ from mean
5. **Rate Limiting**: 5 runs/hour, 50 runs/day per device

## Monitoring

### Check Leaderboard Data
```bash
# View database in console
firebase console:database

# Export data
firebase database:get /leaderboards/mountain-dawn
```

### View Logs
```bash
# Stream function logs
firebase functions:log --only startRun,submitRun

# View all logs
firebase functions:log
```

### Check Flagged Entries
Flagged entries have `flagged: true`. Review them manually:
```bash
firebase database:get /leaderboards/mountain-dawn | grep "flagged"
```

## Cost Estimates

Based on 1000 players, 10 runs each per month:

- **Realtime Database**:
  - Storage: ~$1/GB (minimal)
  - Bandwidth: ~$1/GB downloaded
  - **Est: $2-3/month**

- **Cloud Functions**:
  - Invocations: $0.40/million
  - 30,000 invocations = $0.01
  - **Est: $1-2/month**

**Total: ~$3-5/month**

## Troubleshooting

### "Firebase not initialized"
- Check that Firebase SDK scripts are loaded in `index.html`
- Verify firebaseConfig is correct in `js/firebase-config.js`

### "Permission denied"
- Ensure database rules are deployed: `firebase deploy --only database`
- Sessions and leaderboards should only be writable via Cloud Functions

### "Function not found"
- Deploy functions: `firebase deploy --only functions`
- Check function names match in code

### "Rate limit exceeded"
- This is expected behavior for anti-cheat
- Wait 1 hour or adjust limits in `functions/index.js`

## Next Steps

1. ✅ Deploy to Firebase
2. ✅ Test with a complete run
3. TODO: Build leaderboard UI to display rankings
4. TODO: Add admin panel to review flagged entries
5. TODO: Consider adding authentication for admin features

## Support

For issues, check:
- Firebase Console logs
- Browser console for client errors
- Cloud Functions logs: `firebase functions:log`

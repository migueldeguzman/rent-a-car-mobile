# Vesla Rent-a-Car - Separated Architecture

## Overview

The Vesla rent-a-car system is now properly separated into two independent repositories:

```
┌─────────────────────────────────────────────────────────┐
│                    CUSTOMER MOBILE APP                  │
│         https://github.com/migueldeguzman/              │
│             rent-a-car-mobile.git                       │
│                                                         │
│  - React Native + Expo                                 │
│  - Customer-facing interface                           │
│  - Booking management                                  │
│  - Vehicle browsing                                    │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ HTTP/REST API
                 │ http://localhost:3001/api
                 │
┌────────────────▼────────────────────────────────────────┐
│                    BACKEND API SERVER                   │
│         https://github.com/migueldeguzman/              │
│              client-backend.git                         │
│                                                         │
│  - Express.js + TypeScript                             │
│  - JWT authentication                                  │
│  - REST API endpoints                                  │
│  - Business logic                                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ PostgreSQL Connection
                 │ (Neon Cloud Database)
                 │
┌────────────────▼────────────────────────────────────────┐
│                  POSTGRESQL DATABASE                    │
│                    (Neon Cloud)                         │
│                                                         │
│  - Users & Authentication                              │
│  - Vehicles & Inventory                                │
│  - Bookings & Reservations                             │
│  - Invoices & Payments                                 │
└─────────────────────────────────────────────────────────┘
```

## Repository Structure

### 1. Mobile App (rent-a-car-mobile)

**Purpose:** Customer-facing application

**Location:** `C:\Users\DELL\vesla-audit\rent-a-car-mobile`

**Contents:**
- React Native source code (`src/`)
- Expo configuration
- Mobile app dependencies
- **NO backend code** (completely separated)

**GitHub:** https://github.com/migueldeguzman/rent-a-car-mobile.git

### 2. Backend API (client-backend)

**Purpose:** Server support and API layer

**Location:** `C:\Users\DELL\vesla-audit\client-backend`

**Contents:**
- Express server (`src/index.ts`)
- API controllers and routes
- Database models and schema
- Authentication middleware
- Business logic

**GitHub:** https://github.com/migueldeguzman/client-backend.git

## Development Workflow

### Starting the System

**Step 1: Start Backend Server**
```bash
cd C:\Users\DELL\vesla-audit\client-backend
npm run dev
# Server runs on http://localhost:3001
```

**Step 2: Start Mobile App**
```bash
cd C:\Users\DELL\vesla-audit\rent-a-car-mobile
npx expo start --web
# App runs on http://localhost:8081
```

### Code Changes

**Mobile App Changes:**
1. Make changes in `rent-a-car-mobile/`
2. App hot-reloads automatically
3. Commit to rent-a-car-mobile repo

**Backend Changes:**
1. Make changes in `client-backend/`
2. Server auto-restarts with tsx watch
3. Commit to client-backend repo

### Deployment

**Backend:**
- Deploy to cloud platform (Railway, Render, etc.)
- Set environment variables
- Update DATABASE_URL for production database

**Mobile App:**
- Update `src/services/api.ts` with production backend URL
- Build with Expo EAS Build
- Submit to App Store / Play Store

## API Connection

The mobile app connects to the backend via `src/services/api.ts`:

```typescript
// Development
const API_URL = 'http://localhost:3001/api';

// Production (update when deployed)
const API_URL = 'https://your-backend.railway.app/api';
```

## Benefits of Separation

✅ **Independent Development**
- Mobile and backend teams can work separately
- Different deployment schedules
- Easier testing and debugging

✅ **Better Security**
- Backend code not exposed in mobile app
- Separate repositories = separate access control
- Environment variables stay server-side

✅ **Scalability**
- Backend can serve multiple clients (mobile, web, admin panel)
- Scale backend independently of mobile app
- Add new frontends without touching backend

✅ **Deployment Flexibility**
- Deploy backend to specialized Node.js hosting
- Mobile app builds separately for app stores
- Different update cycles

## Next Steps

1. ✅ Backend separated and pushed to GitHub
2. ⏳ Update mobile app to point to production backend URL
3. ⏳ Remove old embedded backend from rent-a-car-mobile
4. ⏳ Deploy backend to cloud platform
5. ⏳ Build mobile app with Expo EAS

---

**Date:** December 5, 2025  
**Status:** ✅ Architecture separated and configured

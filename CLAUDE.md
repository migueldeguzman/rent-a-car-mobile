# CLAUDE.md - Rent-a-Car Mobile Application

## Project Overview

Mobile-first car rental application built with React Native and Expo, supporting iOS, Android, and Web platforms. Connects to a PostgreSQL backend for vehicle booking and customer management.

**Tech Stack:**
- React Native + Expo
- TypeScript
- React Navigation
- PostgreSQL backend (port 3001)
- Expo Linear Gradient for UI

**Working Directory:** `C:\Users\DELL\vesla-audit\rent-a-car-mobile`

**GitHub Repository:** https://github.com/migueldeguzman/rent-a-car-mobile.git

---

## Version Control

**Git Commands:**
```bash
# Check status
git status

# Stage changes
git add .

# Commit changes
git commit -m "Description of changes"

# Push to GitHub
git push

# View commit history
git log --oneline -5
```

---

## Architecture

### Core Components

**Authentication Flow:**
- `src/contexts/AuthContext.tsx` - JWT-based authentication with AsyncStorage persistence
- `src/screens/LoginScreen.tsx` - Email/password login
- `src/screens/RegisterScreen.tsx` - Customer registration

**Main Screens:**
- `src/screens/VehicleListScreen.tsx` - FlatList of available vehicles with pull-to-refresh
- `src/screens/BookingScreen.tsx` - Vehicle booking form with date selection, add-ons, payment method
- `src/screens/BookingConfirmationScreen.tsx` - Booking success with invoice details

**Shared Components:**
- `src/components/CustomScrollbar.tsx` - Custom green scrollbar for web platform

**Services:**
- `src/services/api.ts` - REST API client with axios interceptors for authentication
- Backend URL: `http://localhost:3001/api`

**Theme:**
- `src/theme/colors.ts` - Comprehensive color palette with financial formatting utilities
- Primary color: `#2C5F2D` (forest green)

---

## Custom Scrollbar Implementation

### Problem Solved

React Native Web's `ScrollView` component doesn't trigger native browser scroll events, preventing the default browser scrollbar from working. `FlatList` works fine because it renders as a native scrollable div.

### Solution Architecture

**Two-part approach:**

1. **Native Browser Scrollbar (for FlatList components)**
   - CSS in `web/index.html` styles the native scrollbar
   - Works automatically with `FlatList` components
   - Green thumb (#2C5F2D) with gray track (#e0e0e0)

2. **Custom React Scrollbar (for ScrollView components)**
   - Component: `src/components/CustomScrollbar.tsx`
   - Fixed-position overlay on right side (z-index: 999999)
   - Tracks window scroll via multiple event listeners
   - Draggable thumb for manual scrolling

**Key Files:**

`web/index.html` (lines 28-51):
```css
::-webkit-scrollbar {
  width: 14px;
}
::-webkit-scrollbar-track {
  background: #e0e0e0;
}
::-webkit-scrollbar-thumb {
  background: #2C5F2D;
  border-radius: 10px;
  border: 3px solid #e0e0e0;
}
```

`src/components/CustomScrollbar.tsx`:
- Platform check: Only renders on web (`Platform.OS === 'web'`)
- Scroll detection: `window.pageYOffset`, `document.scrollTop`
- Size calculation: Maximum 15% of viewport height, minimum 60px
- Event listeners: scroll, wheel, touchmove, resize
- Polling: Updates every 100ms as fallback
- MutationObserver: Detects DOM changes

`App.tsx`:
```tsx
<AuthProvider>
  <StatusBar style="auto" />
  <Navigation />
  <CustomScrollbar />
</AuthProvider>
```

### Scrollbar Behavior

**Size Rules:**
- Thumb height = min(calculated ratio, 15% of viewport)
- Minimum thumb height = 60px for usability
- Maximum thumb height = 15% of viewport (leaving 85% for scrolling)

**Position Calculation:**
```typescript
const scrollRatio = clientHeight / scrollHeight;
const calculatedThumbHeight = clientHeight * scrollRatio;
const maxThumbHeight = clientHeight * 0.15;
const thumbHeight = Math.max(Math.min(calculatedThumbHeight, maxThumbHeight), 60);

const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
const thumbTop = scrollPercentage * (clientHeight - thumbHeight);
```

**Drag Functionality:**
- Mouse down on thumb starts drag
- Mouse move updates scroll position proportionally
- Mouse up ends drag
- Works with window.scrollTo() for smooth scrolling

---

## Backend Integration

### API Endpoints

**Authentication:**
- `POST /api/auth/register` - Customer registration
- `POST /api/auth/login` - Returns JWT token and user data

**Vehicles:**
- `GET /api/vehicles` - List all vehicles
- `GET /api/vehicles/available/:companyId` - Filter by company

**Bookings:**
- `POST /api/bookings` - Create booking (status: PENDING)
- `POST /api/bookings/:id/confirm` - Confirm booking and generate invoice

### Request/Response Flow

**Login Flow:**
```typescript
// Request
POST /api/auth/login
{ email: "user@example.com", password: "password123" }

// Response
{
  token: "jwt_token_here",
  user: { id, email, firstName, lastName, role }
}

// Stored in AsyncStorage as "userToken" and "userData"
```

**Booking Flow:**
```typescript
// 1. Create Booking
POST /api/bookings
{
  vehicleId: "uuid",
  startDate: "2024-01-01T00:00:00.000Z",
  endDate: "2024-01-08T00:00:00.000Z",
  notes: "Weekly rental with GPS",
  paymentMethod: "CREDIT_CARD",
  termsAccepted: true,
  addOns: [{ id: "gps", name: "GPS", dailyRate: 25 }],
  notificationPreferences: { email: true, sms: false }
}

// 2. Confirm Booking
POST /api/bookings/:id/confirm

// Response
{
  booking: { id, status: "CONFIRMED", ... },
  invoice: {
    invoiceNumber: "INV-001",
    subtotal: 700,
    vatAmount: 35,
    totalAmount: 735
  }
}
```

---

## Booking Screen Features

### Rental Modes

**Three pricing tiers:**
- Daily: `vehicle.dailyRate` per day
- Weekly: `vehicle.weeklyRate` per 7 days + daily rate for remaining days
- Monthly: `vehicle.monthlyRate` per 30 days + daily rate for remaining days

**Savings Calculation:**
```typescript
const dailyTotal = totalDays * dailyRate;
const weeklyTotal = (weeks * weeklyRate) + (remainingDays * dailyRate);
const savings = dailyTotal - weeklyTotal;
const savingsPercentage = (savings / dailyTotal) * 100;
```

### Add-on Services

```typescript
const DEFAULT_ADDONS = [
  { id: 'gps', name: 'GPS Navigation', dailyRate: 25 },
  { id: 'child-seat', name: 'Child Safety Seat', dailyRate: 30 },
  { id: 'additional-driver', name: 'Additional Driver', dailyRate: 50 },
  { id: 'insurance-upgrade', name: 'Premium Insurance', dailyRate: 75 }
];
```

### VAT and Pricing

**UAE Financial Regulations:**
- VAT Rate: 5%
- Security Deposit: 20% of total with VAT
- Currency: AED (UAE Dirham)

```typescript
const calculatePriceBreakdown = () => {
  const subtotal = vehicleRental + addOnsTotal;
  const vatAmount = subtotal * 0.05;
  const totalWithVat = subtotal + vatAmount;
  const securityDeposit = totalWithVat * 0.20;
  return { subtotal, vatAmount, totalWithVat, securityDeposit };
};
```

### Date Validation

**Minimum Rental Periods:**
- Daily: 1 day minimum
- Weekly: 7 days minimum (offers adjustment)
- Monthly: 30 days minimum (offers adjustment)

**Short Notice Booking:**
- Warning if booking starts within 2 hours
- Additional charges may apply

---

## Styling and Layout

### Web-Specific Styles

**BookingScreen Layout:**
- Centered content with `maxWidth: 700px`
- `alignItems: 'center'` on scroll content container
- Prevents content from stretching to full window width

**ScrollView Configuration:**
```tsx
<ScrollView
  style={styles.container}
  contentContainerStyle={styles.scrollContent}
  showsVerticalScrollIndicator={Platform.OS !== 'web'}
  scrollEnabled={true}
/>
```

**Key Style Rules:**
```typescript
container: {
  backgroundColor: colors.neutral.background,
  ...Platform.select({
    web: { height: '100%' },
    default: { flex: 1 }
  })
},
scrollContent: {
  flexGrow: 1,
  paddingBottom: 20,
  alignItems: 'center' // Centers content horizontally
},
content: {
  padding: 20,
  width: '100%',
  maxWidth: 700 // Constrains width
}
```

### VehicleListScreen Layout

**FlatList Configuration:**
```tsx
<FlatList
  data={vehicles}
  renderItem={renderVehicle}
  contentContainerStyle={styles.listContent}
  showsVerticalScrollIndicator={true}
  scrollEnabled={true}
  style={Platform.OS === 'web' ? { flex: 1, height: '100%' } : undefined}
  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
/>
```

**Card Styling:**
- Max width: 600px per vehicle card
- Centered with `alignItems: 'center'` on list content
- Shadow effects for depth
- Border radius: 16px for modern look

---

## Running the Application

### Prerequisites

```bash
# Backend must be running on port 3001
cd C:\Users\DELL\vesla-audit\rent-a-car-mobile\backend
npm run dev
```

### Development Server

```bash
cd C:\Users\DELL\vesla-audit\rent-a-car-mobile

# Start Expo dev server
npm start
# or
npx expo start

# Web-specific (recommended for scrollbar testing)
npx expo start --web
# or specify port
npx expo start --port 8085 --clear
```

### Platform-Specific Commands

```bash
# iOS
npx expo start --ios

# Android
npx expo start --android

# Web
npx expo start --web
```

### Access URLs

- **Web:** `http://localhost:8081` (or specified port)
- **Backend API:** `http://localhost:3001/api`
- **Health Check:** `http://localhost:3001/health`

---

## Known Issues and Solutions

### Issue: Scrollbar Not Working on BookingScreen

**Symptom:** Green scrollbar appears but doesn't move with scroll

**Root Cause:** React Native's `ScrollView` on web doesn't trigger window scroll events

**Solution:**
1. Removed inline scrollbar CSS from BookingScreen
2. CustomScrollbar component tracks window.pageYOffset
3. Multiple event listeners (scroll, wheel, touchmove)
4. 100ms polling as fallback

### Issue: ScrollView vs FlatList Behavior

**Key Difference:**
- `FlatList` → Renders as native scrollable div → Native browser scrollbar works
- `ScrollView` → Custom React Native scroll container → Needs CustomScrollbar component

**Best Practice:**
- Use `FlatList` for lists (automatically works with native scrollbar)
- Use `ScrollView` for forms/content (CustomScrollbar handles it)

### Issue: Content Not Centered on Web

**Solution:** Add `alignItems: 'center'` to scroll content container and `maxWidth` to content view

---

## Testing Checklist

**Scrollbar Functionality:**
- [ ] Green scrollbar visible on right side
- [ ] Scrollbar thumb maximum 15% of viewport height
- [ ] Thumb moves proportionally with scroll
- [ ] Dragging thumb scrolls page smoothly
- [ ] Works on VehicleListScreen (FlatList)
- [ ] Works on BookingScreen (ScrollView)
- [ ] Native scrollbar styling shows on hover

**Booking Flow:**
- [ ] Date selection updates price dynamically
- [ ] Rental mode changes recalculate pricing
- [ ] Add-ons update total correctly
- [ ] VAT calculation accurate (5%)
- [ ] Security deposit shows (20% of total)
- [ ] Payment method selection works
- [ ] Terms & Conditions checkbox enables booking
- [ ] Confirmation screen shows invoice

**Authentication:**
- [ ] Login redirects to vehicle list
- [ ] Logout clears token and redirects to login
- [ ] Token persists across app restarts
- [ ] API calls include Authorization header

---

## File Structure

```
rent-a-car-mobile/
├── App.tsx                           # Root component with Navigation + CustomScrollbar
├── app.json                          # Expo configuration
├── package.json                      # Mobile app dependencies
├── web/
│   └── index.html                    # Native scrollbar CSS styling
├── src/
│   ├── components/
│   │   └── CustomScrollbar.tsx       # Custom scrollbar for web
│   ├── contexts/
│   │   ├── AuthContext.tsx           # Authentication state management
│   │   └── ScrollContext.tsx         # Scroll position context (experimental)
│   ├── screens/
│   │   ├── LoginScreen.tsx           # Login form
│   │   ├── RegisterScreen.tsx        # Registration form
│   │   ├── VehicleListScreen.tsx     # Available vehicles (FlatList)
│   │   ├── BookingScreen.tsx         # Booking form (ScrollView)
│   │   └── BookingConfirmationScreen.tsx  # Success screen
│   ├── services/
│   │   └── api.ts                    # REST API client with interceptors
│   ├── theme/
│   │   └── colors.ts                 # Color palette and financial utilities
│   └── types/
│       └── index.ts                  # TypeScript interfaces
├── backend/                          # Consolidated backend server
│   ├── .env                          # Environment configuration
│   ├── package.json                  # Backend dependencies
│   └── src/
│       ├── index.ts                  # Express server entry point
│       ├── config/
│       │   └── env.ts                # Environment variable loading
│       ├── controllers/
│       │   ├── auth.controller.ts    # Authentication logic
│       │   ├── booking.controller.ts # Booking operations
│       │   ├── customer.controller.ts# Customer management
│       │   ├── invoice.controller.ts # Invoice generation
│       │   └── vehicle.controller.ts # Vehicle CRUD
│       ├── middleware/
│       │   └── auth.middleware.ts    # JWT verification
│       ├── models/
│       │   └── database.ts           # PostgreSQL connection & schema
│       ├── routes/
│       │   ├── auth.routes.ts        # /api/auth/*
│       │   ├── booking.routes.ts     # /api/bookings/*
│       │   ├── customer.routes.ts    # /api/customers/*
│       │   ├── invoice.routes.ts     # /api/invoices/*
│       │   └── vehicle.routes.ts     # /api/vehicles/*
│       ├── scripts/
│       │   └── seed-vehicles.ts      # Database seeding
│       └── utils/
│           └── accounts.ts           # Account utilities
└── CLAUDE.md                         # This file
```

---

## Environment Variables

**Backend Configuration (`backend/.env`):**
```env
# Server
PORT=3001
NODE_ENV=development

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://neondb_owner:npg_sS6Le8DNvBqx@ep-still-recipe-a9gv66gx-pooler.gwc.azure.neon.tech/neondb?sslmode=require

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:19000,http://localhost:8081,http://localhost:8085

# App Settings
APP_NAME=Vesla Rent-a-Car
VAT_RATE=5
SECURITY_DEPOSIT_PERCENTAGE=20
```

**Mobile App:**
- No .env file needed
- API URL hardcoded to `http://localhost:3001/api` in `src/services/api.ts`

---

## Dependencies

**Mobile App (`package.json`):**
- React Native + Expo stack
- React Navigation for routing
- Axios for API calls
- AsyncStorage for local persistence
- Linear Gradient for UI styling

**Backend (`backend/package.json`):**
```json
{
  "dependencies": {
    "bcrypt": "^6.0.0",
    "cors": "^2.8.5",
    "date-fns": "^3.0.6",
    "dotenv": "^16.4.5",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.3",
    "pg": "^8.11.3"
  },
  "devDependencies": {
    "@types/bcrypt": "^6.0.0",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/node": "^20.11.5",
    "@types/pg": "^8.10.9",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

---

## Next Steps - ERP Integration

**Scheduled for Tomorrow:**

### Priority 0: Combine Backend Servers

**Goal:** Merge rental backend and ERP backend into a single unified server

**Why:**
- Same company, tightly coupled operations
- Shared PostgreSQL database
- Easier transactions across rental + accounting
- Simpler deployment and maintenance
- Small team - no need for microservices complexity

**Approach:**
- Keep code modular (separate modules for rental vs accounting)
- Single entry point on port 3000
- Shared Prisma database connection
- Route prefixes: `/api/rentals/*` and `/api/accounting/*`

**Files to Create:**
```
vesla-backend/ (or web-erp-app/backend expanded)
├── src/
│   ├── modules/
│   │   ├── accounting/        # ERP functionality
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   └── services/
│   │   └── rentals/           # Rental functionality
│   │       ├── routes/
│   │       ├── controllers/
│   │       └── services/
│   ├── shared/
│   │   ├── database.ts        # Shared Prisma instance
│   │   └── auth.middleware.ts
│   └── index.ts               # Mount both modules
```

**Decision:** Keep them separate for now, but structure for easy merging later if needed

---

### Priority 1: Add Image Support to Vehicles

**Goal:** Store vehicle images using URL-based approach (best practice)

**Why:**
- Fast database queries
- Easy CDN integration later
- Small database size
- Industry standard

**Database Schema Updates:**

```sql
-- Add image columns to vehicles table
ALTER TABLE vehicles
ADD COLUMN "primaryImageUrl" VARCHAR(500),
ADD COLUMN "thumbnailUrl" VARCHAR(500),
ADD COLUMN images JSONB,
ADD COLUMN "imageUploadedAt" TIMESTAMP,
ADD COLUMN "imageUploadedBy" UUID;

-- Example data structure
-- images: ["url1.jpg", "url2.jpg", "url3.jpg"]
```

**Storage Strategy:**

**Development (Phase 1):**
- Store images locally: `backend/public/uploads/vehicles/`
- Serve via Express static middleware
- Format: `/uploads/vehicles/{vehicleId}-{timestamp}.jpg`

**Production (Phase 2 - Future):**
- AWS S3 bucket: `vesla-vehicle-images/`
- CloudFront CDN for fast delivery
- Format: `https://cdn.vesla.com/vehicles/{vehicleId}-{timestamp}.jpg`

**API Endpoints to Add:**
```typescript
POST /api/vehicles/:id/upload-image    // Upload primary image
POST /api/vehicles/:id/upload-gallery  // Upload multiple images
DELETE /api/vehicles/:id/image/:index  // Delete specific image
GET /api/vehicles/:id/images           // Get all image URLs
```

**Backend Implementation:**
```typescript
// File: backend/src/routes/vehicle.routes.ts
import multer from 'multer';

const upload = multer({
  dest: 'public/uploads/vehicles/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'));
    }
  }
});

router.post('/:id/upload-image', upload.single('image'), uploadVehicleImage);
```

**Mobile App Integration:**
```typescript
// File: src/services/api.ts
uploadVehicleImage: async (vehicleId: string, imageUri: string) => {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'vehicle.jpg',
  });
  return api.post(`/vehicles/${vehicleId}/upload-image`, formData);
}
```

**Database Record Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "make": "Toyota",
  "model": "Camry",
  "primaryImageUrl": "/uploads/vehicles/550e8400-1735689600000.jpg",
  "thumbnailUrl": "/uploads/vehicles/thumbs/550e8400-1735689600000.jpg",
  "images": [
    "/uploads/vehicles/550e8400-1735689600000.jpg",
    "/uploads/vehicles/550e8400-1735689600001.jpg",
    "/uploads/vehicles/550e8400-1735689600002.jpg"
  ],
  "imageUploadedAt": "2025-01-25T10:00:00Z"
}
```

**Files to Create/Modify:**
- Modify: `backend/src/models/database.ts` - Add image columns
- Create: `backend/src/middleware/upload.middleware.ts` - File upload handling
- Modify: `backend/src/routes/vehicle.routes.ts` - Add image endpoints
- Create: `backend/src/services/image.service.ts` - Image processing (resize, optimize)
- Create: `backend/public/uploads/vehicles/` - Storage directory
- Modify: Mobile app components to display images

**Dependencies to Install:**
```bash
npm install multer @types/multer
npm install sharp  # For image resizing/optimization
```

---

### Workflow Overview

```
Customer Books Vehicle
        ↓
1. Connect to ERP System
        ↓
2. Save to Booking Database (rent-a-car)
        ↓
3. Convert Booking → Agreement Database
        ↓
4. Process Agreement → Monthly Invoice
        ↓
5. Generate Accounting Entries (ERP)
```

### 1. Connect to Web ERP System
- Establish connection to `web-erp-app` PostgreSQL database
- Use ERP's chart of accounts structure
- Validate GL account codes exist before saving bookings
- Share customer/vehicle master data between systems

### 2. Save Booking to Booking Database
**Table:** `bookings` (rent-a-car backend)
- Capture booking details: vehicle, dates, customer, add-ons
- Status: `PENDING` → `CONFIRMED`
- Store pricing breakdown (subtotal, VAT, security deposit)
- Payment method selection
- Foreign keys: `customerId`, `vehicleId`, `companyId`

**No invoice or accounting entries yet** - booking is just a reservation

### 3. Convert Booking → Agreement Database
**New Table:** `rental_agreements`
- Linked to booking: `bookingId` foreign key
- Agreement number generation (e.g., `AGR-2024-001`)
- Contract terms and conditions
- Start date, end date, rental period
- Monthly payment amount calculation
- Security deposit terms
- Vehicle handover/return details
- Digital signature capture
- PDF generation and storage path
- Status: `DRAFT` → `SIGNED` → `ACTIVE` → `COMPLETED`

**Conversion Trigger:**
- When customer accepts terms and booking is confirmed
- Generate agreement PDF
- Email to customer for signature
- Mark booking as "Agreement Created"

### 4. Process Agreement → Monthly Invoice
**Monthly Processing (Scheduled Job):**
- Query all `ACTIVE` rental agreements
- For each agreement in current billing period:
  - Calculate monthly charge (vehicle + add-ons)
  - Generate invoice in ERP `invoices` table
  - Invoice line items:
    * Vehicle rental (days/weeks/months)
    * Add-on services (GPS, insurance, etc.)
    * Subtotal
    * VAT 5%
    * Total amount due
  - Link invoice to agreement: `agreementId` reference
  - Due date: 15th of month
  - Status: `PENDING` → `PAID`

**First Month:**
- Include security deposit as separate line item
- Mark as "Deposit Held - Refundable"

**Last Month:**
- Process final invoice
- Deduct any damages/fees from security deposit
- Generate deposit refund entry

### 5. Generate Accounting Entries (ERP)
**When Invoice is Generated (Monthly):**

```
Journal Entry - Rental Invoice
Date: Invoice Date
Reference: Invoice Number

DR  Accounts Receivable - Customer          735.00
    CR  Rental Revenue - Vehicles                   700.00
    CR  VAT Payable (5%)                            35.00
```

**When Security Deposit is Collected (First Month):**
```
Journal Entry - Security Deposit
Date: Agreement Start Date
Reference: Agreement Number

DR  Cash/Bank                               147.00
    CR  Security Deposit Liability                 147.00
```

**When Payment is Received:**
```
Journal Entry - Payment Received
Date: Payment Date
Reference: Payment Number

DR  Cash/Bank                               735.00
    CR  Accounts Receivable - Customer             735.00
```

**When Security Deposit is Refunded (Agreement End):**
```
Journal Entry - Deposit Refund
Date: Refund Date
Reference: Agreement Number

DR  Security Deposit Liability              147.00
    CR  Cash/Bank                                   147.00
```

### Chart of Accounts Structure

**Assets:**
- `1100` - Cash/Bank
- `1200` - Accounts Receivable - Customers
- `1500` - Vehicles (Asset)

**Liabilities:**
- `2100` - Accounts Payable
- `2200` - Security Deposit Liability
- `2300` - VAT Payable

**Revenue:**
- `4100` - Rental Revenue - Vehicles
- `4200` - Service Revenue - Add-ons

**Expenses:**
- `5100` - Vehicle Maintenance
- `5200` - Insurance Expense

### Files to Create/Modify

**Backend Services:**
- `backend/src/services/booking.service.ts` - Connect to ERP on booking creation
- `backend/src/services/agreement.service.ts` - NEW: Convert booking to agreement
- `backend/src/services/invoice.service.ts` - Generate monthly invoices from agreements
- `backend/src/services/accounting.service.ts` - NEW: Create journal entries in ERP
- `backend/src/services/erp-integration.service.ts` - NEW: ERP database connection

**Database Schema:**
- Add `rental_agreements` table
- Add `agreement_line_items` table (vehicle + add-ons detail)
- Link bookings ↔ agreements (one-to-one)
- Link agreements ↔ invoices (one-to-many for monthly billing)
- Link invoices ↔ transactions (ERP accounting entries)

**Scheduled Jobs:**
- `jobs/monthly-invoice-generator.ts` - Run on 1st of month
- `jobs/agreement-status-updater.ts` - Check for expired agreements
- `jobs/payment-reminder.ts` - Send reminders before due date

**API Endpoints:**
- `POST /api/bookings/:id/create-agreement` - Convert booking to agreement
- `GET /api/agreements/:id/pdf` - Download agreement PDF
- `POST /api/agreements/:id/sign` - Customer signature capture
- `POST /api/agreements/:id/activate` - Start agreement (vehicle handover)
- `GET /api/agreements/:id/invoices` - List all invoices for agreement
- `POST /api/invoices/:id/process-payment` - Record payment and create accounting entry

### 6. SQL Lookup Tests After Database Updates

**Goal:** Verify data integrity and relationships after implementing new tables and integrations

**Test Queries to Run:**

**A. Verify Booking → Agreement Link:**
```sql
-- Check bookings with agreements
SELECT
  b.id as booking_id,
  b.status as booking_status,
  a.id as agreement_id,
  a."agreementNumber",
  a.status as agreement_status,
  a."createdAt"
FROM bookings b
LEFT JOIN rental_agreements a ON a."bookingId" = b.id
ORDER BY b."createdAt" DESC
LIMIT 10;
```

**B. Verify Agreement → Invoice Link:**
```sql
-- Check agreements with invoices
SELECT
  a."agreementNumber",
  a.status,
  i."invoiceNumber",
  i."totalAmount",
  i."dueDate",
  i.status as invoice_status
FROM rental_agreements a
LEFT JOIN invoices i ON i."agreementId" = a.id
ORDER BY a."createdAt" DESC;
```

**C. Verify Invoice → Transaction Link:**
```sql
-- Check invoices with accounting entries
SELECT
  i."invoiceNumber",
  i."totalAmount",
  t."transactionNumber",
  t."referenceType",
  t."debitAmount",
  t."creditAmount",
  t."description"
FROM invoices i
LEFT JOIN transactions t ON t."referenceId" = i.id::text
WHERE t."referenceType" = 'INVOICE'
ORDER BY i."createdAt" DESC;
```

**D. Verify Chart of Accounts Integration:**
```sql
-- Check if GL accounts exist and are used
SELECT
  a."accountCode",
  a."accountName",
  a."accountType",
  COUNT(t.id) as transaction_count,
  SUM(t."debitAmount") as total_debits,
  SUM(t."creditAmount") as total_credits
FROM accounts a
LEFT JOIN transactions t ON t."accountId" = a.id
WHERE a."accountCode" IN ('1200', '2200', '2300', '4100', '4200')
GROUP BY a.id
ORDER BY a."accountCode";
```

**E. Verify Security Deposits:**
```sql
-- Check security deposit liability balance
SELECT
  a."agreementNumber",
  c."firstName" || ' ' || c."lastName" as customer_name,
  a."securityDeposit",
  a.status,
  CASE
    WHEN a.status = 'COMPLETED' THEN 'Should be refunded'
    WHEN a.status = 'ACTIVE' THEN 'Held'
    ELSE 'Pending'
  END as deposit_status
FROM rental_agreements a
JOIN customers c ON c.id = a."customerId"
WHERE a."securityDeposit" > 0
ORDER BY a."createdAt" DESC;
```

**F. Verify VAT Calculations:**
```sql
-- Check VAT amounts match 5% of subtotal
SELECT
  i."invoiceNumber",
  i."subtotal",
  i."vatAmount",
  i."totalAmount",
  ROUND(i."subtotal" * 0.05, 2) as calculated_vat,
  CASE
    WHEN ROUND(i."vatAmount", 2) = ROUND(i."subtotal" * 0.05, 2) THEN '✓ Correct'
    ELSE '✗ Mismatch'
  END as vat_check
FROM invoices i
ORDER BY i."createdAt" DESC;
```

**G. Verify Accounting Balance:**
```sql
-- Check if debits = credits (accounting equation)
SELECT
  DATE_TRUNC('month', t."transactionDate") as month,
  SUM(t."debitAmount") as total_debits,
  SUM(t."creditAmount") as total_credits,
  SUM(t."debitAmount") - SUM(t."creditAmount") as difference
FROM transactions t
GROUP BY DATE_TRUNC('month', t."transactionDate")
ORDER BY month DESC;
```

**H. Test Data Integrity:**
```sql
-- Find orphaned records
-- Bookings without customers
SELECT COUNT(*) as orphaned_bookings
FROM bookings b
LEFT JOIN customers c ON c.id = b."customerId"
WHERE c.id IS NULL;

-- Agreements without bookings
SELECT COUNT(*) as orphaned_agreements
FROM rental_agreements a
LEFT JOIN bookings b ON b.id = a."bookingId"
WHERE b.id IS NULL;

-- Invoices without agreements
SELECT COUNT(*) as orphaned_invoices
FROM invoices i
LEFT JOIN rental_agreements a ON a.id = i."agreementId"
WHERE i."agreementId" IS NOT NULL AND a.id IS NULL;
```

**Test Procedure:**
1. Create sample booking via API
2. Convert to agreement
3. Generate invoice
4. Record payment
5. Run all queries above to verify data flow
6. Check that accounting entries balance
7. Verify foreign key relationships are intact

**Expected Results:**
- ✅ All bookings have valid customer references
- ✅ All agreements link to bookings
- ✅ All invoices link to agreements
- ✅ All transactions link to invoices
- ✅ Debits = Credits in accounting
- ✅ VAT = 5% of subtotal
- ✅ Security deposits tracked correctly

**Create Test Script:**
```bash
# File: backend/scripts/test-database-integrity.ts
# Run with: npm run test:db
```

---

## Future Enhancements

**Potential Improvements:**
1. Context-based scroll tracking (ScrollContext.tsx already created)
2. Responsive breakpoints for tablet/desktop
3. Dark mode theme support
4. Offline booking drafts with AsyncStorage
5. Push notifications for booking reminders
6. Vehicle image carousel
7. Real-time availability updates
8. Payment gateway integration
9. Multi-language support (Arabic/English)
10. Accessibility improvements (screen readers)

---

## Troubleshooting

### Scrollbar Not Visible

**Check:**
1. `Platform.OS === 'web'` condition in CustomScrollbar
2. z-index conflicts (CustomScrollbar uses 999999)
3. Console logs for scroll position updates
4. Browser console for errors

**Debug Commands:**
```typescript
// In CustomScrollbar.tsx
console.log('Scrollbar Update:', {
  scrollHeight,
  clientHeight,
  scrollTop,
  scrollPercentage: scrollTop / Math.max(scrollHeight - clientHeight, 1)
});
```

### API Connection Errors

**Check:**
1. Backend running on port 3001: `npm run dev` in backend directory
2. Database connection: PostgreSQL on port 5433
3. CORS configuration includes your development URL
4. Authorization header in API requests

**Test API:**
```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/vehicles
```

### Build Errors

**Common Issues:**
- Missing dependencies: `npm install`
- Expo cache: `npx expo start --clear`
- TypeScript errors: Check `tsconfig.json`
- Port conflicts: Use `--port` flag

---

*Last Updated: 2025-01-25*
*Documentation for Claude Code context preservation*

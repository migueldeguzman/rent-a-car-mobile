# Vesla Rent-a-Car Mobile App

React Native (Expo) mobile application for the Vesla ERP vehicle rental booking system.

## Features

- **User Authentication**: Register and login functionality
- **Vehicle Browsing**: View all available vehicles with rates
- **Smart Rate Calculation**: Automatic calculation based on rental period
  - Monthly rate for 30-day periods (e.g., AED 3000/month)
  - Daily rate for remaining days (e.g., AED 150/day)
  - Example: 45 days = 1 month (AED 3000) + 15 days (AED 2250) = AED 5250
- **Date Picker**: Select start and end dates for rental
- **Booking Confirmation**: View booking details and status
- **Real-time Integration**: Connected to Vesla ERP backend API

## Tech Stack

- **React Native**: Expo framework with TypeScript
- **Navigation**: React Navigation (Stack Navigator)
- **State Management**: React Context API (AuthContext)
- **HTTP Client**: Axios with interceptors
- **Storage**: AsyncStorage for persistent auth
- **UI**: React Native components with custom styling

## Project Structure

```
rent-a-car-mobile/
├── src/
│   ├── contexts/
│   │   └── AuthContext.tsx           # Authentication state management
│   ├── screens/
│   │   ├── LoginScreen.tsx           # User login
│   │   ├── RegisterScreen.tsx        # User registration
│   │   ├── VehicleListScreen.tsx     # Browse available vehicles
│   │   ├── BookingScreen.tsx         # Select dates & calculate rate
│   │   └── BookingConfirmationScreen.tsx  # Booking success
│   ├── services/
│   │   └── api.ts                    # API client & endpoints
│   ├── types/
│   │   └── index.ts                  # TypeScript interfaces
│   └── components/                   # Reusable components (future)
├── App.tsx                           # Main app with navigation
└── package.json
```

## Installation

1. **Install dependencies:**
   ```bash
   cd rent-a-car-mobile
   npm install
   ```

2. **Configure API URL:**

   Edit `src/services/api.ts` and update the `API_URL`:

   ```typescript
   // For Android emulator:
   const API_URL = 'http://10.0.2.2:3000/api';

   // For iOS simulator:
   const API_URL = 'http://localhost:3000/api';

   // For physical device (replace with your computer's local IP):
   const API_URL = 'http://192.168.1.XXX:3000/api';
   ```

3. **Start the backend server:**
   ```bash
   cd ../web-erp-app/backend
   npm run dev
   ```

## Running the App

### Development

```bash
# Start Expo dev server
npm start

# Run on Android
npm run android

# Run on iOS (macOS only)
npm run ios

# Run on web browser
npm run web
```

### Testing with Expo Go

1. Install **Expo Go** app on your phone:
   - Android: [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)

2. Make sure your phone and computer are on the **same WiFi network**

3. Update `API_URL` in `src/services/api.ts` with your computer's local IP address:
   ```typescript
   const API_URL = 'http://192.168.1.XXX:3000/api';  // Replace XXX with your IP
   ```

4. Start the app:
   ```bash
   npm start
   ```

5. Scan the QR code with:
   - **Android**: Expo Go app
   - **iOS**: Camera app → Open in Expo Go

## Building APK (Android)

### Method 1: EAS Build (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure project
eas build:configure

# Build APK
eas build --platform android --profile preview
```

The APK will be available for download from the Expo dashboard.

### Method 2: Local Build

```bash
# Generate Android project
npx expo prebuild

# Build APK
cd android
./gradlew assembleRelease

# APK location:
# android/app/build/outputs/apk/release/app-release.apk
```

## API Endpoints Used

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Vehicles
- `GET /api/vehicles/available?companyId={id}` - Get available vehicles
- `GET /api/vehicles/:id` - Get vehicle details
- `GET /api/vehicles/:id/availability?startDate={date}&endDate={date}` - Check availability

### Bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/:id` - Get booking details
- `POST /api/bookings/:id/confirm` - Confirm booking & generate invoice

## Default Test Data

**Backend URL**: `http://localhost:3000/api`

**Admin Account**:
- Email: `admin@vesla.com`
- Password: `admin123`

**Company**: Vesla Motors
- ID: `347a553b-d7ab-4fa0-8697-3cfa82f41742`

**Test Vehicles**:
1. **Nissan Sunny 2024**
   - Daily: AED 150/day
   - Monthly: AED 3000/month
   - Plate: DXB-12345

2. **Toyota Camry 2024**
   - Daily: AED 200/day
   - Monthly: AED 4500/month
   - Plate: DXB-67890

3. **Honda Accord 2024**
   - Daily: AED 180/day
   - Monthly: AED 4000/month
   - Plate: DXB-11111

## Rate Calculation Logic

The app implements the following rate calculation:

```
Total Days = (End Date - Start Date)
Monthly Periods = floor(Total Days / 30)
Remaining Days = Total Days % 30

Total Amount = (Monthly Periods × Monthly Rate) + (Remaining Days × Daily Rate)
```

**Examples**:
- 7 days: 0 months + 7 days = AED 1,050 (7 × 150)
- 30 days: 1 month + 0 days = AED 3,000 (1 × 3000)
- 45 days: 1 month + 15 days = AED 5,250 (3000 + 2250)
- 75 days: 2 months + 15 days = AED 8,250 (6000 + 2250)

## User Flow

1. **Registration/Login**
   - User creates account or logs in
   - Auth token stored in AsyncStorage
   - Automatic login on app restart

2. **Browse Vehicles**
   - View all available vehicles
   - See daily/monthly rates
   - Pull to refresh

3. **Book Vehicle**
   - Select start and end dates
   - View real-time rate calculation
   - See breakdown (months + days)
   - Confirm booking

4. **Booking Confirmation**
   - View booking number
   - See booking status (PENDING)
   - Total amount displayed
   - Return to vehicle list

## Known Limitations

1. **Customer ID**: Currently hardcoded in `BookingScreen.tsx`. In production, this should come from the user's profile after registration.

2. **Account IDs**: Booking confirmation requires `receivableAccountId` and `revenueAccountId` which are not yet implemented in the mobile flow.

3. **Payment Gateway**: Not yet integrated. Booking creates invoice but payment is handled separately.

4. **Push Notifications**: Not implemented. Users won't receive notifications when bookings are confirmed.

5. **Booking History**: No screen to view past bookings (coming soon).

## Future Enhancements

- [ ] User profile screen with customer details
- [ ] Booking history and status tracking
- [ ] Payment gateway integration
- [ ] Push notifications for booking updates
- [ ] Vehicle images and photo gallery
- [ ] Advanced filters (make, model, price range)
- [ ] Favorites/Wishlist functionality
- [ ] Rating and review system
- [ ] Offline mode with sync
- [ ] Multi-language support (English/Arabic)

## Troubleshooting

### Connection Issues

**Error**: "Network request failed"
- **Solution**: Update `API_URL` in `src/services/api.ts` with correct IP address
- For Android emulator: `http://10.0.2.2:3000/api`
- For physical device: Use your computer's local IP

### Authentication Issues

**Error**: "Token expired" or constant logouts
- **Solution**: Clear app data and re-login
- For development: Clear AsyncStorage

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
AsyncStorage.clear();
```

### Date Picker Not Showing (Android)

- **Solution**: Already using `@react-native-community/datetimepicker` which works on both platforms

### Build Issues

- **Solution**: Clear cache and reinstall
```bash
rm -rf node_modules
npm install
npx expo start -c
```

## Development Notes

- Backend must be running for app to function
- Backend uses Neon PostgreSQL (serverless)
- JWT tokens expire after 7 days (configurable in backend)
- All API calls use Axios interceptors for auth headers
- AsyncStorage persists auth between app restarts

## License

Part of Vesla Audit Project

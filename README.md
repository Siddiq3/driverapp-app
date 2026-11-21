# driverapp-app

One Android app (React Native + Expo + TypeScript) for booking a **car with a driver**, or **a driver for your own car**. The same app has a **customer mode** and a **driver mode**.

Backend: [driverapp-backend](https://github.com/Siddiq3/driverapp-backend) (Supabase). Set that up first.

## What's inside

| Customer (Uber / Rapido look, kept simple) | Driver |
| --- | --- |
| Google login → allow location → name + phone | Register licence (+ car details if they have a car) |
| Home: map with free drivers, **Where are you going?**, recent places | Wait for approval (checked by admin) |
| Two big buttons: **Car + driver** · **Driver only** | Big **Go free / Go busy** switch |
| Search as you type, recent places, **choose on map**, or **book by hours** (no drop) | Loud push + full-screen request card with 2-min timer |
| Choose ride: Mini / Sedan / SUV / Driver only, with price and "3 min away" | First to accept gets the trip |
| Live status, driver card, **4-digit ride PIN**, call, share, SOS | Enter the customer's PIN to start the trip |
| Pay driver by cash / UPI, rate the driver | Navigate in Google Maps, complete, rate customer, go free again |

Design: clean black-and-white, large text and buttons, very few words per screen, so first-time smartphone users in small towns can follow it.

## Folder layout

```
app/                    screens (expo-router: file = screen)
  welcome, setup, driver-register, driver-pending
  customer/             tabs: home · trips · account
  driver/               tabs: home · trips · account
  search.tsx            "Where to?" with suggestions + recent places
  pick-on-map.tsx       choose a place by moving the map
  ride.tsx              choose Mini / Sedan / SUV / Driver only, then book
  trip/[id].tsx         customer's live trip
  drive/[id].tsx        driver's live trip
src/
  lib/api.ts            ★ the ONLY file that talks to the backend
  lib/auth.tsx          Google sign-in + who is signed in
  lib/location.ts       GPS + free phone geocoder (no paid maps API)
  lib/push.ts           push notification setup
  components/           buttons, fields, map, cards
  screens/              screens shared by both modes
  theme.ts              colours, sizes
```

Moving to AWS later = change `src/lib/api.ts` and `src/lib/supabase.ts` only.

## Setup

1. **Install packages** (picks versions that match Expo SDK 58):
   ```bash
   npm install
   npm run setup
   ```
2. **Environment:** copy `.env.example` to `.env` and fill in the values.
3. **Google sign-in:** in Google Cloud Console create
   - an OAuth client of type **Web** → put its ID in `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and in Supabase → Auth → Google
   - an OAuth client of type **Android** with package `com.siddiq.driverapp` and your app's SHA-1 (`eas credentials` shows it)
4. **Maps:** enable *Maps SDK for Android* and put an API key in `GOOGLE_MAPS_ANDROID_KEY`.
5. **Push notifications:** create a Firebase project, add Android app `com.siddiq.driverapp`, download `google-services.json` into this folder, and upload the FCM key to Expo (`eas credentials` → Android → Push notifications).
6. **Run on your phone** (needs a development build, because of Google sign-in and maps):
   ```bash
   npx eas init
   npx eas build --profile development --platform android
   npm start
   ```
7. **Release:** `npm run build:android` → upload the `.aab` to Google Play.

## Checks before launch

- [ ] Replace placeholder fares in the backend `fare_rates` table with real local rates
- [ ] Test with 2 phones: one customer, one driver (approve the driver in Supabase first)
- [ ] Test with the app closed: driver still gets the request notification
- [ ] Add your support WhatsApp number in `.env`
- [ ] Add Terms and Privacy Policy pages (needed for Google Play)

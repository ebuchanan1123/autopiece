# Too Good To Go DZ App

Expo/React Native mobile app for a food-saving marketplace where users can find discounted surplus food from local businesses.

## Focus

This app is the main product surface in this repo.

Current areas in the app include:

- client auth
- discovery and browse flows
- map-based listing search
- favourites
- listing details and reservations
- orders and account/profile screens
- app language preferences

## Run The App

```bash
npm install
npm start
```

Helpful commands:

```bash
npm run ios
npm run android
npm run web
npm run lint
```

## API Configuration

The app reads the backend URL from `EXPO_PUBLIC_API_URL`.

If that variable is not set, the app falls back to the Expo host IP and port `3002`.

## App Structure

- `app/app`: Expo Router screens
- `app/src/features`: feature-level API and state code
- `app/src/components`: shared app-specific UI
- `app/src/lib`: lower-level API and token helpers

## Notes

- The legacy Expo starter files have been removed to keep the app focused on the current product.
- The unused `web` prototype has also been removed from the repo.

# Quiz App Mobile

A cross-platform mobile application for taking quizzes, built with React Native and Expo.

## Features
- Category browsing
- Interactive quiz screen with instant feedback
- Score tracking
- Dark and Light mode support
- Smooth navigation and transitions
- Offline persistence (via AsyncStorage)

## Tech Stack
- **Framework**: React Native with Expo
- **Navigation**: React Navigation (Stack)
- **State Management**: React Context API
- **Icons**: Lucide React Native
- **Styling**: React Native StyleSheet with dynamic themes

## Getting Started

### Prerequisites
- Node.js
- Expo Go app on your physical device (or emulator)

### Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Set your backend API URL in `.env`.

### Scripts
- `npx expo start`: Start the Expo development server
- `npm run android`: Run on Android emulator/device
- `npm run ios`: Run on iOS simulator/device
- `npm run web`: Run in web browser

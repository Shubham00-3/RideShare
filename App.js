import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { RideProvider } from './src/context/RideContext';

export default function App() {
  return (
    <RideProvider>
      <AppNavigator />
    </RideProvider>
  );
}

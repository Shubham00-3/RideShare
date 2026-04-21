import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { RealtimeProvider } from './src/context/RealtimeContext';
import { RideProvider } from './src/context/RideContext';

export default function App() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <RideProvider>
          <AppNavigator />
        </RideProvider>
      </RealtimeProvider>
    </AuthProvider>
  );
}

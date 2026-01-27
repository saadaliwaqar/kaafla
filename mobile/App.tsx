import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LocationProvider } from './src/context/LocationContext';

export default function App() {
    return (
        <SafeAreaProvider>
            <LocationProvider>
                <StatusBar style="light" />
                <AppNavigator />
            </LocationProvider>
        </SafeAreaProvider>
    );
}

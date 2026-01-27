import * as SMS from 'expo-sms';
import { Alert } from 'react-native';

export const SMSHandler = {
    sendLocationUpdate: async (lat: number, lng: number, userId: string) => {
        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
            const msg = `KFL-LOC:${lat.toFixed(6)},${lng.toFixed(6)},${userId}`;
            // In a real app, passing leader number is required.
            const result = await SMS.sendSMSAsync([], msg);
            return result.result === 'sent';
        } else {
            Alert.alert('Error', 'SMS not available');
            return false;
        }
    },

    // Placeholder for listener (Would require native module integration)
    startListening: () => {
        console.log('Starting SMS Listener (Native Module Required)');
    }
};

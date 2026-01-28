/**
 * NativeSMSBridge Service
 * 
 * Handles SMS-based location relay for the Leader Bridge feature.
 * Works only when running in Expo Dev Client (not Expo Go).
 * 
 * Flow:
 * 1. Offline user sends SMS: KFL-LOC:LAT,LNG,USER_ID
 * 2. Leader's app receives SMS (this module)
 * 3. Parses location data
 * 4. Relays to backend via API
 * 5. Sends auto-reply: KFL-STAT:LeaderAt:LAT,LNG
 */

import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid, Alert } from 'react-native';
import * as SMS from 'expo-sms';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://kaafla-production.up.railway.app';

// SMS Message Format
const SMS_PREFIX = 'KFL-LOC:';
const REPLY_PREFIX = 'KFL-STAT:';

interface ParsedLocation {
    latitude: number;
    longitude: number;
    userId: string;
}

interface SMSMessage {
    originatingAddress: string;
    body: string;
    timestamp: number;
}

class NativeSMSBridgeService {
    private listener: any = null;
    private tripCode: string | null = null;
    private leaderId: string | null = null;
    private leaderLocation: { lat: number; lng: number } | null = null;

    /**
     * Initialize the SMS Bridge for a specific trip
     */
    async initialize(tripCode: string, leaderId: string): Promise<boolean> {
        if (Platform.OS !== 'android') {
            console.log('SMS Bridge only available on Android');
            return false;
        }

        this.tripCode = tripCode;
        this.leaderId = leaderId;

        // Request SMS permissions
        const granted = await this.requestSMSPermissions();
        if (!granted) {
            return false;
        }

        // Start listening for SMS
        this.startListening();
        return true;
    }

    /**
     * Request RECEIVE_SMS and READ_SMS permissions
     */
    private async requestSMSPermissions(): Promise<boolean> {
        try {
            const results = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
                PermissionsAndroid.PERMISSIONS.READ_SMS,
                PermissionsAndroid.PERMISSIONS.SEND_SMS,
            ]);

            const allGranted = Object.values(results).every(
                result => result === PermissionsAndroid.RESULTS.GRANTED
            );

            if (!allGranted) {
                Alert.alert(
                    'SMS Permission Required',
                    'To relay locations for offline convoy members, please grant SMS permissions.'
                );
            }

            return allGranted;
        } catch (error) {
            console.error('Error requesting SMS permissions:', error);
            return false;
        }
    }

    /**
     * Start listening for incoming SMS messages
     * Note: This requires a native module that isn't available in Expo Go.
     * The actual implementation would use react-native-android-sms-listener or similar.
     */
    private startListening(): void {
        console.log('SMS Bridge: Starting listener for KFL-LOC messages...');

        // Placeholder for native SMS listener
        // In a real implementation with expo-dev-client, you would:
        // 1. Install react-native-android-sms-listener
        // 2. Set up the native event emitter
        // 3. Listen for incoming messages

        // Example (requires native module):
        // const SmsListener = NativeModules.SmsListener;
        // const eventEmitter = new NativeEventEmitter(SmsListener);
        // this.listener = eventEmitter.addListener('onSMSReceived', this.handleIncomingSMS);

        console.log('SMS Bridge: Ready to receive KFL-LOC messages');
    }

    /**
     * Handle incoming SMS message
     */
    private handleIncomingSMS = async (message: SMSMessage): Promise<void> => {
        const { body, originatingAddress } = message;

        // Check if this is a Kaafla location update
        if (!body.startsWith(SMS_PREFIX)) {
            return;
        }

        console.log('SMS Bridge: Received KFL-LOC message from', originatingAddress);

        // Parse the location data
        const parsed = this.parseLocationSMS(body);
        if (!parsed) {
            console.error('SMS Bridge: Failed to parse location from SMS');
            return;
        }

        // Relay to backend
        const relayed = await this.relayToBackend(parsed);
        if (relayed) {
            // Send auto-reply with leader's position
            await this.sendAutoReply(originatingAddress);
        }
    };

    /**
     * Parse KFL-LOC:LAT,LNG,USER_ID format
     */
    private parseLocationSMS(body: string): ParsedLocation | null {
        try {
            const data = body.replace(SMS_PREFIX, '').trim();
            const [latStr, lngStr, userId] = data.split(',');

            const latitude = parseFloat(latStr);
            const longitude = parseFloat(lngStr);

            if (isNaN(latitude) || isNaN(longitude) || !userId) {
                return null;
            }

            return { latitude, longitude, userId };
        } catch (error) {
            return null;
        }
    }

    /**
     * Relay parsed location to backend
     */
    private async relayToBackend(location: ParsedLocation): Promise<boolean> {
        if (!this.tripCode || !this.leaderId) {
            console.error('SMS Bridge: Not initialized');
            return false;
        }

        try {
            const response = await fetch(`${API_URL}/trip/${this.tripCode}/relay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: location.userId,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    relayedBy: this.leaderId,
                }),
            });

            if (response.ok) {
                console.log('SMS Bridge: Location relayed successfully');
                return true;
            } else {
                console.error('SMS Bridge: Relay failed', await response.text());
                return false;
            }
        } catch (error) {
            console.error('SMS Bridge: Network error', error);
            return false;
        }
    }

    /**
     * Send auto-reply with leader's current position
     */
    private async sendAutoReply(toNumber: string): Promise<void> {
        if (!this.leaderLocation) {
            console.log('SMS Bridge: No leader location to send');
            return;
        }

        const isAvailable = await SMS.isAvailableAsync();
        if (!isAvailable) {
            console.log('SMS Bridge: SMS not available for reply');
            return;
        }

        const message = `${REPLY_PREFIX}LeaderAt:${this.leaderLocation.lat.toFixed(6)},${this.leaderLocation.lng.toFixed(6)}`;

        try {
            await SMS.sendSMSAsync([toNumber], message);
            console.log('SMS Bridge: Auto-reply sent to', toNumber);
        } catch (error) {
            console.error('SMS Bridge: Failed to send reply', error);
        }
    }

    /**
     * Update leader's current location (for auto-reply)
     */
    updateLeaderLocation(lat: number, lng: number): void {
        this.leaderLocation = { lat, lng };
    }

    /**
     * Stop listening and cleanup
     */
    stop(): void {
        if (this.listener) {
            this.listener.remove();
            this.listener = null;
        }
        this.tripCode = null;
        this.leaderId = null;
        console.log('SMS Bridge: Stopped');
    }
}

export const nativeSMSBridge = new NativeSMSBridgeService();

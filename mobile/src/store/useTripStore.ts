import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const DEVICE_ID_KEY = 'kaafla_device_id';

// Generate or retrieve persistent Device ID
const getDeviceId = async (): Promise<string> => {
    let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
};

interface TripState {
    // Trip info
    tripId: string | null;
    code: string | null;
    userId: string;
    role: 'host' | 'guest' | null;
    status: 'idle' | 'active';

    // Leader info (for guests)
    leaderId: string | null;
    leaderPhone: string | null;

    // Connection mode
    connectionMode: 'mqtt' | 'http-polling' | 'offline';

    // Permissions
    hasLocationPermission: boolean;
    hasSmsPermission: boolean;

    // Actions
    initializeDeviceId: () => Promise<void>;
    setTrip: (tripId: string, code: string, role: 'host' | 'guest') => void;
    setLeader: (leaderId: string, phone?: string) => void;
    setLeaderPhone: (phone: string) => void;
    setConnectionMode: (mode: 'mqtt' | 'http-polling' | 'offline') => void;
    setPermissions: (location: boolean, sms: boolean) => void;
    leaveTrip: () => void;
}

export const useTripStore = create<TripState>((set) => ({
    // Initial state
    tripId: null,
    code: null,
    userId: `temp_${Math.random().toString(36).substring(7)}`, // Temporary until initialized
    role: null,
    status: 'idle',
    leaderId: null,
    leaderPhone: null,
    connectionMode: 'mqtt',
    hasLocationPermission: false,
    hasSmsPermission: false,

    // Actions
    initializeDeviceId: async () => {
        const deviceId = await getDeviceId();
        set({ userId: deviceId });
    },

    setTrip: (tripId, code, role) => set({ tripId, code, role, status: 'active' }),

    setLeader: (leaderId, phone) => set({ leaderId, leaderPhone: phone || null }),

    setLeaderPhone: (phone) => set({ leaderPhone: phone }),

    setConnectionMode: (mode) => set({ connectionMode: mode }),

    setPermissions: (location, sms) => set({
        hasLocationPermission: location,
        hasSmsPermission: sms
    }),

    leaveTrip: () => set({
        tripId: null,
        code: null,
        role: null,
        status: 'idle',
        leaderId: null,
        leaderPhone: null,
        connectionMode: 'mqtt',
    }),
}));

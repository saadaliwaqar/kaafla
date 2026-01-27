import { create } from 'zustand';

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

    // Actions
    setTrip: (tripId: string, code: string, role: 'host' | 'guest') => void;
    setLeader: (leaderId: string, phone?: string) => void;
    setConnectionMode: (mode: 'mqtt' | 'http-polling' | 'offline') => void;
    leaveTrip: () => void;
}

export const useTripStore = create<TripState>((set) => ({
    // Initial state
    tripId: null,
    code: null,
    userId: `user_${Math.random().toString(36).substring(7)}`,
    role: null,
    status: 'idle',
    leaderId: null,
    leaderPhone: null,
    connectionMode: 'mqtt',

    // Actions
    setTrip: (tripId, code, role) => set({ tripId, code, role, status: 'active' }),
    setLeader: (leaderId, phone) => set({ leaderId, leaderPhone: phone || null }),
    setConnectionMode: (mode) => set({ connectionMode: mode }),
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

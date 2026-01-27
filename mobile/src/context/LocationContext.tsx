import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';

// Types
export interface ConvoyMember {
    id: string;
    latitude: number;
    longitude: number;
    heading: number;
    speed: number;
    role: 'leader' | 'peer' | 'self';
    status: 'online' | 'bridged' | 'lost';
    lastUpdate: number;
}

interface LocationContextType {
    // Self location
    myLocation: Location.LocationObject | null;
    locationError: string | null;
    isTracking: boolean;

    // Connectivity
    isConnected: boolean;

    // Convoy members
    convoyMembers: Map<string, ConvoyMember>;

    // Actions
    startTracking: () => Promise<boolean>;
    stopTracking: () => void;
    updatePeerLocation: (peer: ConvoyMember) => void;
    removePeer: (peerId: string) => void;
    getDistanceToLeader: () => number | null;
    getGroupSpeed: () => number;
}

const LocationContext = createContext<LocationContextType | null>(null);

// Haversine formula for distance calculation (meters)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

interface LocationProviderProps {
    children: ReactNode;
}

export const LocationProvider = ({ children }: LocationProviderProps) => {
    const [myLocation, setMyLocation] = useState<Location.LocationObject | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isTracking, setIsTracking] = useState(false);
    const [isConnected, setIsConnected] = useState(true);
    const [convoyMembers, setConvoyMembers] = useState<Map<string, ConvoyMember>>(new Map());
    const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);

    // Network status monitoring
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected ?? false);
        });
        return () => unsubscribe();
    }, []);

    // Mark members as "lost" if no update for 15 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const fifteenMinutes = 15 * 60 * 1000;

            setConvoyMembers(prev => {
                const updated = new Map(prev);
                updated.forEach((member, id) => {
                    if (now - member.lastUpdate > fifteenMinutes && member.status !== 'lost') {
                        updated.set(id, { ...member, status: 'lost' });
                    }
                });
                return updated;
            });
        }, 60000); // Check every minute

        return () => clearInterval(interval);
    }, []);

    const startTracking = useCallback(async (): Promise<boolean> => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationError('Permission to access location was denied');
                return false;
            }

            const sub = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 5000,
                    distanceInterval: 10,
                },
                (location) => {
                    setMyLocation(location);
                    setLocationError(null);
                }
            );

            setLocationSubscription(sub);
            setIsTracking(true);
            return true;
        } catch (error) {
            setLocationError('Failed to start location tracking');
            return false;
        }
    }, []);

    const stopTracking = useCallback(() => {
        if (locationSubscription) {
            locationSubscription.remove();
            setLocationSubscription(null);
        }
        setIsTracking(false);
    }, [locationSubscription]);

    const updatePeerLocation = useCallback((peer: ConvoyMember) => {
        setConvoyMembers(prev => {
            const updated = new Map(prev);
            updated.set(peer.id, { ...peer, lastUpdate: Date.now() });
            return updated;
        });
    }, []);

    const removePeer = useCallback((peerId: string) => {
        setConvoyMembers(prev => {
            const updated = new Map(prev);
            updated.delete(peerId);
            return updated;
        });
    }, []);

    const getDistanceToLeader = useCallback((): number | null => {
        if (!myLocation) return null;

        const leader = Array.from(convoyMembers.values()).find(m => m.role === 'leader');
        if (!leader) return null;

        return calculateDistance(
            myLocation.coords.latitude,
            myLocation.coords.longitude,
            leader.latitude,
            leader.longitude
        );
    }, [myLocation, convoyMembers]);

    const getGroupSpeed = useCallback((): number => {
        const speeds: number[] = [];

        // Add my speed
        if (myLocation?.coords.speed) {
            speeds.push(myLocation.coords.speed);
        }

        // Add convoy members' speeds
        convoyMembers.forEach(member => {
            if (member.speed > 0) {
                speeds.push(member.speed);
            }
        });

        if (speeds.length === 0) return 0;

        // Return average speed in km/h
        const avgMps = speeds.reduce((a, b) => a + b, 0) / speeds.length;
        return Math.round(avgMps * 3.6);
    }, [myLocation, convoyMembers]);

    return (
        <LocationContext.Provider
            value={{
                myLocation,
                locationError,
                isTracking,
                isConnected,
                convoyMembers,
                startTracking,
                stopTracking,
                updatePeerLocation,
                removePeer,
                getDistanceToLeader,
                getGroupSpeed,
            }}
        >
            {children}
        </LocationContext.Provider>
    );
};

export const useLocation = (): LocationContextType => {
    const context = useContext(LocationContext);
    if (!context) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
};

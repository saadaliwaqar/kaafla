import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Alert, Text, TouchableOpacity } from 'react-native';
import Mapbox, { Camera, MapView } from '@rnmapbox/maps';
import Constants from 'expo-constants';
import { useTripStore } from '../store/useTripStore';
import { useLocation } from '../context/LocationContext';
import { CarMarker } from '../components/CarMarker';
import { SMSHandler } from '../services/SMSHandler';

// Initialize Mapbox with access token
const MAPBOX_TOKEN = Constants.expoConfig?.extra?.mapboxAccessToken || process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (MAPBOX_TOKEN) {
    Mapbox.setAccessToken(MAPBOX_TOKEN);
}

// Format distance for display
const formatDistance = (meters: number | null): string => {
    if (meters === null) return '--';
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
};

export const MapScreen = ({ navigation }: any) => {
    const { code, role, userId, connectionMode, leaveTrip } = useTripStore();
    const {
        myLocation,
        locationError,
        isConnected,
        convoyMembers,
        startTracking,
        stopTracking,
        getDistanceToLeader,
        getGroupSpeed,
    } = useLocation();

    // Start tracking on mount
    useEffect(() => {
        startTracking();
        return () => stopTracking();
    }, []);

    // Memoized calculations
    const distanceToLeader = useMemo(() => getDistanceToLeader(), [myLocation, convoyMembers]);
    const groupSpeed = useMemo(() => getGroupSpeed(), [myLocation, convoyMembers]);
    const mySpeed = myLocation ? Math.round((myLocation.coords.speed || 0) * 3.6) : 0;

    // Get connection status color and text
    const connectionStatus = useMemo(() => {
        if (!isConnected) return { color: '#FF8C00', text: 'OFFLINE' };
        if (connectionMode === 'http-polling') return { color: '#FFFF00', text: 'POLLING' };
        return { color: '#00FF00', text: 'LIVE' };
    }, [isConnected, connectionMode]);

    const handleManualUpdate = async () => {
        if (!myLocation) {
            Alert.alert('Waiting for GPS...');
            return;
        }
        await SMSHandler.sendLocationUpdate(myLocation.coords.latitude, myLocation.coords.longitude, userId);
    };

    const handleLeave = () => {
        leaveTrip();
        navigation.replace('Lobby');
    };

    // Mapbox token check
    if (!MAPBOX_TOKEN) {
        return (
            <View style={styles.loading}>
                <Text style={styles.errorText}>⚠️ Mapbox token not configured</Text>
                <Text style={styles.text}>Add your Mapbox token to app.json</Text>
            </View>
        );
    }

    // Loading state
    if (!myLocation) {
        return (
            <View style={styles.loading}>
                <Text style={styles.errorText}>{locationError || 'Waiting for GPS...'}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                styleURL="mapbox://styles/mapbox/dark-v11"
                logoEnabled={false}
                attributionEnabled={false}
                scaleBarEnabled={false}
            >
                <Camera
                    centerCoordinate={[myLocation.coords.longitude, myLocation.coords.latitude]}
                    zoomLevel={14}
                    animationMode="flyTo"
                    animationDuration={1000}
                />

                {/* Self marker */}
                <CarMarker
                    id="self"
                    coordinate={[myLocation.coords.longitude, myLocation.coords.latitude]}
                    role={role === 'host' ? 'leader' : 'self'}
                    status={isConnected ? 'online' : 'bridged'}
                    heading={myLocation.coords.heading || 0}
                />

                {/* Convoy members */}
                {Array.from(convoyMembers.values()).map((member) => (
                    <CarMarker
                        key={member.id}
                        id={member.id}
                        coordinate={[member.longitude, member.latitude]}
                        role={member.role}
                        status={member.status}
                        heading={member.heading}
                    />
                ))}
            </MapView>

            {/* Offline Banner */}
            {!isConnected && (
                <View style={styles.offlineBanner}>
                    <Text style={styles.offlineText}>⚠️ LOW SIGNAL MODE</Text>
                </View>
            )}

            {/* HUD - Bottom Sheet */}
            <View style={styles.hud}>
                <View style={styles.statusPanel}>
                    {/* Connection indicator */}
                    <View style={styles.connectionRow}>
                        <View style={[styles.statusDot, { backgroundColor: connectionStatus.color }]} />
                        <Text style={styles.connectionText}>{connectionStatus.text}</Text>
                    </View>

                    <Text style={styles.hudLabel}>CONVOY</Text>
                    <Text style={styles.hudValue}>{code || '--'}</Text>

                    <Text style={styles.hudLabel}>DISTANCE TO LEADER</Text>
                    <Text style={styles.hudValue}>{formatDistance(distanceToLeader)}</Text>

                    <Text style={styles.hudLabel}>GROUP SPEED</Text>
                    <Text style={styles.hudValue}>{groupSpeed} km/h</Text>

                    <Text style={styles.hudLabel}>MY SPEED</Text>
                    <Text style={styles.hudValue}>{mySpeed} km/h</Text>
                </View>

                <View style={styles.buttonsColumn}>
                    {/* Update Location Button (Offline Mode) */}
                    {!isConnected && (
                        <TouchableOpacity style={styles.updateButton} onPress={handleManualUpdate}>
                            <Text style={styles.btnText}>📍</Text>
                            <Text style={styles.btnLabel}>UPDATE</Text>
                        </TouchableOpacity>
                    )}

                    {/* Leave Button */}
                    <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
                        <Text style={styles.leaveText}>LEAVE</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    map: {
        flex: 1,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#121212',
    },
    text: {
        color: '#888',
        marginTop: 10,
    },
    errorText: {
        color: '#FFD700',
        fontSize: 18,
        fontWeight: 'bold',
    },
    offlineBanner: {
        position: 'absolute',
        top: 50,
        width: '100%',
        backgroundColor: '#FF8C00',
        padding: 12,
        alignItems: 'center',
        zIndex: 10,
    },
    offlineText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    },
    hud: {
        position: 'absolute',
        bottom: 30,
        left: 15,
        right: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    statusPanel: {
        backgroundColor: 'rgba(0,0,0,0.9)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#333',
        flex: 1,
        marginRight: 15,
    },
    connectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    connectionText: {
        color: '#888',
        fontSize: 12,
        fontFamily: 'Courier',
        fontWeight: 'bold',
    },
    hudLabel: {
        color: '#666',
        fontSize: 10,
        fontFamily: 'Courier',
        marginTop: 8,
    },
    hudValue: {
        color: '#00FF00',
        fontSize: 18,
        fontFamily: 'Courier',
        fontWeight: 'bold',
    },
    buttonsColumn: {
        alignItems: 'center',
    },
    updateButton: {
        backgroundColor: '#FFD700',
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    btnText: {
        fontSize: 24,
    },
    btnLabel: {
        color: '#000',
        fontSize: 10,
        fontWeight: 'bold',
    },
    leaveButton: {
        backgroundColor: '#FF4444',
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
    },
    leaveText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 12,
    },
});

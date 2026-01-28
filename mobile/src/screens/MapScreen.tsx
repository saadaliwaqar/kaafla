import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Alert, Text, TouchableOpacity, Share } from 'react-native';
import Mapbox, { Camera, MapView, UserLocation } from '@rnmapbox/maps';
import Constants from 'expo-constants';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useTripStore } from '../store/useTripStore';
import { useLocation } from '../context/LocationContext';
import { CarMarker } from '../components/CarMarker';
import { LeaderPhoneModal } from '../components/LeaderPhoneModal';
import { mqttClientService } from '../services/MQTTClientService';
import { SMSHandler } from '../services/SMSHandler';
import { Colors, Layout } from '../../constants/theme';

// Initialize Mapbox
const MAPBOX_TOKEN = Constants.expoConfig?.extra?.mapboxAccessToken || process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (MAPBOX_TOKEN) {
    Mapbox.setAccessToken(MAPBOX_TOKEN);
}

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
        updatePeerLocation,
        getDistanceToLeader,
        getGroupSpeed,
    } = useLocation();

    // Local state for copy feedback and modals
    const [copied, setCopied] = useState(false);
    const [showPhoneModal, setShowPhoneModal] = useState(false);

    // 1. Start Tracking & Connect to MQTT
    useEffect(() => {
        const init = async () => {
            const hasPermission = await startTracking();
            if (hasPermission && code && userId) {
                // BUG FIX: Connect to MQTT immediately
                mqttClientService.connect(code, userId, (data) => {
                    updatePeerLocation({
                        id: data.userId,
                        latitude: data.latitude,
                        longitude: data.longitude,
                        heading: data.heading,
                        speed: data.speed,
                        role: 'peer', // Default to peer, updated if leader
                        status: data.status,
                        lastUpdate: Date.now(),
                    });
                });
            }
        };
        init();

        return () => {
            stopTracking();
            mqttClientService.disconnect();
        };
    }, []);

    // 2. Broadcast My Location
    useEffect(() => {
        if (myLocation) {
            const { latitude, longitude, heading, speed } = myLocation.coords;
            mqttClientService.publishLocation(
                latitude,
                longitude,
                heading || 0,
                speed || 0
            );
        }
    }, [myLocation]);

    const distanceToLeader = useMemo(() => getDistanceToLeader(), [myLocation, convoyMembers]);
    const groupSpeed = useMemo(() => getGroupSpeed(), [myLocation, convoyMembers]);
    const mySpeed = myLocation ? Math.round((myLocation.coords.speed || 0) * 3.6) : 0;
    const memberCount = convoyMembers.size + 1; // +1 for self

    const handleCopyCode = async () => {
        if (code) {
            await Clipboard.setStringAsync(code);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleLeave = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            'Leave Convoy?',
            'Are you sure you want to exit?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: () => {
                        leaveTrip();
                        navigation.replace('Lobby');
                    }
                }
            ]
        );
    };

    const handleSOS = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
            '🚨 SOS ALERT',
            'This will notify all convoy members of an emergency. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'SEND SOS',
                    style: 'destructive',
                    onPress: () => {
                        // TODO: Broadcast SOS via MQTT
                        Alert.alert('SOS Sent', 'All convoy members have been notified.');
                    }
                }
            ]
        );
    };

    if (!myLocation) {
        return (
            <View style={styles.loading}>
                <Text style={styles.loadingText}>{locationError || 'Aquiring Satellite Lock...'}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                styleURL="mapbox://styles/mapbox/navigation-night-v1"
                logoEnabled={false}
                attributionEnabled={false}
                scaleBarEnabled={false}
            >
                <Camera
                    followUserLocation
                    followUserMode={"course" as any}
                    zoomLevel={16}
                    pitch={45}
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

            {/* Offline/Status Banner */}
            {!isConnected && (
                <View style={styles.offlineBanner}>
                    <Text style={styles.offlineText}>⚠️ OFFLINE MODE - SMS ACTIVE</Text>
                </View>
            )}

            {/* Top Bar: Convoy Code + Settings */}
            <BlurView intensity={80} tint="dark" style={styles.topBar}>
                <View>
                    <Text style={styles.label}>CONVOY CODE</Text>
                    <TouchableOpacity onPress={handleCopyCode} style={styles.codeRow}>
                        <Text style={styles.codeValue}>{code}</Text>
                        <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={16} color={Colors.dark.primary} style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                </View>
                <View style={styles.topBarRight}>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.label}>MEMBERS</Text>
                        <Text style={styles.memberCount}>{memberCount}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowPhoneModal(true)} style={styles.settingsBtn}>
                        <Ionicons name="settings" size={20} color={Colors.dark.textDim} />
                    </TouchableOpacity>
                </View>
            </BlurView>

            {/* Leader Phone Modal */}
            <LeaderPhoneModal
                visible={showPhoneModal}
                onClose={() => setShowPhoneModal(false)}
            />

            {/* Bottom HUD */}
            <BlurView intensity={90} tint="dark" style={styles.hudContainer}>
                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <Text style={styles.label}>DIST. LEADER</Text>
                        <Text style={[styles.value, { color: Colors.dark.accent }]}>
                            {formatDistance(distanceToLeader)}
                        </Text>
                    </View>
                    <View style={styles.separator} />
                    <View style={styles.statItem}>
                        <Text style={styles.label}>GROUP SPEED</Text>
                        <Text style={styles.value}>{groupSpeed} <Text style={styles.unit}>km/h</Text></Text>
                    </View>
                    <View style={styles.separator} />
                    <View style={styles.statItem}>
                        <Text style={styles.label}>MY SPEED</Text>
                        <Text style={[styles.value, { color: Colors.dark.primary }]}>
                            {mySpeed} <Text style={styles.unit}>km/h</Text>
                        </Text>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.sosBtn} onPress={handleSOS}>
                        <Ionicons name="warning" size={24} color="#FFF" />
                        <Text style={styles.sosText}>SOS</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
                        <Text style={styles.leaveText}>EXIT</Text>
                    </TouchableOpacity>

                    {!isConnected && (
                        <TouchableOpacity style={styles.smsBtn} onPress={() => SMSHandler.sendLocationUpdate(myLocation.coords.latitude, myLocation.coords.longitude, userId)}>
                            <Ionicons name="chatbubble-ellipses" size={20} color="#000" />
                        </TouchableOpacity>
                    )}
                </View>
            </BlurView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.dark.background },
    map: { flex: 1 },
    loading: { flex: 1, backgroundColor: Colors.dark.background, justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: Colors.dark.primary, fontSize: 16, fontFamily: 'System', fontWeight: 'bold' },

    offlineBanner: {
        position: 'absolute',
        top: 100,
        alignSelf: 'center',
        backgroundColor: '#FF8C00', // Orange per spec for "Low Signal Mode"
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        zIndex: 100,
    },
    offlineText: { color: '#000', fontWeight: 'bold', fontSize: 12 },

    topBar: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        borderRadius: Layout.radius.m,
        overflow: 'hidden',
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    label: { color: Colors.dark.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
    codeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    codeValue: { color: '#FFF', fontSize: 20, fontWeight: '800', fontFamily: 'System' },
    memberCount: { color: '#FFF', fontSize: 20, fontWeight: '800', marginTop: 4 },
    topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    settingsBtn: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: Layout.radius.s
    },

    hudContainer: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        borderRadius: Layout.radius.l,
        overflow: 'hidden',
        padding: 20,
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    statItem: { alignItems: 'center', flex: 1 },
    separator: { width: 1, backgroundColor: Colors.dark.border, height: '80%', alignSelf: 'center' },
    value: { color: '#FFF', fontSize: 24, fontWeight: '800', marginTop: 4 },
    unit: { fontSize: 12, color: Colors.dark.textDim, fontWeight: 'normal' },

    actionRow: { flexDirection: 'row', gap: 10 },
    sosBtn: {
        backgroundColor: Colors.dark.danger,
        padding: 16,
        paddingVertical: 20, // Large touch target (60px+)
        borderRadius: Layout.radius.m,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        minWidth: 80,
    },
    sosText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
    leaveBtn: {
        flex: 1,
        backgroundColor: 'rgba(255, 68, 68, 0.2)',
        borderColor: Colors.dark.border,
        borderWidth: 1,
        padding: 16,
        borderRadius: Layout.radius.m,
        alignItems: 'center',
    },
    leaveText: { color: Colors.dark.textDim, fontWeight: 'bold', letterSpacing: 1 },
    smsBtn: {
        backgroundColor: Colors.dark.accent,
        padding: 16,
        borderRadius: Layout.radius.m,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 60,
    },
    smsText: { color: '#000', fontWeight: 'bold' },
});

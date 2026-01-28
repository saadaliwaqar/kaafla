import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useTripStore } from '../store/useTripStore';
import { Colors, Layout } from '../../constants/theme';

interface PermissionsScreenProps {
    onComplete: () => void;
}

export const PermissionsScreen = ({ onComplete }: PermissionsScreenProps) => {
    const { setPermissions, initializeDeviceId } = useTripStore();
    const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        checkPermissions();
        initializeDeviceId();
    }, []);

    const checkPermissions = async () => {
        const { status } = await Location.getForegroundPermissionsAsync();
        setLocationGranted(status === 'granted');
        setChecking(false);

        if (status === 'granted') {
            setPermissions(true, false);
        }
    };

    const requestLocation = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const { status } = await Location.requestForegroundPermissionsAsync();
        const granted = status === 'granted';
        setLocationGranted(granted);
        setPermissions(granted, false);

        if (granted) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const handleContinue = () => {
        if (locationGranted) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onComplete();
        }
    };

    if (checking) {
        return (
            <View style={styles.container}>
                <Text style={styles.loadingText}>Checking permissions...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="shield-checkmark" size={64} color={Colors.dark.accent} />
                <Text style={styles.title}>Permissions</Text>
                <Text style={styles.subtitle}>Kaafla needs these permissions to track your convoy</Text>
            </View>

            {/* Location Permission Card */}
            <View style={styles.permissionCard}>
                <View style={styles.permissionRow}>
                    <Ionicons
                        name="location"
                        size={28}
                        color={locationGranted ? Colors.dark.success : Colors.dark.textDim}
                    />
                    <View style={styles.permissionInfo}>
                        <Text style={styles.permissionTitle}>Location Access</Text>
                        <Text style={styles.permissionDesc}>
                            Share your location with convoy members
                        </Text>
                    </View>
                    {locationGranted ? (
                        <Ionicons name="checkmark-circle" size={28} color={Colors.dark.success} />
                    ) : (
                        <TouchableOpacity style={styles.grantBtn} onPress={requestLocation}>
                            <Text style={styles.grantText}>Grant</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* SMS Permission Info (Android only) */}
            {Platform.OS === 'android' && (
                <View style={[styles.permissionCard, styles.infoCard]}>
                    <Ionicons name="information-circle" size={24} color={Colors.dark.primary} />
                    <Text style={styles.infoText}>
                        SMS permissions for offline mode will be requested when needed.
                    </Text>
                </View>
            )}

            {/* Continue Button */}
            <TouchableOpacity
                onPress={handleContinue}
                disabled={!locationGranted}
                style={{ marginTop: 'auto' }}
            >
                <LinearGradient
                    colors={locationGranted ? [Colors.dark.accent, '#FFA500'] : ['#333', '#333']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.continueBtn, !locationGranted && styles.continueBtnDisabled]}
                >
                    <Text style={[styles.continueText, !locationGranted && { color: '#666' }]}>
                        {locationGranted ? 'Continue to App' : 'Grant Location to Continue'}
                    </Text>
                    <Ionicons
                        name="arrow-forward"
                        size={20}
                        color={locationGranted ? '#000' : '#666'}
                    />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
        padding: 24,
        paddingTop: 80,
    },
    loadingText: {
        color: Colors.dark.textDim,
        textAlign: 'center',
        marginTop: 100,
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFF',
        marginTop: 16,
    },
    subtitle: {
        color: Colors.dark.textDim,
        textAlign: 'center',
        marginTop: 8,
        fontSize: 14,
    },
    permissionCard: {
        backgroundColor: Colors.dark.surface,
        borderRadius: Layout.radius.m,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    permissionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    permissionInfo: {
        flex: 1,
    },
    permissionTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    permissionDesc: {
        color: Colors.dark.textDim,
        fontSize: 12,
        marginTop: 4,
    },
    grantBtn: {
        backgroundColor: Colors.dark.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: Layout.radius.s,
    },
    grantText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 12,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(0, 240, 255, 0.1)',
        borderColor: Colors.dark.primary,
    },
    infoText: {
        color: Colors.dark.textDim,
        fontSize: 12,
        flex: 1,
    },
    continueBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        borderRadius: Layout.radius.m,
        gap: 8,
    },
    continueBtnDisabled: {
        opacity: 0.5,
    },
    continueText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#000',
    },
});

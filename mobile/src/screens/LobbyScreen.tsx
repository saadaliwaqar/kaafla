import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTripStore } from '../store/useTripStore';
import { Colors, Layout } from '../../constants/theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://kaafla-production.up.railway.app';
const TRIP_API = `${API_URL}/trip`;

export const LobbyScreen = ({ navigation }: any) => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const { userId, setTrip } = useTripStore();

    const createTrip = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);
        try {
            const res = await fetch(`${TRIP_API}/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hostId: userId }),
            });
            const data = await res.json();
            if (res.ok) {
                setTrip(data.tripId, data.code, 'host');
                navigation.navigate('Map');
            } else {
                Alert.alert('Error', data.error || 'Failed to create trip');
            }
        } catch (e) {
            Alert.alert('Error', 'Network request failed');
        } finally {
            setLoading(false);
        }
    };

    const joinTrip = async () => {
        if (code.length !== 6) {
            Alert.alert('Invalid Code', 'Please enter a 6-digit code');
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);
        try {
            const res = await fetch(`${TRIP_API}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code.toUpperCase(), userId }),
            });
            const data = await res.json();
            if (res.ok) {
                setTrip(data.tripId, code, 'guest');
                navigation.navigate('Map');
            } else {
                Alert.alert('Error', data.error || 'Failed to join trip');
            }
        } catch (e) {
            Alert.alert('Error', 'Network request failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Logo Area */}
            <View style={styles.logoContainer}>
                <Ionicons name="car-sport" size={64} color={Colors.dark.accent} />
                <Text style={styles.title}>KAAFLA</Text>
                <Text style={styles.subtitle}>Convoy Tracking System</Text>
            </View>

            {/* Create Button */}
            <TouchableOpacity onPress={createTrip} disabled={loading} activeOpacity={0.8}>
                <LinearGradient
                    colors={[Colors.dark.accent, '#FFA500']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.createButton}
                >
                    {loading ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <>
                            <Ionicons name="add-circle" size={24} color="#000" />
                            <Text style={styles.createBtnText}>CREATE NEW CONVOY</Text>
                        </>
                    )}
                </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR JOIN</Text>
                <View style={styles.dividerLine} />
            </View>

            {/* Join Section */}
            <BlurView intensity={40} tint="dark" style={styles.joinCard}>
                <TextInput
                    style={styles.input}
                    placeholder="ENTER 6-DIGIT CODE"
                    placeholderTextColor={Colors.dark.textDim}
                    value={code}
                    onChangeText={(text) => setCode(text.toUpperCase())}
                    maxLength={6}
                    autoCapitalize="characters"
                    keyboardType="default"
                />
                <TouchableOpacity
                    style={[styles.joinButton, code.length !== 6 && styles.joinButtonDisabled]}
                    onPress={joinTrip}
                    disabled={loading || code.length !== 6}
                >
                    <Ionicons name="enter" size={20} color="#FFF" />
                    <Text style={styles.joinBtnText}>JOIN CONVOY</Text>
                </TouchableOpacity>
            </BlurView>

            {/* Footer */}
            <Text style={styles.footer}>Stay together. Drive safe.</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
        justifyContent: 'center',
        padding: 24,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    title: {
        fontSize: 48,
        fontWeight: '900',
        color: Colors.dark.accent,
        letterSpacing: 8,
        marginTop: 16,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.dark.textDim,
        marginTop: 8,
        letterSpacing: 2,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        borderRadius: Layout.radius.m,
        gap: 12,
    },
    createBtnText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#000',
        letterSpacing: 1,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 32,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.dark.border,
    },
    dividerText: {
        color: Colors.dark.textDim,
        fontWeight: '700',
        marginHorizontal: 16,
        fontSize: 12,
        letterSpacing: 2,
    },
    joinCard: {
        borderRadius: Layout.radius.l,
        overflow: 'hidden',
        padding: 20,
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        color: '#FFF',
        padding: 20,
        borderRadius: Layout.radius.m,
        fontSize: 24,
        textAlign: 'center',
        marginBottom: 16,
        letterSpacing: 8,
        fontWeight: '700',
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    joinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.dark.primary,
        padding: 18,
        borderRadius: Layout.radius.m,
        gap: 10,
    },
    joinButtonDisabled: {
        backgroundColor: Colors.dark.surface,
        opacity: 0.5,
    },
    joinBtnText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 1,
    },
    footer: {
        textAlign: 'center',
        color: Colors.dark.textDim,
        marginTop: 48,
        fontSize: 12,
        fontStyle: 'italic',
    },
});


import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useTripStore } from '../store/useTripStore';

// API URL from environment variable (defaults to localhost for development)
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.13:3000';
const TRIP_API = `${API_URL}/trip`;

export const LobbyScreen = ({ navigation }: any) => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const { userId, setTrip } = useTripStore();

    const createTrip = async () => {
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
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const joinTrip = async () => {
        if (code.length !== 6) {
            Alert.alert('Invalid Code', 'Please enter a 6-digit code');
            return;
        }
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
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>KAAFLA</Text>
            <Text style={styles.subtitle}>Convoy Tracking</Text>

            <TouchableOpacity style={styles.createButton} onPress={createTrip} disabled={loading}>
                {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>CREATE NEW CONVOY</Text>}
            </TouchableOpacity>

            <View style={styles.divider}>
                <Text style={styles.dividerText}>OR JOIN EXISTING</Text>
            </View>

            <TextInput
                style={styles.input}
                placeholder="ENTER 6-DIGIT CODE"
                placeholderTextColor="#666"
                value={code}
                onChangeText={setCode}
                maxLength={6}
                autoCapitalize="characters"
            />

            <TouchableOpacity style={styles.joinButton} onPress={joinTrip} disabled={loading}>
                <Text style={styles.btnTextWhite}>JOIN CONVOY</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FFD700', // Gold
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 18,
        color: '#888',
        textAlign: 'center',
        marginBottom: 50,
    },
    createButton: {
        backgroundColor: '#FFD700',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 30,
    },
    btnText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    btnTextWhite: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    divider: {
        alignItems: 'center',
        marginBottom: 30,
    },
    dividerText: {
        color: '#555',
        fontWeight: 'bold',
    },
    input: {
        backgroundColor: '#1E1E1E',
        color: '#FFF',
        padding: 20,
        borderRadius: 12,
        fontSize: 24,
        textAlign: 'center',
        marginBottom: 20,
        letterSpacing: 4,
    },
    joinButton: {
        backgroundColor: '#333',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#555',
    },
});

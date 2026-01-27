import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PointAnnotation } from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

interface CarMarkerProps {
    id: string;
    coordinate: [number, number]; // [longitude, latitude] for Mapbox
    role: 'leader' | 'peer' | 'self';
    status: 'online' | 'bridged' | 'lost';
    heading?: number;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export const CarMarker = ({ id, coordinate, role, status, heading = 0 }: CarMarkerProps) => {
    // Pulse animation for glow ring
    const pulseScale = useSharedValue(1);

    React.useEffect(() => {
        pulseScale.value = withRepeat(
            withSequence(
                withTiming(1.2, { duration: 1000 }),
                withTiming(1, { duration: 1000 })
            ),
            -1,
            true
        );
    }, []);

    const animatedGlowStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    const getGlowColor = () => {
        switch (status) {
            case 'online': return '#00FF00';    // Green - Live MQTT data
            case 'bridged': return '#FFFF00';   // Yellow - SMS relay data
            case 'lost': return '#FF0000';      // Red - No data > 15 mins
            default: return '#00FF00';
        }
    };

    const getCarColor = () => {
        if (role === 'leader') return '#FFD700'; // Gold
        if (role === 'self') return '#00BFFF';   // Blue
        return '#FFFFFF';                         // White for peers
    };

    return (
        <PointAnnotation
            id={id}
            coordinate={coordinate}
            anchor={{ x: 0.5, y: 0.5 }}
        >
            <View style={styles.container}>
                {/* Animated glow ring */}
                <AnimatedView
                    style={[
                        styles.glowRing,
                        { borderColor: getGlowColor() },
                        animatedGlowStyle,
                    ]}
                />
                {/* Car icon */}
                <View style={[styles.carIcon, { transform: [{ rotate: `${heading}deg` }] }]}>
                    <Ionicons name="car-sport" size={28} color={getCarColor()} />
                </View>
            </View>
        </PointAnnotation>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glowRing: {
        position: 'absolute',
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 3,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    carIcon: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 8,
        borderRadius: 20,
    },
});

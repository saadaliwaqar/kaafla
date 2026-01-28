import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { PointAnnotation } from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import { Colors } from '../../constants/theme';

interface CarMarkerProps {
    id: string;
    coordinate: [number, number];
    role: 'leader' | 'peer' | 'self';
    status: 'online' | 'bridged' | 'lost';
    heading?: number;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export const CarMarker = ({ id, coordinate, role, status, heading = 0 }: CarMarkerProps) => {
    // Animations
    const pulseScale = useSharedValue(1);
    const pulseOpacity = useSharedValue(0.6);
    const radarRotate = useSharedValue(0);

    useEffect(() => {
        // Pulse Effect
        pulseScale.value = withRepeat(
            withSequence(
                withTiming(1.5, { duration: 1500, easing: Easing.out(Easing.ease) }),
                withTiming(1, { duration: 0 })
            ),
            -1,
            false
        );

        pulseOpacity.value = withRepeat(
            withSequence(
                withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) }),
                withTiming(0.6, { duration: 0 })
            ),
            -1,
            false
        );

        // Radar Sweep Effect (Leader only)
        if (role === 'leader') {
            radarRotate.value = withRepeat(
                withTiming(360, { duration: 2000, easing: Easing.linear }),
                -1,
                false
            );
        }
    }, [role]);

    const animatedGlowStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
        opacity: pulseOpacity.value,
    }));

    const animatedRadarStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${radarRotate.value}deg` }],
    }));

    const getColors = () => {
        if (status === 'lost') return { main: Colors.dark.danger, glow: 'rgba(255, 0, 85, 0.4)' };
        if (role === 'leader') return { main: Colors.dark.accent, glow: 'rgba(255, 215, 0, 0.4)' };
        if (role === 'self') return { main: Colors.dark.primary, glow: 'rgba(0, 240, 255, 0.4)' };
        return { main: '#FFFFFF', glow: 'rgba(255, 255, 255, 0.4)' };
    };

    const colors = getColors();

    return (
        <PointAnnotation
            id={id}
            coordinate={coordinate}
            anchor={{ x: 0.5, y: 0.5 }}
        >
            <View style={styles.container}>
                {/* 1. Radar Pulse Ring */}
                <AnimatedView
                    style={[
                        styles.pulseRing,
                        { borderColor: colors.main, backgroundColor: colors.glow },
                        animatedGlowStyle,
                    ]}
                />

                {/* 2. Leader Radar Sweep */}
                {role === 'leader' && (
                    <AnimatedView style={[styles.radarSweep, animatedRadarStyle]}>
                        <View style={[styles.radarBeam, { backgroundColor: colors.main }]} />
                    </AnimatedView>
                )}

                {/* 3. Car/Navigation Arrow */}
                <View style={[
                    styles.carBody,
                    {
                        backgroundColor: colors.main,
                        transform: [{ rotate: `${heading}deg` }],
                        shadowColor: colors.main,
                    }
                ]}>
                    <Ionicons name="navigate" size={20} color="#000" style={{ marginTop: -2 }} />
                </View>
            </View>
        </PointAnnotation>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 80,
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pulseRing: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
    },
    radarSweep: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.3,
    },
    radarBeam: {
        width: 2,
        height: 30,
        position: 'absolute',
        top: 0,
        borderRadius: 1,
    },
    carBody: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 5,
        borderWidth: 2,
        borderColor: '#FFF',
    },
});

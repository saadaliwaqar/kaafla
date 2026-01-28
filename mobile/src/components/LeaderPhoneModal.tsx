import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTripStore } from '../store/useTripStore';
import { Colors, Layout } from '../../constants/theme';

interface LeaderPhoneModalProps {
    visible: boolean;
    onClose: () => void;
}

export const LeaderPhoneModal = ({ visible, onClose }: LeaderPhoneModalProps) => {
    const { leaderPhone, setLeaderPhone } = useTripStore();
    const [phone, setPhone] = useState(leaderPhone || '');

    const handleSave = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setLeaderPhone(phone);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <BlurView intensity={90} tint="dark" style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Ionicons name="call" size={32} color={Colors.dark.accent} />
                        <Text style={styles.title}>Leader's Phone</Text>
                    </View>

                    <Text style={styles.description}>
                        Enter the convoy leader's phone number for SMS updates when offline.
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="+92 300 1234567"
                        placeholderTextColor={Colors.dark.textDim}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        autoFocus
                    />

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.saveBtn, !phone && styles.saveBtnDisabled]}
                            onPress={handleSave}
                            disabled={!phone}
                        >
                            <Ionicons name="checkmark" size={20} color="#000" />
                            <Text style={styles.saveText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContainer: {
        width: '100%',
        borderRadius: Layout.radius.l,
        overflow: 'hidden',
        padding: 24,
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFF',
    },
    description: {
        color: Colors.dark.textDim,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 24,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        color: '#FFF',
        padding: 16,
        borderRadius: Layout.radius.m,
        fontSize: 18,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        padding: 16,
        borderRadius: Layout.radius.m,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    cancelText: {
        color: Colors.dark.textDim,
        fontWeight: '700',
    },
    saveBtn: {
        flex: 1,
        backgroundColor: Colors.dark.accent,
        padding: 16,
        borderRadius: Layout.radius.m,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    saveBtnDisabled: {
        opacity: 0.5,
    },
    saveText: {
        color: '#000',
        fontWeight: '700',
    },
});

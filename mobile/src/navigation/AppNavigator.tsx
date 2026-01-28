import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PermissionsScreen } from '../screens/PermissionsScreen';
import { LobbyScreen } from '../screens/LobbyScreen';
import { MapScreen } from '../screens/MapScreen';
import { Colors } from '../../constants/theme';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName="Permissions"
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: Colors.dark.background }
                }}
            >
                <Stack.Screen name="Permissions">
                    {(props) => (
                        <PermissionsScreen
                            onComplete={() => props.navigation.replace('Lobby')}
                        />
                    )}
                </Stack.Screen>
                <Stack.Screen name="Lobby" component={LobbyScreen} />
                <Stack.Screen name="Map" component={MapScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};


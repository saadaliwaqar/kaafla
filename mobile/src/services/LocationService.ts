import * as Location from 'expo-location';

type LocationCallback = (location: Location.LocationObject) => void;

export const LocationService = {
    requestPermissions: async (): Promise<boolean> => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === 'granted';
    },

    startTracking: async (callback: LocationCallback) => {
        return await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.High,
                timeInterval: 5000,
                distanceInterval: 10,
            },
            callback
        );
    },
};

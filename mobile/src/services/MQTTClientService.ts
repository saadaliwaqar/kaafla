import mqtt, { MqttClient } from 'mqtt';
import { useTripStore } from '../store/useTripStore';

const MQTT_BROKER_URL = process.env.EXPO_PUBLIC_MQTT_BROKER_URL || 'ws://test.mosquitto.org:8080';
const RECONNECT_INTERVAL = 5000;
const HTTP_POLL_INTERVAL = 10000;

type LocationUpdateCallback = (data: {
    userId: string;
    latitude: number;
    longitude: number;
    heading: number;
    speed: number;
    status: 'online' | 'bridged';
}) => void;

class MQTTClientService {
    private client: MqttClient | null = null;
    private tripCode: string | null = null;
    private userId: string | null = null;
    private onLocationUpdate: LocationUpdateCallback | null = null;
    private httpPollInterval: ReturnType<typeof setInterval> | null = null;
    private isConnected: boolean = false;

    /**
     * Connect to MQTT broker and subscribe to trip topic
     */
    public connect(tripCode: string, userId: string, onUpdate: LocationUpdateCallback): void {
        this.tripCode = tripCode;
        this.userId = userId;
        this.onLocationUpdate = onUpdate;

        try {
            // Use WebSocket for React Native
            this.client = mqtt.connect(MQTT_BROKER_URL, {
                clientId: `kaafla_${userId}_${Date.now()}`,
                reconnectPeriod: RECONNECT_INTERVAL,
                connectTimeout: 10000,
            });

            this.client.on('connect', () => {
                console.log('MQTT: Connected to broker');
                this.isConnected = true;
                this.stopHttpPolling();

                // Update connection mode in store
                useTripStore.getState().setConnectionMode('mqtt');

                // Subscribe to trip location updates
                const topic = `kaafla/${tripCode}/location`;
                this.client?.subscribe(topic, (err) => {
                    if (err) {
                        console.error('MQTT: Subscribe error', err);
                    } else {
                        console.log(`MQTT: Subscribed to ${topic}`);
                    }
                });
            });

            this.client.on('message', (topic, message) => {
                try {
                    const data = JSON.parse(message.toString());
                    // Don't process our own messages
                    if (data.userId !== this.userId && this.onLocationUpdate) {
                        this.onLocationUpdate({
                            userId: data.userId,
                            latitude: data.latitude,
                            longitude: data.longitude,
                            heading: data.heading || 0,
                            speed: data.speed || 0,
                            status: data.status || 'online',
                        });
                    }
                } catch (e) {
                    console.error('MQTT: Failed to parse message', e);
                }
            });

            this.client.on('error', (err) => {
                console.error('MQTT: Connection error', err);
                this.handleConnectionFailure();
            });

            this.client.on('close', () => {
                console.log('MQTT: Connection closed');
                this.isConnected = false;
                this.handleConnectionFailure();
            });

            this.client.on('offline', () => {
                console.log('MQTT: Went offline');
                this.isConnected = false;
                this.handleConnectionFailure();
            });

        } catch (error) {
            console.error('MQTT: Failed to connect', error);
            this.handleConnectionFailure();
        }
    }

    /**
     * Publish location update to MQTT
     */
    public publishLocation(latitude: number, longitude: number, heading: number, speed: number): void {
        if (!this.client || !this.isConnected || !this.tripCode || !this.userId) {
            return;
        }

        const topic = `kaafla/${this.tripCode}/location`;
        const message = JSON.stringify({
            userId: this.userId,
            latitude,
            longitude,
            heading,
            speed,
            timestamp: Date.now(),
            status: 'online',
        });

        this.client.publish(topic, message, { qos: 0 }, (err) => {
            if (err) {
                console.error('MQTT: Publish error', err);
            }
        });
    }

    /**
     * Handle MQTT connection failure - fallback to HTTP polling
     */
    private handleConnectionFailure(): void {
        if (!this.httpPollInterval) {
            console.log('MQTT: Switching to HTTP polling fallback');
            useTripStore.getState().setConnectionMode('http-polling');
            this.startHttpPolling();
        }
    }

    /**
     * Start HTTP polling as fallback
     */
    private startHttpPolling(): void {
        if (this.httpPollInterval) return;

        const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.13:3000';

        this.httpPollInterval = setInterval(async () => {
            if (!this.tripCode) return;

            try {
                const response = await fetch(`${API_URL}/trip/${this.tripCode}/locations`);
                if (response.ok) {
                    const locations = await response.json();
                    locations.forEach((loc: any) => {
                        if (loc.userId !== this.userId && this.onLocationUpdate) {
                            this.onLocationUpdate({
                                userId: loc.userId,
                                latitude: loc.latitude,
                                longitude: loc.longitude,
                                heading: loc.heading || 0,
                                speed: loc.speed || 0,
                                status: loc.status || 'online',
                            });
                        }
                    });
                }
            } catch (error) {
                console.error('HTTP Polling failed:', error);
            }
        }, HTTP_POLL_INTERVAL);
    }

    /**
     * Stop HTTP polling
     */
    private stopHttpPolling(): void {
        if (this.httpPollInterval) {
            clearInterval(this.httpPollInterval);
            this.httpPollInterval = null;
        }
    }

    /**
     * Disconnect and cleanup
     */
    public disconnect(): void {
        this.stopHttpPolling();

        if (this.client) {
            this.client.end(true);
            this.client = null;
        }

        this.tripCode = null;
        this.userId = null;
        this.onLocationUpdate = null;
        this.isConnected = false;
    }

    /**
     * Check if connected
     */
    public getIsConnected(): boolean {
        return this.isConnected;
    }
}

export const mqttClientService = new MQTTClientService();

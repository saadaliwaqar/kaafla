import mqtt from 'mqtt';

// Use a public broker for dev, or localhost if running locally
const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://test.mosquitto.org';

class MQTTService {
    private client: mqtt.MqttClient;

    constructor() {
        this.client = mqtt.connect(BROKER_URL);

        this.client.on('connect', () => {
            console.log('Connected to MQTT Broker');
            this.subscribe('kaafla/+/location');
        });

        this.client.on('message', (topic, message) => {
            // Handle incoming messages
            console.log(`Received message on ${topic}: ${message.toString()}`);
        });
    }

    public publish(topic: string, message: string) {
        this.client.publish(topic, message);
    }

    public subscribe(topic: string) {
        this.client.subscribe(topic);
    }
}

export const mqttService = new MQTTService();

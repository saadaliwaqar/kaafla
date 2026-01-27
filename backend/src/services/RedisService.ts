import { createClient, RedisClientType } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false'; // Can disable via env var

class RedisService {
    private client: RedisClientType | null = null;
    private isConnected = false;

    constructor() {
        if (!REDIS_ENABLED) {
            console.log('Redis is disabled via REDIS_ENABLED=false');
            return;
        }

        this.client = createClient({ url: REDIS_URL });

        this.client.on('error', (err) => {
            console.log('Redis Client Error (non-fatal, app will continue):', err.message);
            this.isConnected = false;
        });

        this.connect();
    }

    private async connect() {
        if (!this.client) return;

        try {
            await this.client.connect();
            this.isConnected = true;
            console.log('✓ Connected to Redis');
        } catch (error: any) {
            this.isConnected = false;
            console.warn('⚠ Redis not available - location caching disabled. App will continue without Redis.');
            console.warn('  To enable Redis, run: brew services start redis');
        }
    }

    public async setLocation(userId: string, lat: number, lng: number) {
        if (!this.isConnected || !this.client) {
            // Silently skip when Redis is not available
            return;
        }
        try {
            await this.client.set(`location:${userId}`, JSON.stringify({ lat, lng }), {
                EX: 60 * 15 // Expire after 15 minutes
            });
        } catch (e: any) {
            console.error('Redis Set Error:', e.message);
        }
    }

    public async getLocation(userId: string) {
        if (!this.isConnected || !this.client) {
            return null;
        }
        try {
            const data = await this.client.get(`location:${userId}`);
            return data ? JSON.parse(data) : null;
        } catch (e: any) {
            console.error('Redis Get Error:', e.message);
            return null;
        }
    }
}

export const redisService = new RedisService();

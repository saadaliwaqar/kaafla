import { Request, Response } from 'express';
import { redisService } from '../services/RedisService';
import { Trip } from '../models/Trip';
import { Location } from '../models/Location';

export const createTrip = async (req: Request, res: Response) => {
    try {
        const { hostId } = req.body;
        if (!hostId) {
            res.status(400).json({ error: 'hostId is required' });
            return;
        }

        // Generate 6-digit alphanumeric code
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();

        const newTrip = new Trip({
            code,
            hostId,
            participants: [hostId],
            status: 'active',
        });

        await newTrip.save();

        res.status(201).json({ tripId: newTrip._id, code, hostId });
    } catch (error) {
        console.error('Create Trip Error:', error);
        res.status(500).json({ error: 'Failed to create trip' });
    }
};

export const joinTrip = async (req: Request, res: Response) => {
    try {
        const { code, userId } = req.body;

        const trip = await Trip.findOne({ code: code.toUpperCase() });

        if (!trip) {
            res.status(404).json({ error: 'Trip not found' });
            return;
        }

        if (!trip.participants.includes(userId)) {
            trip.participants.push(userId);
            await trip.save();
        }

        res.status(200).json({
            tripId: trip._id,
            hostId: trip.hostId,
            participants: trip.participants
        });
    } catch (error) {
        console.error('Join Trip Error:', error);
        res.status(500).json({ error: 'Failed to join trip' });
    }
};

/**
 * Update user location (for HTTP polling fallback and SMS relay)
 */
export const updateLocation = async (req: Request, res: Response) => {
    try {
        const code = req.params.code as string;
        const { userId, latitude, longitude, heading, speed, status } = req.body;

        const trip = await Trip.findOne({ code: code.toUpperCase() });
        if (!trip) {
            res.status(404).json({ error: 'Trip not found' });
            return;
        }

        if (!trip.participants.includes(userId)) {
            res.status(403).json({ error: 'User not in this trip' });
            return;
        }

        // Upsert location for user in this trip
        await Location.findOneAndUpdate(
            { userId, tripCode: code },
            {
                latitude: Number(latitude),
                longitude: Number(longitude),
                heading: Number(heading) || 0,
                speed: Number(speed) || 0,
                status: status || 'online',
                timestamp: Date.now()
            },
            { upsert: true, new: true }
        );

        // Also cache in Redis if available
        await redisService.setLocation(userId, Number(latitude), Number(longitude));

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Update Location Error:', error);
        res.status(500).json({ error: 'Failed to update location' });
    }
};

/**
 * Get all participant locations for a trip (HTTP polling endpoint)
 */
export const getTripLocations = async (req: Request, res: Response) => {
    try {
        const code = req.params.code as string;

        const trip = await Trip.findOne({ code: code.toUpperCase() });
        if (!trip) {
            res.status(404).json({ error: 'Trip not found' });
            return;
        }

        // Get latest location for each participant
        const locations = await Location.find({ tripCode: code });

        const now = Date.now();
        const fifteenMinutes = 15 * 60 * 1000;

        // Map locations and mark stale ones as "lost"
        const result = locations.map(loc => ({
            userId: loc.userId,
            latitude: loc.latitude,
            longitude: loc.longitude,
            heading: loc.heading,
            speed: loc.speed,
            status: now - new Date(loc.timestamp).getTime() > fifteenMinutes ? 'lost' : loc.status,
            timestamp: loc.timestamp
        }));

        res.status(200).json(result);
    } catch (error) {
        console.error('Get Locations Error:', error);
        res.status(500).json({ error: 'Failed to get locations' });
    }
};

/**
 * Receive SMS-relayed location from Leader (the "Bridge" endpoint)
 */
export const relayLocation = async (req: Request, res: Response) => {
    try {
        const code = req.params.code as string;
        const { userId, latitude, longitude, relayedBy } = req.body;

        const trip = await Trip.findOne({ code: code.toUpperCase() });
        if (!trip) {
            res.status(404).json({ error: 'Trip not found' });
            return;
        }

        // Verify relayer is the host (Leader)
        if (trip.hostId !== relayedBy) {
            res.status(403).json({ error: 'Only the host can relay locations' });
            return;
        }

        await Location.findOneAndUpdate(
            { userId, tripCode: code },
            {
                latitude: Number(latitude),
                longitude: Number(longitude),
                heading: 0,
                speed: 0,
                status: 'bridged',
                timestamp: Date.now()
            },
            { upsert: true, new: true }
        );

        // Cache in Redis
        await redisService.setLocation(userId, Number(latitude), Number(longitude));

        res.status(200).json({ success: true, message: 'Location relayed via SMS bridge' });
    } catch (error) {
        console.error('Relay Location Error:', error);
        res.status(500).json({ error: 'Failed to relay location' });
    }
};

/**
 * Get trip info
 */
export const getTripInfo = async (req: Request, res: Response) => {
    try {
        const code = req.params.code as string;

        const trip = await Trip.findOne({ code: code.toUpperCase() });
        if (!trip) {
            res.status(404).json({ error: 'Trip not found' });
            return;
        }

        res.status(200).json({
            tripId: trip._id,
            code: trip.code,
            hostId: trip.hostId,
            participants: trip.participants,
            status: trip.status,
        });
    } catch (error) {
        console.error('Get Trip Info Error:', error);
        res.status(500).json({ error: 'Failed to get trip info' });
    }
};

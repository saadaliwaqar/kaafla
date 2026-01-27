import { Router } from 'express';
import {
    createTrip,
    joinTrip,
    updateLocation,
    getTripLocations,
    relayLocation,
    getTripInfo
} from '../controllers/TripController';

const router = Router();

// Trip management
router.post('/create', createTrip);
router.post('/join', joinTrip);
router.get('/:code', getTripInfo);

// Location endpoints (for HTTP polling fallback)
router.post('/:code/location', updateLocation);
router.get('/:code/locations', getTripLocations);

// SMS Bridge relay endpoint (Leader receives SMS, relays to server)
router.post('/:code/relay', relayLocation);

export default router;

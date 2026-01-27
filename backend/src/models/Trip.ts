import mongoose, { Document, Schema } from 'mongoose';

export interface ITrip extends Document {
    code: string;
    hostId: string;
    participants: string[];
    status: 'active' | 'completed';
    createdAt: Date;
}

const TripSchema: Schema = new Schema({
    code: { type: String, required: true, unique: true },
    hostId: { type: String, required: true },
    participants: [{ type: String }],
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    createdAt: { type: Date, default: Date.now }
});

export const Trip = mongoose.model<ITrip>('Trip', TripSchema);

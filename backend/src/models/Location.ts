import mongoose, { Document, Schema } from 'mongoose';

export interface ILocation extends Document {
    userId: string;
    tripCode: string;
    latitude: number;
    longitude: number;
    heading: number;
    speed: number;
    status: 'online' | 'bridged' | 'lost';
    timestamp: Date;
}

const LocationSchema: Schema = new Schema({
    userId: { type: String, required: true },
    tripCode: { type: String, required: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    heading: { type: Number, default: 0 },
    speed: { type: Number, default: 0 },
    status: { type: String, enum: ['online', 'bridged', 'lost'], default: 'online' },
    timestamp: { type: Date, default: Date.now }
});

// Index to speed up queries by tripCode and timestamp
LocationSchema.index({ tripCode: 1, timestamp: -1 });

export const Location = mongoose.model<ILocation>('Location', LocationSchema);

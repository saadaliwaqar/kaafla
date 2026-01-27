import express from 'express';
import cors from 'cors';
import connectDB from './config/database';

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to Database
connectDB();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Kaafla Backend is Running');
});

import tripRoutes from './routes/tripRoutes';
import './services/MQTTService';
import './services/RedisService';

app.use('/trip', tripRoutes);

app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT} - Accessible at http://192.168.1.13:${PORT}`);
});

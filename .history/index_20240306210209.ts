// index.ts
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import passport from 'passport';
import router from './routes'; // Ensure this path is correct based on your project structure
import './config/passport-setup'; // Ensure this path is correct
/// <reference types="./types" />


const app = express();
const PORT: string | number = process.env.PORT || 8080;

// MongoDB connection
mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET!,
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    // Add a session store here, such as connect-mongo for MongoDB
  }));
// Set up routes
app.use('/api', router);
// app.use(repoRoutes);

app.get('/', (req, res) => {
    res.send('Hello, world!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

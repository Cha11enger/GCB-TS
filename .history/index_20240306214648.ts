// index.ts
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import passport from 'passport';
import router from './routes'; // Ensure this path is correct based on your project structure
import './config/passport-setup'; // Ensure this path is correct
// import './types/custom.d.ts';
// / <reference types="./types/custom.d.ts" />
import MongoStore from 'connect-mongo';


const app = express();
const PORT: string | number = process.env.PORT || 8080;

// MongoDB connection
mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'yourSecretKey', // Replace 'yourSecretKey' with a real secret key
  resave: false,
  saveUninitialized: false, // Change to true if you want to save session on every request
  cookie: { secure: true, maxAge: 1000 * 60 * 60 * 24 * 7 }, // For HTTPS set secure to true
  store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: 'sessions'
  })
}));

app.use(passport.initialize());
app.use(passport.session());
// Set up routes
app.use('/api', router);
// app.use(repoRoutes);

app.get('/', (req, res) => {
    res.send('Hello, world!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

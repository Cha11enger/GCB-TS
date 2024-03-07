import express, { Request, Response } from 'express';
import passport from 'passport';
import passportGithub from 'passport-github2';
import mongoose from 'mongoose';
import User, { IUser } from '../models'; // Adjust path as necessary
import dotenv from 'dotenv';

dotenv.config();

// MongoDB connection setup
mongoose.connect(process.env.MONGO_URI as string)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const GitHubStrategy = passportGithub.Strategy;
const router = express.Router();

// Serialize and Deserialize User
passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// GitHub Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID as string,
    clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    callbackURL: process.env.GITHUB_CALLBACK_URL as string
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ githubId: profile.id });
      if (!user) {
        user = await User.create({
          githubId: profile.id,
          accessToken: accessToken,
          displayName: profile.displayName,
          username: profile.username,
          profileUrl: profile.profileUrl,
          avatarUrl: profile.photos[0].value
        });
      } else {
        user.accessToken = accessToken;
        await user.save();
      }
      return done(null, user);
    } catch (error) {
      console.error("Error saving the user:", error);
      return done(error, null);
    }
  }
));

// Middleware for passport
router.use(passport.initialize());

// GitHub Authentication Route
router.get('/auth/github', passport.authenticate('github'));

// GitHub Callback Route
router.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/login' }), 
  async (req: Request, res: Response) => {
    // Here, handle the successful authentication.
    // Redirect or respond based on your application needs.
    // E.g., you might want to store additional session info here
    res.status(200).json({ message: 'User authenticated successfully' });
});

export default router;

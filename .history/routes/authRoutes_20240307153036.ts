import express, { Request, Response } from 'express';
import passport from 'passport';
import passportGithub from 'passport-github2';
// import mongoose from 'mongoose';
import User, { IUser } from '../models/User'; // Adjust path as necessary
import dotenv from 'dotenv';
import { NextFunction } from 'express';

dotenv.config();

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
  async (accessToken: string, refreshToken: string, profile: any, done: any) => {
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
// Function for initiating GitHub authentication
export const authenticateWithGitHub = () => passport.authenticate('github');

// Function for handling the GitHub callback
export const handleGitHubCallback = (req: Request, res: Response, next: NextFunction) =>
  passport.authenticate('github', { failureRedirect: '/auth/github' }, (err: any, user: any, info: any) => {
    if (err) { return next(err); }
    if (!user) { return res.redirect('/auth/github'); }

    req.logIn(user, (err) => {
      if (err) { return next(err); }
      // After successful login, you can redirect or respond based on your application needs
      res.status(200).json({ message: 'User authenticated successfully' });
    });
  })(req, res, next);


export const getGithubAuthUrl = () => { 
  return process.env.GITHUB_AUTH_URL as string;
};

export 

export default router;

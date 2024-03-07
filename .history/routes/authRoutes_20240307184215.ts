import express, { Request, Response } from 'express';
import passport from 'passport';
import passportGithub from 'passport-github2';
// import mongoose from 'mongoose';
import User, { IUser } from '../models/User'; // Adjust path as necessary
import dotenv from 'dotenv';
import { NextFunction } from 'express';
//import axios
import axios from 'axios';
//import setCustomSessionProperty and getCustomSessionProperty 
import { setCustomSessionProperty, getCustomSessionProperty } from '../utils/sessionUtils';

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
export const authenticateWithGitHub = passport.authenticate('github', { scope: ['user:email'] });

// Function for handling the GitHub callback
// export const handleGitHubCallback = (req: Request, res: Response, next: NextFunction) =>
//   passport.authenticate('github', { failureRedirect: '/auth/github' }, (err: any, user: any, info: any) => {
//     if (err) { return next(err); }
//     if (!user) { return res.redirect('/auth/github'); }

//     req.logIn(user, (err) => {
//       if (err) { return next(err); }
//       // After successful login, you can redirect or respond based on your application needs
//       res.status(200).json({ message: 'User authenticated successfully' });
//     });
//   })(req, res, next);

export const handleGitHubCallback = (req: Request, res: Response, next: NextFunction) =>
  passport.authenticate('github', { failureRedirect: '/auth/github' }, (err: any, user: IUser, info: any) => {
    if (err) { return next(err); }
    if (!user) { return res.redirect('/auth/github'); }

    req.logIn(user, (err) => {
      if (err) { return next(err); }
      
      // Store user's accessToken in the session or database
      setCustomSessionProperty(req.session, 'accessToken', user.accessToken);
      // Store user's GitHub URL in the session
      setCustomSessionProperty(req.session, 'githubUrl', user.profileUrl);

      // Notify the GPT-3 interface that authentication was successful
      // This could be a redirect, a server-sent event, a WebSocket message, etc.
      res.status(200).json({ message: 'User authenticated successfully' });
      // res.redirect('/'); // Redirect to the home page
    });
  })(req, res, next);


export const getGithubAuthUrl = () => { 
  return process.env.GITHUB_AUTH_URL as string;
};

// Add a new route for the proxy token exchange
export const exchangeGithubToken = async (req: Request, res: Response) => {
  // Extract the code from the body
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Authorization code is required." });
  }

  try {
    // Exchange the authorization code for an access token
    const accessTokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }, {
      headers: { Accept: 'application/json' },
    });

    // Respond with the access token
    res.status(200).json({ accessToken: accessTokenResponse.data.access_token });
  } catch (error) {
    console.error('Error exchanging authorization code:', error);
    res.status(500).json({ error: "An error occurred while exchanging the authorization code." });
  }
};

// Add a new route for the proxy token exchange


// export as authRoutes
export const authRoutes = {
  authenticateWithGitHub,
  handleGitHubCallback,
  getGithubAuthUrl,
  exchangeGithubToken
};
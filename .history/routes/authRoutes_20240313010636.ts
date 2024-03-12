// authRoutes.ts
import express from 'express';
import passport from 'passport';
const GitHubStrategy = require('passport-github2').Strategy;
import fetch from 'node-fetch';
import User, { IUser } from '../models/User';
import { setCustomSessionProperty, getCustomSessionProperty } from '../utils/sessionUtils';

const router = express.Router();

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID as string,
  clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
  callbackURL: "https://gcb-ts.onrender.com/api/auth/github/callback",
  passReqToCallback: true
},
async (req, accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ githubId: profile.id });
    if (!user) {
      user = new User({
        githubId: profile.id,
        accessToken,
        displayName: profile.displayName,
        username: profile.username,
        profileUrl: profile._json.html_url,
        avatarUrl: profile._json.avatar_url,
      });
    } else {
      user.accessToken = accessToken;
    }

    const savedUser = await user.save();
    req.login(savedUser, (err) => {
      if (err) { console.error('Login error:', err); return done(err); }
      // Session property setting
      setCustomSessionProperty(req.session, 'githubId', savedUser.githubId);
      setCustomSessionProperty(req.session, 'accessToken', savedUser.accessToken);
      done(null, savedUser);
    });
  } catch (error) {
    console.error('GitHub strategy error:', error);
    done(error);
  }
}));

passport.serializeUser((user: any, done) => { 
  done(null, user.id); 
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).exec();
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

router.get('/github', (req, res) => {
  // Generate and redirect to GitHub auth URL
  const state = req.query.state as string;
  const authorizationURL = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(process.env.GITHUB_CLIENT_ID as string)}&redirect_uri=${encodeURIComponent(process.env.GITHUB_CALLBACK_URL as string)}&scope=repo user:email&state=${encodeURIComponent(state)}`;
  res.redirect(authorizationURL);
});

router.get('/github/callback', 
  passport.authenticate('github', { failureRedirect: '/api/auth/github' }), 
  (req, res) => {
    // After successful authentication
    const { code, state } = req.query;
    // Redirect to the specified callback URL with the authorization code and state
    res.redirect(`${process.env.OPENAI_CALLBACK_URL}?code=${code}&state=${state}`);
});

router.get('/githubid', (req, res) => {
  const githubId = getCustomSessionProperty<string>(req.session, 'githubId');
  if (!githubId) {
    return res.status(404).send('GitHub ID not found in session.');
  }
  res.send(`GitHub ID in session: ${githubId}`);
});

router.post('/github/token', async (req, res) => {
  const { code } = req.body;
  const githubId = getCustomSessionProperty<string>(req.session, 'githubId');
  if (!githubId) {
    return res.status(400).send('GitHub ID missing from session.');
  }

  // Token exchange logic here (similar to your existing implementation)
  // Ensure error handling for fetch operations and user updates
});

export default router;

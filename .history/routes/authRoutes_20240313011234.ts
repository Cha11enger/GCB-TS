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
  async (req: express.Request, accessToken: string, _refreshToken: string, profile: any, done: (error: any, user?: any) => void) => {
    try {
      let user: IUser | null = await User.findOne({ githubId: profile.id });
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
        req.session.save(err => {
          if (err) {
            console.error('Session save error:', err);
          } else {
            // get the session 
            const githubId = getCustomSessionProperty<string>(req.session, 'githubId');
            console.log('session got saved:', githubId);
          }
        });
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

  try {
    // Find the user associated with the GitHub ID
    const user = await User.findOne({ githubId });
    if (!user) {
      console.error('User not found for GitHub ID:', githubId);
      return res.status(404).json({ error: 'User not found.' });
    }

    // Proceed with the token exchange process
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_CALLBACK_URL,
      }),
    });

    const data = await response.json();

    if (data.access_token) {
      // Update the user's access token in the database
      user.accessToken = data.access_token;
      await user.save();
      console.log('Access token updated for user:', user.githubId);
      res.json({ access_token: data.access_token });
    } else {
      console.error('Failed to exchange token:', data);
      res.status(400).json({ error: 'Failed to exchange token.', details: data });
    }
  } catch (error) {
    console.error('Error during token exchange process:', error);
    res.status(500).json({ error: 'Internal server error during token exchange.', details: error });
  }
});

export default router;

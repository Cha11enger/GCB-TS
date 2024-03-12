// routes/authRoutes.ts
import express from 'express';
import passport from 'passport';
// import { Strategy as GitHubStrategy, Profile } from 'passport-github2';
const GitHubStrategy = require('passport-github2').Strategy;
import fetch from 'node-fetch';
import User, { IUser } from '../models/User';
import { setCustomSessionProperty, getCustomSessionProperty  } from '../utils/sessionUtils';

// import User from '../models/User'; // Make sure this imports correctly

const router = express.Router();

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID as string,
    clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    callbackURL: "https://gcb-ts.onrender.com/api/auth/github/callback",
    passReqToCallback: true
  },
  async (req: express.Request, accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: IUser | false) => void) => {
    try {
      let user = await User.findOne({ githubId: profile.id });

      if (!user) {
        user = new User({
          githubId: profile.id,
          accessToken,
          displayName: profile.displayName,
          username: profile.username, // Make sure username is correctly mapped
          profileUrl: profile.profileUrl, // Adjust if necessary
          avatarUrl: profile._json.avatar_url,
        });
      } else {
        // Update the access token for the existing user
        user.accessToken = accessToken;
      }

      await user.save().then((savedUser) => {
        req.login(savedUser, (err) => {
          if (err) {
            console.error('Error during login:', err);
            return done(err);
          }
          // Store GitHub ID and access token in the session
        setCustomSessionProperty(req.session, 'githubId', savedUser.githubId);
        setCustomSessionProperty(req.session, 'accessToken', savedUser.accessToken);
        console.log('Current session state:', req.session);
        req.session.save(err => {
            if(err) {
                console.error('Session save error:', err);
            } else {
                    // get the session 
                    getCustomSessionProperty<string>(req.session, 'githubId');
                    console.log('Session saved successfully', savedUser.githubId);
            }
        });
        console.log('User authenticated and session updated:', savedUser);
        done(null, savedUser); // Pass the user to the next middleware
        });
      });
    } catch (error) {
      console.error('Error in GitHub strategy:', error);
      done(error, false);
    }
  }
));



passport.serializeUser((user: any, done) => { 
        done(null, user.id); 
});

passport.deserializeUser(async (id: string, done) => {
    try {
      const user: IUser | null = await User.findById(id).exec();
      done(null, user);
      console.log('Deserialized user:', user);
    } catch (error) {
      done(error, null);
    }
  });

router.get('/github', (req, res) => {
    const { state } = req.query;
    const authorizationURL = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent("https://gcb-ts.onrender.com/api/auth/github/callback")}&scope=repo user:email&state=${state}`;
    console.log('Redirecting to GitHub authorization URL:', authorizationURL);
    res.redirect(authorizationURL);
});

router.get('/github/callback', 
  passport.authenticate('github', { failureRedirect: '/api/auth/github' }), 
  (req, res) => {
    // Successful authentication
    const { code, state } = req.query;
    const openaiCallbackUrl = process.env.OPENAI_CALLBACK_URL;

    if (req.user) {
        const user: IUser & { githubId: string } = req.user as IUser & { githubId: string }; // Cast req.user to include the githubId property
        // const user = req.user as IUser & { githubId: string }; 
        // const user = req.user as IUser & { githubId: string, accessToken: string };
        // const { githubId, accessToken } = user;

        const successState = 'success';

        // store the code and state in the session and db
        setCustomSessionProperty(req.session, 'code', code);
        setCustomSessionProperty(req.session, 'state', state);
        setCustomSessionProperty(req.session, 'successState', successState);
        setCustomSessionProperty(req.session, 'githubId', user.githubId); // Update to use user.githubId
        setCustomSessionProperty(req.session, 'accessToken', user.accessToken); // Update to use user.accessToken
        // Ensure casting to the correct type
        // session management
        // setCustomSessionProperty(req.session, 'accessToken', user.accessToken);
        console.log('User authenticated:', user);

        // Redirect to OpenAI with the code and state, or any other desired action
        res.redirect(`${openaiCallbackUrl}?code=${code}&state=${state}`);
        // res.redirect(`${openaiCallbackUrl}?code=${req.query.code}&state=${successState}`);
    } else {
        console.log('Authentication failed, redirecting to error.');
        res.redirect(`${openaiCallbackUrl}?error=authorization_failed&state=${state}`);
    }
});

router.get('/githubid', (req, res) => {
  setCustomSessionProperty(req.session, 'githubId', '12345');
  // Manually save the session to ensure changes are persisted
  req.session.save(err => {
    if (err) {
      console.error('Error saving session:', err);
      return res.status(500).send('Failed to save session.');
    }
    // success saving session

    const githubId = getCustomSessionProperty<string>(req.session, 'githubId');
    console.log('githubId:', githubId);
    if (!githubId) {
      return res.status(404).send('GitHub ID not found in session.');
    }
    
    // success saving session
    res.send('GitHub ID saved to session.', r);
  });
});

router.post('/github/token', async (req, res) => {
    const { code } = req.body;
    const githubId = getCustomSessionProperty<string>(req.session, 'githubId');
    // or get it from db
    const user = await User.findOne({ githubId: githubId });
    console.log('Session saved successfully', githubId);
    console.log('Current session state:', req.session);

    if (!githubId) {
        console.error('GitHub ID missing from session.');
        return res.status(400).json({ error: 'GitHub ID missing from session.' });
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

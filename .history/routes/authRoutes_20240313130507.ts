// authRoutes.ts
import passport from 'passport';
import { Strategy as GitHubStrategy, Profile } from 'passport-github2';
import { Request, Response } from 'express';
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
  async (req: express.Request, accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
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
      await user.save();
      setCustomSessionProperty(req.session, 'githubId', user.githubId);
      setCustomSessionProperty(req.session, 'accessToken', user.accessToken);
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          done(err, undefined);
        } else {
          done(null, user);
        }
      });
    } catch (error) {
      console.error('GitHub strategy error:', error);
      done(error, undefined);
    }
  }
));

passport.serializeUser<any>((user: IUser, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user: IUser | null = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

router.get('/github', (req, res) => {
  const state = req.query.state as string;
  const authorizationURL = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(process.env.GITHUB_CLIENT_ID as string)}&redirect_uri=${encodeURIComponent("https://gcb-ts.onrender.com/api/auth/github/callback")}&scope=repo user:email&state=${encodeURIComponent(state)}`;
  res.redirect(authorizationURL);
});

router.get('/github/callback', passport.authenticate('github', { failureRedirect: '/api/auth/github' }), (req, res) => {
  const { code, state } = req.query;
  const openaiCallbackUrl = process.env.OPENAI_CALLBACK_URL;
  if (code && state) {
    res.redirect(`${openaiCallbackUrl}?code=${code}&state=${state}`);
  } else {
    console.error('Authentication failed or session is not available.');
    res.redirect(`${openaiCallbackUrl}?error=authorization_failed&state=${state}`);
  }
});

// function to exchange token
router.post('/github/token', async (req, res) => {
  const { code} = req.body;
  // no need githubId just exchange the token

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
    res.json({ access_token: data.access_token });
  } else {
    res.status(400).json({ error: 'Failed to exchange token.', details: data });
  }
});


// router.post('/github/token', async (req, res) => {
//   const { code } = req.body;
//   const githubId = getCustomSessionProperty<string>(req.session, 'githubId');
//   if (!githubId) {
//     return res.status(400).send('GitHub ID missing from session.');
//   }

//   try {
//     // Find the user associated with the GitHub ID
//     const user = await User.findOne({ githubId });
//     if (!user) {
//       console.error('User not found for GitHub ID:', githubId);
//       return res.status(404).json({ error: 'User not found.' });
//     }

//     // Proceed with the token exchange process
//     const response = await fetch('https://github.com/login/oauth/access_token', {
//       method: 'POST',
//       headers: {
//         'Accept': 'application/json',
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         client_id: process.env.GITHUB_CLIENT_ID,
//         client_secret: process.env.GITHUB_CLIENT_SECRET,
//         code,
//         redirect_uri: process.env.GITHUB_CALLBACK_URL,
//       }),
//     });

//     const data = await response.json();

//     if (data.access_token) {
//       // Update the user's access token in the database
//       user.accessToken = data.access_token;
//       await user.save();
//       console.log('Access token updated for user:', user.githubId);
//       // Respond with the actual access token obtained from GitHub
//       res.json({ access_token: data.access_token });
//     } else {
//       console.error('Failed to exchange token:', data);
//       res.status(400).json({ error: 'Failed to exchange token.', details: data });
//     }
//   } catch (error) {
//     console.error('Error during token exchange process:', error);
//     res.status(500).json({ error: 'Internal server error during token exchange.', details: error });
//   }
// });


export default router;

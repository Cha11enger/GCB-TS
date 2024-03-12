// routes/authRoutes.ts
import express from 'express';
import passport from 'passport';
// import { Strategy as GitHubStrategy, Profile } from 'passport-github2';
const GitHubStrategy = require('passport-github2').Strategy;
import fetch from 'node-fetch';
import User, { IUser } from '../models/User';



// import User from '../models/User'; // Make sure this imports correctly

const router = express.Router();

// This is a custom type that extends the GitHub profile with the _json property
// interface ExtendedGitHubProfile extends Profile {
//     _json: {
//         login: string;
//         html_url: string;
//         avatar_url: string;
//     };
// }

// passport.use(new GitHubStrategy({
//         clientID: process.env.GITHUB_CLIENT_ID as string,
//         clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
//         callbackURL: "https://gcb-ts.onrender.com/api/auth/github/callback",
//         passReqToCallback: true,
// }, async (req: express.Request, accessToken: string, _refreshToken: string, profile: ExtendedGitHubProfile, done: (error: any, user?: any | false) => void) => {
//         try {
//                 // Attempt to find the user by their GitHub ID
//                 let user = await User.findOne({ githubId: profile.id });
//                 if (!user) {
//                         // If no user is found, create a new user
//                         user = new User({
//                                 githubId: profile.id,
//                                 accessToken,
//                                 displayName: profile.displayName || profile._json.login,
//                                 username: profile._json.login,
//                                 profileUrl: profile._json.html_url,
//                                 avatarUrl: profile._json.avatar_url,
//                         });
//                 } else {
//                         // If the user exists, update their access token
//                         user.accessToken = accessToken;
//                 }
//                 console.log('Saving user:', user);
//                 const savedUser = await user.save().catch(err => console.error('Save user error:', err));
//                 req.login(user, (err) => {
//                     if (err) {
//                       console.error('Login failed', err);
//                       return done(err);
//                     }
//                     console.log('User logged in:', user);
//                     return done(null, user);
//                   });
//                 console.log('User saved:', savedUser);
//                 done(null, savedUser); // Successfully return the saved/updated user
//         } catch (error) {
//                 console.error('Error during user saving/updating:', error);
//                 done(error);
//         }
// }));

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "https://gcb-ts.onrender.com/api/auth/github/callback",
    passReqToCallback: true
  },
async (req: express.Request, accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      let user = await User.findOne({ githubId: profile.id });

      if (!user) {
        user = new User({
          githubId: profile.id,
          accessToken,
          displayName: profile.displayName,
          username: profile.username,
          profileUrl: profile.profileUrl,
          avatarUrl: profile._json.avatar_url,
        });
      } else {
        user.accessToken = accessToken; // Update the access token
      }

      const savedUser = await user.save();
      done(null, savedUser);
    } catch (error) {
      done(error, null);
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

// router.get('/github/callback', (req, res) => {
//         const { code, state } = req.query;
//         const openaiCallbackUrl = process.env.OPENAI_CALLBACK_URL;

//         if (code) {
//                 console.log('Redirecting to OpenAI callback URL with code:', code);
//                 res.redirect(`${openaiCallbackUrl}?code=${code}&state=${state}`);
//         } else {
//                 console.log('Redirecting to OpenAI callback URL with error');
//                 res.redirect(`${openaiCallbackUrl}?error=authorization_failed&state=${state}`);
//         }
// });

router.get('/github/callback', 
  passport.authenticate('github', { failureRedirect: '/api/auth/github' }), 
  (req, res) => {
    // Successful authentication
    const { code, state } = req.query;
    const openaiCallbackUrl = process.env.OPENAI_CALLBACK_URL;
    
    if (req.user) {
        const user = req.user;
        // session mana
      console.log('User authenticated:', req.user);
      // Redirect to OpenAI with the code and state, or any other desired action
      res.redirect(`${openaiCallbackUrl}?code=${code}&state=${state}`);
    } else {
      console.log('Authentication failed, redirecting to error.');
      res.redirect(`${openaiCallbackUrl}?error=authorization_failed&state=${state}`);
    }
});

router.post('/github/token', async (req, res) => {
        const { code } = req.body;
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
                        redirect_uri: "https://gcb-ts.onrender.com/api/auth/github/callback",
                }),
        });
        const data = await response.json();
        if (data.access_token) {
                console.log('Exchanged token successfully:', data.access_token);
                res.json({ access_token: data.access_token });
        } else {
                console.log('Failed to exchange token');
                res.status(400).json({ error: 'Failed to exchange token.' });
        }
});

export default router;

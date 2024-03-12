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
        const user = req.user as IUser & { githubId: string }; 
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

// router.get('/github/callback', 
//   passport.authenticate('github', { failureRedirect: '/api/auth/github' }), 
//   (req, res) => {
//     // Successful authentication
//     const { code } = req.query; // state is not needed here since we are setting it below
//     const openaiCallbackUrl = process.env.OPENAI_CALLBACK_URL;

//     if (req.user) {
//         console.log('User authenticated:', req.user);
//         const successState = 'success';
//         // Redirect to OpenAI with the code and the success state and continue for analysis the repo with analyzeGithubUrl api
//         res.redirect(`${openaiCallbackUrl}?code=${code}&state=${successState}`);       
//         // res.redirect(`${openaiCallbackUrl}?code=${code}&state=${successState}`);
//     } else {
//         console.log('Authentication failed, redirecting to error.');
//         res.redirect(`${openaiCallbackUrl}?error=authorization_failed&state=failure`); // Set state to 'failure' on error
//     }
// });

// router.post('/github/token', async (req, res) => {
//         const { code } = req.body;
//         const response = await fetch('https://github.com/login/oauth/access_token', {
//                 method: 'POST',
//                 headers: {
//                         'Accept': 'application/json',
//                         'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({
//                         client_id: process.env.GITHUB_CLIENT_ID,
//                         client_secret: process.env.GITHUB_CLIENT_SECRET,
//                         code,
//                         redirect_uri: "https://gcb-ts.onrender.com/api/auth/github/callback",
//                 }),
//         });
//         const data = await response.json();
//         if (data.access_token) {
//                 console.log('Exchanged token successfully:', data.access_token);
//                 // get access token from the session 
//                 const accessToken = getCustomSessionProperty<string>(req.session, 'accessToken');
//                 const user = await  User.findOne    ({ accessToken: accessToken }); // Find the user by their access token
//                 if (!user) {
//                     console.log('User not found');
//                     res.status(400).json({ error: 'User not found.' });
//                     return;
//                 }
//                 // Update the user's access token
//                 user.accessToken = data.access_token;
//                 await user.save();
//                 console.log('User access token updated:', user);
//                 res.json({ access_token: data.access_token });
//         } else {
//                 console.log('Failed to exchange token');
//                 res.status(400).json({ error: 'Failed to exchange token.' });
//         }
// });

// This endpoint handles the exchange of the authorization code for an access token
// In /github/token endpoint
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

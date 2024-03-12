// routes/authRoutes.ts
import express from 'express';
import passport from 'passport';
import { Strategy as GitHubStrategy, Profile } from 'passport-github2';
import fetch from 'node-fetch';
import User, { IUser } from '../models/User';
// import User from '../models/User'; // Make sure this imports correctly

const router = express.Router();

// This is a custom type that extends the GitHub profile with the _json property
interface ExtendedGitHubProfile extends Profile {
  _json: {
    login: string;
    html_url: string;
    avatar_url: string;
  };
}

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID as string,
    clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    callbackURL: "https://gcb-ts.onrender.com/api/auth/github/callback"
}, async (accessToken: string, refreshToken: string, profile: ExtendedGitHubProfile, done: (error: any, user?: any | false) => void) => {
    try {
        // Attempt to find the user by their GitHub ID
        let user = await User.findOne({ githubId: profile.id });
        if (!user) {
            // If no user is found, create a new user
            user = new User({
                githubId: profile.id,
                accessToken,
                displayName: profile.displayName || profile._json.login,
                username: profile._json.login,
                profileUrl: profile._json.html_url,
                avatarUrl: profile._json.avatar_url,
            });
        } else {
            // If the user exists, update their access token
            user.accessToken = accessToken;
        }
        const savedUser = await user.save();
        done(null, savedUser); // Successfully return the saved/updated user
    } catch (error) {
        console.error('Error during user saving/updating:', error);
        done(error);
    }
}));

pa

// passport.serializeUser((user: IUser, done) => { 
//     done(null, user.id); // This should no longer throw an error
//   });

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id); // This correctly infers IUser
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

router.get('/github', (req, res) => {
  const { state } = req.query;
  const authorizationURL = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent("https://gcb-ts.onrender.com/api/auth/github/callback")}&scope=repo user:email&state=${state}`;
  res.redirect(authorizationURL);
});

router.get('/github/callback', (req, res) => {
    const { code, state } = req.query;
    const openaiCallbackUrl = process.env.OPENAI_CALLBACK_URL;

    if (code) {
        res.redirect(`${openaiCallbackUrl}?code=${code}&state=${state}`);
    } else {
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
        res.json({ access_token: data.access_token });
    } else {
        res.status(400).json({ error: 'Failed to exchange token.' });
    }
});

export default router;
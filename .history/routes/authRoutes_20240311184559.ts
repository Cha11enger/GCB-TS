// routes/authRoutes.ts
import express from 'express';
import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import fetch from 'node-fetch';
import User from '../models/User';

const router = express.Router();

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID as string,
    clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    callbackURL: "https://gcb-ts.onrender.com/api/auth/github/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ githubId: profile.id });
        if (user) {
            user.accessToken = accessToken;
            await user.save();
            return done(undefined, user);
        } else {
            const newUser = new User({
                githubId: profile.id,
                accessToken,
                displayName: profile.displayName,
                username: profile.username,
                profileUrl: profile.profileUrl,
                avatarUrl: profile._json.avatar_url,
            });
            await newUser.save();
            return done(undefined, newUser);
        }
    } catch (error) {
        done(error, undefined);
    }
}));

// Serialize and deserialize user (if you're using sessions)
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => done(err, user));
});

// Initiating GitHub OAuth, capturing initial state
router.get('/github', (req, res) => {
    const { state } = req.query;
    const authorizationURL = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent("https://gcb-ts.onrender.com/api/auth/github/callback")}&scope=repo user:email&state=${state}`;
    res.redirect(authorizationURL);
});

// GitHub OAuth callback route
router.get('/github/callback', (req, res) => {
    const { code, state } = req.query;
    // Assuming the existence of an OpenAI (Custom GPT) callback URL environment variable
    const openaiCallbackUrl = process.env.OPENAI_CALLBACK_URL;

    if (code) {
        // Redirect to OpenAI callback with code and state on successful authentication
        res.redirect(`${openaiCallbackUrl}?code=${code}&state=${state}`);
    } else {
        // Redirect to OpenAI callback with error state
        res.redirect(`${openaiCallbackUrl}?error=authorization_failed&state=${state}`);
    }
});

// Token exchange route (assuming it's required by your setup, but here's a template)
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
        // Respond with the token or handle accordingly
        res.json({ access_token: data.access_token });
    } else {
        // Handle failure
        res.status(400).json({ error: 'Failed to exchange token.' });
    }
});

// export as authRoutes to be used in index.ts
export default router;

import express from 'express';
import passport from 'passport';
import { Strategy as GitHubStrategy, Profile } from 'passport-github2';
import fetch from 'node-fetch';
import User, { IUser } from '../models/User'; // Ensure IUser is correctly exported from your User model file

const router = express.Router();

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
}, async (accessToken, refreshToken, profile, done) => {
    // Corrected to simply cast profile and not import a non-existent type
    const githubProfile = profile as ExtendedGitHubProfile;
    
    try {
        let user = await User.findOne({ githubId: profile.id });
        if (!user) {
            user = new User({
                githubId: profile.id,
                accessToken,
                displayName: profile.displayName || githubProfile._json.login,
                username: githubProfile._json.login,
                profileUrl: githubProfile._json.html_url,
                avatarUrl: githubProfile._json.avatar_url,
            });
        } else {
            user.accessToken = accessToken;
        }
        const savedUser = await user.save();
        done(null, savedUser); // Continue with the process
    } catch (error) {
        done(error);
    }
}));

passport.serializeUser<any>((user, done) => {
  done(null, user._id); // Use _id here for MongoDB's default ID
});

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

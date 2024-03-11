import express from 'express';
import passport from 'passport';
import { Strategy as GitHubStrategy, Profile } from 'passport-github2';
import fetch from 'node-fetch';
import User, { IUser } from '../models/User'; // Adjust import if necessary to match your file structure

const router = express.Router();

// Define a custom type for the GitHub profile data we expect to use
interface GitHubProfileData {
  login: string;
  html_url: string;
  avatar_url: string;
}


passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID as string,
  clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
  callbackURL: "https://gcb-ts.onrender.com/api/auth/github/callback"
}, async (accessToken: string, refreshToken: string, profile: Profile, done: (error: any, user?: IUser | boolean) => void) => {
  // Attempt to extract the extended data
  const githubData: GitHubProfileData = profile._json as GitHubProfileData;

  try {
    let user = await User.findOne({ githubId: profile.id });
    if (user) {
      user.accessToken = accessToken;
      await user.save();
      done(null, user);
    } else {
      const newUser = new User({
        githubId: profile.id,
        accessToken: accessToken,
        displayName: profile.displayName,
        username: githubData.login, // Use 'login' from GitHub's _json
        profileUrl: githubData.html_url, // Use 'html_url' from GitHub's _json
        avatarUrl: githubData.avatar_url, // Use 'avatar_url' from GitHub's _json
      });
      await newUser.save();
      done(null, newUser);
    }
  } catch (error) {
    console.error('Error during GitHub auth:', error);
    done(error);
  }
}));

passport.serializeUser((user: IUser, done: (error: any, id?: unknown) => void) => {
  done(null, user.id);
});

passport.deserializeUser((id: unknown, done: (error: any, user?: IUser | boolean) => void) => {
  User.findById(id, (err: any, user: IUser | null) => {
    done(err, user);
  });
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

// routes/authRoutes.ts
import express, { Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import fetch from 'node-fetch';
import User, { IUser } from '../models/User'; // Ensure IUser is correctly exported from your User model file.

const router = express.Router();
interface GitHubProfile {
  id: string;
  displayName: string;
  username: string; // This might be part of the nested _json object, depending on GitHub's response.
  _json: {
    avatar_url: string;
    login: string; // GitHub username is usually under login within _json.
    html_url: string; // This could serve as the profile URL.
  };
}

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID as string,
  clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
  callbackURL: "https://gcb-ts.onrender.com/api/auth/github/callback"
}, async (accessToken: string, refreshToken: string, profile: GitHubProfile, done: (error: any, user?: any) => void) => {
  try {
    const user: IUser | null = await User.findOne({ githubId: profile.id });
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

passport.serializeUser((user: any, done: (error: any, userId?: string) => void) => {
  done(null, user._id.toString()); // Using _id.toString() to ensure a string is passed.
});

passport.deserializeUser((id: string, done: (error: any, user?: IUser | null) => void) => {
  User.findById(id, (err: any, user: IUser | null) => done(err, user));
});

router.get('/github', (req: Request, res: Response) => {
  const { state } = req.query;
  const authorizationURL = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent("https://gcb-ts.onrender.com/api/auth/github/callback")}&scope=repo user:email&state=${state}`;
  res.redirect(authorizationURL);
});

router.get('/github/callback', (req: Request, res: Response) => {
  const { code, state } = req.query;
  const openaiCallbackUrl = process.env.OPENAI_CALLBACK_URL;

  if (code) {
    res.redirect(`${openaiCallbackUrl}?code=${code}&state=${state}`);
  } else {
    res.redirect(`${openaiCallbackUrl}?error=authorization_failed&state=${state}`);
  }
});

router.post('/github/token', async (req: Request, res: Response) => {
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
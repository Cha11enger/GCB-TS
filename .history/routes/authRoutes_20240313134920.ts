// routes/authRoutes.ts
import express from 'express';
import passport from 'passport';
import { Strategy as GitHubStrategy, Profile } from 'passport-github2';
import fetch from 'node-fetch';
import User, { IUser } from '../models/User'; // Ensure IUser is correctly exported

const router = express.Router();

// Extend the Profile interface to include the properties used in the GitHub strategy callback
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
}, async (accessToken: string, refreshToken: string, profile: Profile, cb: (error: any, user?: any) => void) => {
    // Cast profile to ExtendedGitHubProfile to access the _json property
    const githubProfile = profile as ExtendedGitHubProfile;
    
    try {
        let user = await User.findOne({ githubId: profile.id });

        //working proper upto 
//         if (user) {
//             user.accessToken = accessToken;
//             await user.save();
//             cb(null, user);
//         } else {
//             const newUser = new User({
//                 githubId: profile.id,
//                 accessToken,
//                 displayName: profile.displayName,
//                 username: githubProfile._json.login,
//                 profileUrl: githubProfile._json.html_url,
//                 avatarUrl: githubProfile._json.avatar_url,
//             });
//             await newUser.save();
//             cb(null, newUser);
//         }
//     } catch (error) {
//         cb(error);
//     }
// }));

passport.serializeUser((user: any, cb: (err: any, id?: any) => void) => {
  cb(null, user.id);
});

passport.deserializeUser((id: string, cb: (err: any, user?: any) => void) => {
  User.findById(id, (err: any, user: IUser | null) => cb(err, user));
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
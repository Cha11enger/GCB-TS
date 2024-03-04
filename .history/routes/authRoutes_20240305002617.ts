// routes\authRoutes.ts
import { Request, Response } from 'express';
import passport from 'passport';

// const router = express.Router();

const getGithubAuthUrl = () => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  return `https://github.com/login/oauth/authorize?client_id=${clientId}`;
};

// Initiates GitHub authentication process
const github = async (req: Request, res: Response) => {
  passport.authenticate('github', {
    // Ensure this callbackURL matches exactly the one registered in your GitHub app settings
    // Including it here for demonstration; usually, it's set in the strategy configuration.
    callbackURL: process.env.GITHUB_CALLBACK_URL as string
  } as passport.AuthenticateOptions)(req, res);
};


// GitHub callback route
const githubCallback = async (req: Request, res: Response) => {
  passport.authenticate('github', {
    // once authenticated send req.session.isAuthenticated = true;
    successRedirect: '/',
    failureRedirect: '/auth/github'
  } as passport.AuthenticateOptions)(req, res);
}

// GitHub callback route
const authRoutes = {
  github,
  githubCallback
};

export default authRoutes;

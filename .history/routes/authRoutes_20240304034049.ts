//
import { Request, Response } from 'express';
import passport from 'passport';

// const router = express.Router();

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
    failureRedirect: '/', // Redirect to home on failure
    callbackURL: process.env.GITHUB_CALLBACK_URL as string // Ensuring consistency in callback URL
  } as passport.AuthenticateOptions)(req, res);
};

// GitHub callback route
const authRoutes = {
  github,
  githubCallback
};

export default authRoutes;

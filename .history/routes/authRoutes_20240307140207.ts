// routes\authRoutes.ts
import { Request, Response } from 'express';
import passport from 'passport';
// import IUser from '../models/User';
import User, { IUser } from '../models/User';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { setCustomSessionProperty, getCustomSessionProperty } from '../utils/sessionUtils';
import { Express } from 'express';

// const router = express.Router();

const getGithubAuthUrl = () => {
  // Direct users to your endpoint that handles GitHub OAuth
  return 'https://gcb-ts.onrender.com/api/auth/github';
  // return 'https://gcb-ts.onrender.com/api/auth/github/callback'
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
  passport.authenticate('github', { failureRedirect: '/login' }, async (err: any, user: IUser) => { 
    


    // GitHub callback route
    const authRoutes = {
      github,
      githubCallback,
      getGithubAuthUrl,
    };

export default authRoutes;

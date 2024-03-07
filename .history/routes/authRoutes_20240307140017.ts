// routes\authRoutes.ts
import { Request, Response } from 'express';
import passport from 'passport';
// import IUser from '../models/User';
import User, { IUser } from '../models/User';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { setCustomSessionProperty, getCustomSessionProperty } from '../utils/sessionUtils';

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

// GitHub callback route after authentication is successful send response to the client with the user details and token and save the user details in the database and session
const githubCallback = async (req: Request, res: Response) => {
  passport.authenticate('github', { failureRedirect: '/' }, async (err, user: IUser) => {
    if (err) {
      return res.status(401).json({ error: err });
    }
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    // Save user details in the session
    setCustomSessionProperty(req, 'user', user);
    // Save user details in the database
    const existingUser = await  User.findOne({ githubId: user.githubId });  
    if (!existingUser) {
      await User.create(user);
    } else {  
      await User.updateOne({ githubId: user.githubId }, user);
    }   
    // Redirect the user to the client app
    res.redirect('http://localhost:3000');
    

    // GitHub callback route
    const authRoutes = {
      github,
      githubCallback,
      getGithubAuthUrl,
    };

export default authRoutes;

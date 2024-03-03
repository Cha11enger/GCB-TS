import express from 'express';
import passport from 'passport';

const router = express.Router();

// Initiates GitHub authentication process
router.get('/github', passport.authenticate('github', {
  // Ensure this callbackURL matches exactly the one registered in your GitHub app settings
  // Including it here for demonstration; usually, it's set in the strategy configuration.
  callbackURL: process.env.GITHUB_CALLBACK_URL as string
} as passport.AuthenticateOptions));

// GitHub callback route
router.get('/github/callback', 
  passport.authenticate('github', {
    failureRedirect: '/', // Redirect to home on failure
    callbackURL: process.env.GITHUB_CALLBACK_URL as string // Ensuring consistency in callback URL
  } as passport.AuthenticateOptions), (req, res) => {
    // Successful authentication, redirect home or to another page
    res.redirect('/'); // Adjust the redirection URL as needed
  }
);

export default router;

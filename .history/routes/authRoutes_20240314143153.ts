import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import User from '../models/User';

dotenv.config();

const router = express.Router();

// Function to generate GitHub OAuth URL
function generateGitHubOAuthUrl(state: string) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = encodeURIComponent(`${process.env.SERVER_URL}/api/auth/github/callback`);
  const scope = encodeURIComponent("read:user,user:email");
  console.log('Inside generateGitHubOAuthUrl function');
  return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
}

// Redirect to GitHub OAuth page
router.get('/github', (req, res) => {
  const state = req.query.state || 'no_state_provided';
  const authorizationURL = generateGitHubOAuthUrl(state.toString());
  console.log('Inside /github route');
  res.redirect(authorizationURL);
});

// GitHub OAuth callbac



export default router;

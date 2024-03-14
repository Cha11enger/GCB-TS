import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import User from '../models/User';

// routes/authRoutes.ts

dotenv.config();

const router = express.Router();

// Function to generate GitHub OAuth URL
function generateGitHubOAuthUrl(state: string) {
  console.log('Inside generateGitHubOAuthUrl function');
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = encodeURIComponent(`${process.env.SERVER_URL}/api/auth/github/callback`);
  const scope = encodeURIComponent("read:user,user:email");
  console.log('After generating OAuth URL');
  return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
}

// Redirect to GitHub OAuth page
router.get('/github', (req, res) => {
  console.log('Inside /github route');
  const state = req.query.state || 'no_state_provided';
  const authorizationURL = generateGitHubOAuthUrl(state.toString());
  console.log('After generating authorization URL');
  res.redirect(authorizationURL);
});

// GitHub OAuth callback
router.get('/github/callback', async (req, res) => {
  console.log('Inside /github/callback route');
  const { code, state } = req.query;
  const openaiCallbackUrl = process.env.OPENAI_CALLBACK_URL;

  if (!code) {
    console.log('Authorization failed');
    return res.redirect(`${openaiCallbackUrl}?error=authorization_failed&state=${state}`);
  }

  try {
    console.log('Exchanging code for access token');
    // Exchange the code for an access token
    const accessTokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.SERVER_URL}/api/auth/github/callback`,
      }),
    });
    const accessTokenData = await accessTokenResponse.json();

    if (!accessTokenData.access_token) {
      console.log('Failed to exchange token');
      return res.redirect(`${openaiCallbackUrl}?error=failed_to_exchange_token&state=${state}`);
    }

    console.log('Fetching GitHub user data');
    // Fetch GitHub user data
    const userDataResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessTokenData.access_token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    const userData = await userDataResponse.json();
    if (!userDataResponse.ok) {
      throw new Error('Failed to fetch GitHub user data.');
    }

    console.log('Saving or updating user in the database');
    // Save or update user in the database
    let user = await User.findOne({ githubId: userData.id }).exec();
    if (!user) {
      user = new User({
        githubId: userData.id,
        accessToken: accessTokenData.access_token,
        displayName: userData.name || '',
        username: userData.login,
        profileUrl: userData.html_url,
        avatarUrl: userData.avatar_url,
        state: state?.toString() || '', // Fix: Add nullish coalescing operator to provide a default value
        code: code.toString(),
      });
    } else {
      user.accessToken = accessTokenData.access_token; // Update the access token
      user.state = state?.toString();
      user.code = code.toString();
    }
    await user.save();

    console.log('Redirecting to OpenAI callback URL');
    // Redirect with the code, state, and access token to the OpenAI callback URL
    res.redirect(`${openaiCallbackUrl}?code=${code}&state=${state}&accessToken=${accessTokenData.access_token}`);
  } catch (error) {
    console.error('Error during GitHub OAuth callback:', error);
    res.redirect(`${openaiCallbackUrl}?error=internal_error&state=${state}`);
  }
});


export default router;

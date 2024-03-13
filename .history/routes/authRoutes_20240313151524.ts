// routes/authRoutes.ts
import express from 'express';
import fetch from 'node-fetch';
import User, { IUser } from '../models/User'; // Ensure IUser is correctly exported
import { setCustomSessionProperty, getCustomSessionProperty } from '../utils/sessionUtils';

const router = express.Router();

// Function to generate GitHub OAuth URL
function generateGitHubOAuthUrl(state: string) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = encodeURIComponent("https://gcb-ts.onrender.com/api/auth/github/callback");
  const scope = encodeURIComponent("repo user:email");
  return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
}

// Redirect to GitHub OAuth page
router.get('/github', (req, res) => {
  const state = req.query.state || 'no_state_provided'; // Generate or pass a unique state parameter for security
  const authorizationURL = generateGitHubOAuthUrl(state.toString());
  res.redirect(authorizationURL);
});

// GitHub OAuth callback
router.get('/github/callback', async (req, res) => {
  const { code, state } = req.query;
  const openaiCallbackUrl = process.env.OPENAI_CALLBACK_URL;

  if (!code) {
    console.error('GitHub callback did not provide a code.');
    return res.redirect(`${openaiCallbackUrl}?error=missing_code&state=${state}`);
  }

  try {
    // Exchange code for an access token
    const accessToken = await exchangeCodeForToken(code.toString());
    // Use accessToken to fetch user data from GitHub and create/update user in DB
    const userData = await fetchGitHubUserData(accessToken);
    let user = await User.findOne({ githubId: userData.id });
    if (!user) {
      user = new User({
        githubId: userData.id,
        accessToken,
        displayName: userData.name,
        username: userData.login,
        profileUrl: userData.html_url,
        avatarUrl: userData.avatar_url,
      });
    } else {
      user.accessToken = accessToken; // Update access token
    }
    await user.save();

    // Optionally set custom session properties or perform other actions before redirecting
    setCustomSessionProperty(req.session, 'githubId', user.githubId);
    setCustomSessionProperty(req.session, 'accessToken', user.accessToken);

    // Redirect to your OpenAI callback or another route as needed
    res.redirect(`${openaiCallbackUrl}?code=${code}&state=${state}`);
  } catch (error) {
    console.error('Error during GitHub OAuth callback:', error);
    res.redirect(`${openaiCallbackUrl}?error=authorization_failed&state=${state}`);
  }
});


// Function to exchange code for an access token
async function exchangeCodeForToken(code) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: "https://gcb-ts.onrender.com/api/auth/github/callback",
    }),
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error_description || 'Failed to exchange code for token.');
  }
  return data.access_token;
}

// Function to fetch user data from GitHub using access token
async function fetchGitHubUserData(accessToken) {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `token ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch GitHub user data.');
  }
  return await response.json();
}

export default router;

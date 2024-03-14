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

router.get('/github/callback', (req, res) => {
    const { code, state } = req.query;
    const openaiCallbackUrl = process.env.OPENAI_CALLBACK_URL;

    if(!code) {
      res.redirect(`${openaiCallbackUrl}?error=authorization_failed&state=${state}`);
    } 

    //

    if (code) {
        res.redirect(`${openaiCallbackUrl}?code=${code}&state=${state}`);
    } else {
        res.redirect(`${openaiCallbackUrl}?error=authorization_failed&state=${state}`);
    }
});

// Function to fetch user data from GitHub using access token
async function fetchGitHubUserData(accessToken: string): Promise<any> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch GitHub user data.');
  }
  console.log('Inside fetchGitHubUserData function');
  return await response.json();
}

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
          redirect_uri: `${process.env.SERVER_URL}/api/auth/github/callback`,
      }),
  });
  const data = await response.json();
  if (data.access_token) {
      // Respond immediately with the access token
      res.json({ access_token: data.access_token });

      // Asynchronously handle the user saving to DB
      saveUser(data.access_token).catch(console.error);
  } else {
      res.status(400).json({ error: 'Failed to exchange token.' });
  }
});

async function saveUser(accessToken: string): Promise<void> {
  const userData: any = await fetchGitHubUserData(accessToken);
  console.log('After fetching GitHub user data');

  let user: any = await User.findOne({ githubId: userData.id });
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
      user.accessToken = accessToken; // Update the access token
  }

  await user.save();
  console.log('User saved');
}

export default router;

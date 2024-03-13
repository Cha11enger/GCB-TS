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
    return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
}

// Redirect to GitHub OAuth page
router.get('/github', (req, res) => {
    const state = req.query.state || 'no_state_provided';
    const authorizationURL = generateGitHubOAuthUrl(state.toString());
    res.redirect(authorizationURL);
});

// GitHub OAuth callback
// router.get('/github/callback', async (req, res) => {
//     const { code, state } = req.query;
//     const openaiCallbackUrl = process.env.OPENAI_CALLBACK_URL;

//     if (!code) {
//         console.error('GitHub callback did not provide a code.');
//         return res.redirect(`${openaiCallbackUrl}?error=missing_code&state=${state}`);
//     }

//     // Here, we directly redirect to the OpenAI callback URL with the code and state
//     // This is assuming your frontend or another process will handle the code exchange
//     res.redirect(`${openaiCallbackUrl}?code=${code}&state=${state}`);
// });

router.get('/github/callback', async (req, res) => {
  const { code, state } = req.query;
  const openaiCallbackUrl = process.env.OPENAI_CALLBACK_URL;

  if (!code) {
      console.error('GitHub callback did not provide a code.');
      return res.redirect(`${openaiCallbackUrl}?error=missing_code&state=${state}`);
  }

  try {
      const accessToken = await exchangeCodeForToken(code.toString());
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
          user.accessToken = accessToken; // Update the access token
      }

      await user.save();

      // Set session or other indicators as needed
      // e.g., req.session.user = user;
      req.session.user = user;

      // Redirect with success state or token as needed
      res.redirect(`${openaiCallbackUrl}?success=true&state=${state}&userId=${user._id}`);
  } catch (error) {
      console.error('Error during GitHub OAuth process:', error);
      res.redirect(`${openaiCallbackUrl}?error=authorization_failed&state=${state}`);
  }
});


// Function to exchange code for an access token
async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri = `${process.env.SERVER_URL}/api/auth/github/callback`;

  const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri,
      }),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
      throw new Error(data.error_description || 'Failed to exchange code for token.');
  }
  return data.access_token;
}

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
  return await response.json();
}

// Endpoint to exchange GitHub code for access token and fetch user data
router.post('/github/token', async (req, res) => {
  const { code } = req.body;
  if (!code) {
      return res.status(400).json({ error: 'Code is required' });
  }

  try {
      const accessToken = await exchangeCodeForToken(code);
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
          user.accessToken = accessToken; // Update the access token
      }

      await user.save();
      res.json({ message: 'User authenticated and saved', user });
  } catch (error) {
      console.error('Error during token exchange or user data fetch:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;

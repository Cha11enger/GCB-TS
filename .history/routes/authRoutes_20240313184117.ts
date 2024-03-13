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

    if (code) {
        res.redirect(`${openaiCallbackUrl}?code=${code}&state=${state}`);
    } else {
        res.redirect(`${openaiCallbackUrl}?error=authorization_failed&state=${state}`);
    }
});

// router.get('/github/callback', async (req, res) => {
//   const { code, state } = req.query;
//   const openaiCallbackUrl = process.env.OPENAI_CALLBACK_URL;
//   console.log('Inside /github/callback route');

//   if (!code) {
//     console.error('GitHub callback did not provide a code.');
//     return res.redirect(`${openaiCallbackUrl}?error=missing_code&state=${state}`);
//   }

//   try {
//     // const accessToken = await exchangeCodeForToken(code.toString());
//     // const userData = await fetchGitHubUserData(accessToken);
//     // console.log('After fetching GitHub user data');

//     // let user = await User.findOne({ githubId: userData.id });
//     // if (!user) {
//     //   user = new User({
//     //     githubId: userData.id,
//     //     accessToken,
//     //     displayName: userData.name,
//     //     username: userData.login,
//     //     profileUrl: userData.html_url,
//     //     avatarUrl: userData.avatar_url,
//     //   });
//     // } else {
//     //   user.accessToken = accessToken; // Update the access token
//     // }

//     // await user.save();
//     // console.log('User saved');

//     // Set session or other indicators as needed
//     // e.g., req.session.user = user;
//     // (req.session as any).user = user;

//     // Redirect with proper code and state
//     res.redirect(`${openaiCallbackUrl}?code=${code}&state=${state}`);
//   } catch (error) {
//     console.error('Error during GitHub OAuth process:', error);
//     res.redirect(`${openaiCallbackUrl}?error=authorization_failed&state=${state}`);
//   }
// });

// Function to exchange code for an access token
// async function exchangeCodeForToken(code: string): Promise<string> {
//   const clientId = process.env.GITHUB_CLIENT_ID;
//   const clientSecret = process.env.GITHUB_CLIENT_SECRET;
//   const redirectUri = `${process.env.SERVER_URL}/api/auth/github/callback`;
//   console.log('Inside exchangeCodeForToken function');

//   const response = await fetch('https://github.com/login/oauth/access_token', {
//     method: 'POST',
//     headers: {
//       'Accept': 'application/json',
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       client_id: clientId,
//       client_secret: clientSecret,
//       code: code,
//       redirect_uri: redirectUri,
//     }),
//   });

//   const data = await response.json();
//   if (!response.ok || data.error) {
//     throw new Error(data.error_description || 'Failed to exchange code for token.');
//   }

//   // Additional safety check for the response Content-Type
//   const contentType = response.headers.get('content-type');
//   if (!contentType || !contentType.includes('application/json')) {
//     throw new TypeError("Oops, we haven't got JSON!");
//   }

//   return data.access_token;
// }

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

// Endpoint to exchange GitHub code for access token and fetch user data
// router.post('/github/token', async (req, res) => {
//   const { code } = req.body;
//   if (!code) {
//     return res.status(400).json({ error: 'Code is required' });
//   }

//   try {
//     const accessToken = await exchangeCodeForToken(code);
//     const userData = await fetchGitHubUserData(accessToken);
//     console.log('After fetching GitHub user data');

//     let user = await User.findOne({ githubId: userData.id });
//     if (!user) {
//       user = new User({
//         githubId: userData.id,
//         accessToken,
//         displayName: userData.name,
//         username: userData.login,
//         profileUrl: userData.html_url,
//         avatarUrl: userData.avatar_url,
//       });
//     } else {
//       user.accessToken = accessToken; // Update the access token
//     }

//     await user.save();
//     console.log('User saved');
//     res.json({ message: 'User authenticated and saved', data.accessToken });
//   } catch (error) {
//     console.error('Error during token exchange or user data fetch:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

router.post('/github/token', async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  try {
    // Exchange the GitHub code for an access token
    const accessToken = await exchangeCodeForToken(code);
    // Fetch user data using the access token
    const userData = await fetchGitHubUserData(accessToken);

    // Look for an existing user in the database
    let user = await User.findOne({ githubId: userData.id });
    if (!user) {
      // Create a new user if not found
      user = new User({
        githubId: userData.id,
        accessToken,
        displayName: userData.name || "",
        username: userData.login,
        profileUrl: userData.html_url,
        avatarUrl: userData.avatar_url,
      });
    } else {
      // Update the access token for the existing user
      user.accessToken = accessToken;
    }

    // Save the user in the database
    await user.save();

    // Respond with a success message and the access token
    res.json({ message: 'User authenticated and saved', accessToken });
  } catch (error) {
    console.error('Error during token exchange or user data fetch:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
  // return accessToken;
   return accessToken
});

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
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error_description || 'Failed to exchange code for token.');
  }

  // Additional safety check for the response Content-Type
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new TypeError("Oops, we haven't got JSON!");
  }

  return data.access_token;
}


export default router;

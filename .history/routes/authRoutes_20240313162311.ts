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
router.get('/github/callback', async (req, res) => {
    const { code, state } = req.query;
    const openaiCallbackUrl = process.env.OPENAI_CALLBACK_URL;

    if (!code) {
        console.error('GitHub callback did not provide a code.');
        return res.redirect(`${openaiCallbackUrl}?error=missing_code&state=${state}`);
    }

    // Here, we directly redirect to the OpenAI callback URL with the code and state
    // This is assuming your frontend or another process will handle the code exchange
    res.redirect(`${openaiCallbackUrl}?code=${code}&state=${state}`);
});

export default router;

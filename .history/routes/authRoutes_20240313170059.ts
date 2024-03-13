import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import User from '../models/User';
dotenv.config();

const router = express.Router();

function generateGitHubOAuthUrl(state: string) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = encodeURIComponent(`${process.env.SERVER_URL}/api/auth/github/callback`);
    const scope = encodeURIComponent("read:user,user:email");
    return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
}

router.get('/github', (req, res) => {
    const state = req.query.state || 'no_state_provided';
    const authorizationURL = generateGitHubOAuthUrl(state.toString());
    res.redirect(authorizationURL);
});

router.get('/github/callback', async (req, res) => {
    const { code, state } = req.query;
    const openaiCallbackUrl = process.env.OPENAI_CALLBACK_URL;

    if (!code) {
        return res.status(400).json({ error: 'GitHub callback did not provide a code.' });
    }

    try {
        const accessToken = await exchangeCodeForToken(code.toString());
        const userData = await fetchGitHubUserData(accessToken);

        let user = await User.findOne({ githubId: userData.id });
        if (!user) {
            user = new User({
                githubId: userData.id,
                accessToken,
                displayName: userData.name || '',
                username: userData.login,
                profileUrl: userData.html_url,
                avatarUrl: userData.avatar_url,
            });
        } else {
            user.accessToken = accessToken;
        }
        await user.save();

        // redirect to openaiCallbackUrl with the user state and code and also this if possible ?success=true&userId=${user._id}`);
        res.redirect(`${openaiCallbackUrl}?state=${state}&code=${user._id}`);

        // Redirect or respond as needed, perhaps to a URL with the user state or a success message
        // res.redirect(`${process.env.CUSTOM_GPT_UI_URL}?success=true&userId=${user._id}`);
    } catch (error) {
        console.error('Error in GitHub OAuth callback:', error);
        res
        // res.redirect(`${process.env.CUSTOM_GPT_UI_URL}?error=authorization_failed`);
    }
});

async function exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code: code,
            redirect_uri: `${process.env.SERVER_URL}/api/auth/github/callback`,
        }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
        throw new Error(data.error_description || 'Failed to exchange code for token.');
    }
    return data.access_token;
}

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

export default router;


// utils/authHelpers.ts

// Function to generate GitHub OAuth URL
export const getGithubAuthUrl = (): string => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = encodeURIComponent(`${process.env.SERVER_URL}/api/auth/github/callback`);
    return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo user:email`;
  };
  
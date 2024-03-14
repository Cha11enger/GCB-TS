// utils/authHelpers.ts

export const getGithubAuthUrl = (accessToken): string => {
    return `${process.env.SERVER_URL}/api/auth/github`;
  };
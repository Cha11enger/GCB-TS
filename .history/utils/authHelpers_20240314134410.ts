// utils/authHelpers.ts

export const getGithubAuthUrl = (ac): string => {
    return `${process.env.SERVER_URL}/api/auth/github`;
  };
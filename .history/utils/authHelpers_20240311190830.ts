// ut
export const getGithubAuthUrl = (): string => {
    return `${process.env.SERVER_URL}/api/auth/github`;
  };
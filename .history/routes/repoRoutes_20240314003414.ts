// rou
import express, { Request, Response } from 'express';
import { Octokit } from '@octokit/rest';
import { analyzeTextWithGPT } from '../config/openai-setup';
import User, { IUser } from '../models/User'; // Make sure the import path matches your project structure
import { getGithubAuthUrl } from '../utils/authHelpers';

interface GitHubApiError extends Error {
  status: number;
}

const router = express.Router();

router.post('/analyze', async (req: Request, res: Response) => {
  const githubUrl = req.body.githubUrl;
  const pathRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = githubUrl.match(pathRegex);

  if (!match) {
    return res.status(400).json({ error: "Invalid GitHub URL" });
  }

  const [, owner, repo] = match;
  let accessToken: string | undefined = process.env.GITHUB_PAT; // Use PAT by default

  try {
    await analyzeRepository(owner, repo, accessToken, res);
  } catch (patError) {
    accessToken = await getUserAccessToken(req); // Attempt to get the user's access token
    if (!accessToken) {
      // Prompt for authentication if no access token is found
      return res.status(403).json({
        error: "Access denied or repository not found. Please authenticate.",
        authUrl: getGithubAuthUrl(),
      });
    }

    try {
      // Retry with the user's access token
      await analyzeRepository(owner, repo, accessToken, res);
    } catch (userTokenError) {
      // Handle errors after retrying with user's access token
      handleErrors(userTokenError, res);
    }
  }
});

async function analyzeRepository(owner: string, repo: string, token: string | undefined, res: Response) {
  if (!token) throw new Error('No access token provided');
  const octokit = new Octokit({ auth: token });
  const repoDetails = await octokit.repos.get({ owner, repo });
  const promptText = `Analyze the GitHub repository "${owner}/${repo}" and provide a summary of its main features, technologies used, and overall purpose.`;
  const analysisResult = await analyzeTextWithGPT(promptText);
  res.json({ analysis: analysisResult, repoDetails: repoDetails.data });
}

async function getUserAccessToken(req: Request): Promise<string | undefined> {
  // Define your logic to retrieve the user's access token from the session or database
  // For example, if stored in session:
  return (req.session as any)?.user?.accessToken;
}

function handleErrors(error: any, res: Response) {
  // Define your error handling logic here
  const status = (error.status === 404 || error.status === 403) ? error.status : 500;
  res.status(status).json({
    error: error.message || "An error occurred while processing your request.",
    authUrl: (status === 403) ? getGithubAuthUrl() : undefined,
  });
}

export default router;

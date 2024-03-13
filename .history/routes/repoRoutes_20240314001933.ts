import express, { Request, Response } from 'express';
import { Octokit } from "@octokit/rest";
import { analyzeTextWithGPT } from '../config/openai-setup';
import User, { IUser} from '../models/User'; // Update the import path as necessary
import { getGithubAuthUrl } from '../utils/authHelpers';

interface GitHubApiError extends Error {
  status: number;
}

const router = express.Router();

router.post('/analyze', async (req: Request, res: Response) => {
  const { githubUrl } = req.body;
  const pathRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = githubUrl.match(pathRegex);

  if (!match) {
    return res.status(400).json({ error: "Invalid GitHub URL" });
  }

  const [, owner, repo] = match;
  let accessToken = process.env.GITHUB_PAT; // Start with the PAT
  
  try {
    // Attempt with PAT first
    await analyzeRepository(owner, repo, accessToken, res);
  } catch (patError) {
    console.error('Error with PAT:', patError);

    // If PAT fails, try with user's accessToken
    try {
      accessToken = await getUserAccessToken(req);
      await analyzeRepository(owner, repo, accessToken, res);
    } catch (userTokenError) {
      console.error('Error with user token:', userTokenError);

      // If user token also fails, prompt for authentication
      res.status(403).json({
        error: "Access denied. Please authenticate.",
        authUrl: getGithubAuthUrl(),
      });
    }
  }
});

// Function to fetch repository details and proceed with analysis
async function analyzeRepository(owner: string, repo: string, accessToken: string, res: Response) {
  const octokit = new Octokit({ auth: accessToken });
  const repoDetails = await octokit.repos.get({ owner, repo });
  const analysisResult = await analyzeTextWithGPT(`Analyze the GitHub repository "${owner}/${repo}" and provide a summary of its main features, technologies used, and overall purpose.`);
  res.json({ analysis: analysisResult, repoDetails: repoDetails.data });
}

// Function to get the user's access token from session or DB
async function getUserAccessToken(req: Request): Promise<string> {
  if (req.session?.user?.accessToken) {
    return req.session.user.accessToken;
  }

  // Assume you have the user's GitHub ID or some other identifier in the session
  const userId = req.session?.user?.githubId;
  if (userId) {
    const user = await User.findOne({ githubId: userId }).exec();
    if (user && user.accessToken) {
      return user.accessToken;
    }
  }

  throw new Error('User access token not found');
}

export default router;

// repoRoutes.ts
import express, { Request, Response } from 'express';
import { Octokit } from "@octokit/rest";
import { analyzeTextWithGPT } from '../config/openai-setup';
import User from '../models/User'; // Adjust the path as necessary
import { getGithubAuthUrl } from '../utils/authHelpers'; // Ensure this utility function is implemented correctly

const router = express.Router();

// Analyze GitHub repository
router.post('/analyze', async (req: Request, res: Response) => {
  const { githubUrl } = req.body;
  // Extract owner and repo name from the GitHub URL
  const pathRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = githubUrl.match(pathRegex);

  if (!match) {
    return res.status(400).json({ error: "Invalid GitHub URL" });
  }

  const [, owner, repo] = match;
  try {
    // Attempt to analyze the repository with the PAT
    await analyzeRepository(owner, repo, process.env.GITHUB_PAT, res);
  } catch (error) {
    // If failed with the PAT, attempt with the user's access token
    const accessToken = await getUserAccessToken(req);
    if (!accessToken) {
      // If no access token is found, prompt the user to authenticate
      return res.status(401).json({
        error: "Please authenticate to access this repository.",
        authUrl: getGithubAuthUrl(),
      });
    }

    try {
      // Retry with the user's access token
      await analyzeRepository(owner, repo, accessToken, res);
    } catch (error) {
      // If still failing, report the specific error
      handleRepositoryError(error, res);
    }
  }
});

// Attempt to fetch and analyze the repository
async function analyzeRepository(owner: string, repo: string, token: string, res: Response) {
  const octokit = new Octokit({ auth: token });
  try {
    const repoDetails = await octokit.repos.get({ owner, repo });
    const analysisResult = await analyzeTextWithGPT(`Analyze the GitHub repository "${owner}/${repo}" and provide a summary.`);
    res.json({ analysis: analysisResult, repoDetails: repoDetails.data });
  } catch (error) {
    throw error;
  }
}

// Retrieve the user's access token from session or database
async function getUserAccessToken(req: Request): Promise<string | null> {
  // Example: Retrieve from session
  // Note: Implement the logic to retrieve the access token as per your application's session management or database schema
  return req.session?.user?.accessToken || null;
}

// Handle errors related to repository access
function handleRepositoryError(error: any, res: Response) {
  if (error.status === 404) {
    res.status(404).json({ error: "Repository not found." });
  } else if (error.status === 403) {
    res.status(403).json({
      error: "Access denied. Authentication required.",
      authUrl: getGithubAuthUrl(),
    });
  } else {
    res.status(500).json({ error: "An unexpected error occurred." });
  }
}

export default router;

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
    // Ensure that the GITHUB_PAT environment variable is defined
    const githubPat = process.env.GITHUB_PAT || '';
    // Attempt to analyze the repository with the PAT
    await analyzeRepository(owner, repo, githubPat, res);
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

// Attempt to retrieve the user's access token from the session or database
async function getUserAccessToken(req: Request): Promise<string | null> {
  // First, try to get the accessToken from the session
  let accessToken = (req.session as any)?.user?.accessToken || null;

  if (!accessToken) {
    // If there's no accessToken in the session, try to retrieve it from the database
    // Assuming you have a way to identify the user (e.g., GitHub ID or username) in your session or request
    const userIdentification = (req.session as any)?.user?.githubId || req.query.userId; // Example identifiers
    
    if (userIdentification) {
      const user = await User.findOne({ githubId: userIdentification }).exec(); // Adjust query as needed

      if (user && user.accessToken) {
        accessToken = user.accessToken;
      }
    }
  }

  return accessToken;
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

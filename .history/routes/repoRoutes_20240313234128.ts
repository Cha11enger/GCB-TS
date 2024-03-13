import express, { Request, Response } from 'express';
import { Octokit } from "@octokit/rest";
import { analyzeTextWithGPT } from '../config/openai-setup';
import User, { I} from '../models/User'; // Make sure the import path matches your project structure
import { getGithubAuthUrl } from '../utils/authHelpers';

// Define the interface for error handling
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
  const accessToken = (req.session?.user as { accessToken?: string } | undefined)?.accessToken || process.env.GITHUB_PAT;

  try {
    const repoDetails = await fetchRepositoryDetails(owner, repo, accessToken);
    await proceedWithAnalysis(owner, repo, accessToken, repoDetails, res);
  } catch (error) {
    handleErrors(error, res);
  }
});

async function fetchRepositoryDetails(owner: string, repo: string, token: string) {
  const octokit = new Octokit({ auth: token });
  return await octokit.repos.get({ owner, repo });
}

async function proceedWithAnalysis(owner: string, repo: string, accessToken: string, repoDetails: any, res: Response) {
  const promptText = `Analyze the GitHub repository "${owner}/${repo}" and provide a summary of its main features, technologies used, and overall purpose.`;
  const analysisResult = await analyzeTextWithGPT(promptText);
  res.json({ analysis: analysisResult, repoDetails: repoDetails.data });
}

function handleErrors(error: any, res: Response) {
  if (error.status === 404) {
    res.status(404).json({ error: "Repository not found. Please check the URL and try again." });
  } else if (error.status === 403) {
    res.status(403).json({
      error: "Access denied. You might need to authenticate or have insufficient permissions.",
      authUrl: getGithubAuthUrl()
    });
  } else {
    console.error('Error accessing GitHub API:', error);
    res.status(500).json({ error: "Internal Server Error. Please try again later." });
  }
}

export default router;

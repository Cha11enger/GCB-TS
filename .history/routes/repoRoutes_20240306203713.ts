// repoRoutes.ts
import { Octokit } from "@octokit/rest";
import User from '../models/User'; // Make sure this import matches your actual User model file path
import { analyzeTextWithGPT } from '../config/openai-setup'; // Adjust this import as necessary
import { Request, Response } from 'express';
import authRoutes from './authRoutes'; // Ensure this is correctly imported

const analyzeGithubUrl = async (req: Request, res: Response) => {
  const { githubUrl } = req.body;
  const pathRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = githubUrl.match(pathRegex);

  if (!match) {
    return res.status(400).json({ error: "Invalid GitHub URL" });
  }

  const [, owner, repo] = match;
  
  const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
  

  try {
    const repoDetails = await octokit.repos.get({ owner, repo });
    // If the repository is public, proceed with the analysis.
    if (!repoDetails.data.private) {
      const promptText = `Analyze the GitHub repository "${owner}/${repo}" and provide a summary of its main features, technologies used, and overall purpose.`;
      const analysisResult = await analyzeTextWithGPT(promptText);
      return res.json({ analysis: analysisResult, repoDetails: repoDetails.data });
    }
    // If the repository is private, handle the authentication.
    throw new Error('Private repository requires authentication.');
  } catch (error) {
    // Handle 404/403 errors or private repository indication by prompting for authentication.
    // check user in db by owner name in url and username from db if not found then return to auth
    const user = await User.findOne({ username: owner });
    
    return res.status(401).json({
      error: "Authentication required to access this repository. Please authenticate via GitHub.",
      authUrl: authRoutes.getGithubAuthUrl(),
    });
  }
};

export const repoRoutes = {
  analyzeGithubUrl,
};

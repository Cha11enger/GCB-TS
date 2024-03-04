// repoRoutes.ts
import { Octokit } from "@octokit/rest";
import User from '../models/User'; // Adjust this import based on your actual User model file path
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
    const promptText = `Analyze the GitHub repository "${owner}/${repo}" and provide a summary of its main features, technologies used, and overall purpose.`;
    const analysisResult = await analyzeTextWithGPT(promptText);
    res.json({ analysis: analysisResult, repoDetails: repoDetails.data });
  } catch (error) {
    if ((error as any).status === 404 || (error as any).status === 403) {
      const user = await User.findOne({ username: owner }).exec();
      if (!user) {
        return res.status(401).json({
          error: "Authentication required. Please authenticate via GitHub.",
          authUrl: authRoutes.getGithubAuthUrl(), // Correctly call the function to get the URL string
        });
      } else {
        const userOctokit = new Octokit({ auth: user.accessToken });
        try {
          const repoDetails = await userOctokit.repos.get({ owner, repo });
          const promptText = `Analyze the GitHub repository "${owner}/${repo}" using the user's access token and provide a summary.`;
          const analysisResult = await analyzeTextWithGPT(promptText);
          res.json({ analysis: analysisResult, repoDetails: repoDetails.data });
        } catch (error) {
          // Revised error handling logic
          // Directly prompt for authentication if encountering a 404 or 403 error
          if ((error as any).status === 404 || (error as any).status === 403) {
            return res.status(401).json({
              error: "Authentication required to access this repository. Please authenticate via GitHub.",
              authUrl: authRoutes.getGithubAuthUrl(), // Ensure this method returns the direct URL for authentication
            });
          } else {
            res.status(500).json({ error: "An unexpected error occurred." });
          }
        }
      };
      

export const repoRoutes = {
  analyzeGithubUrl,
};

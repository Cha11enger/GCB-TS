// repoRoutes.ts
import { Octokit } from "@octokit/rest";
import User from '../models/User'; // Make sure this import matches your actual User model file path
import { analyzeTextWithGPT } from '../config/openai-setup'; // Adjust this import as necessary
import { Request, Response } from 'express';
import authRoutes from './authRoutes'; // Ensure this is correctly imported

// const analyzeGithubUrl = async (req: Request, res: Response) => {
//   const { githubUrl } = req.body;
//   const pathRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
//   const match = (githubUrl as string).match(pathRegex);

//   if (!match) {
//     return res.status(400).json({ error: "Invalid GitHub URL" });
//   }

//   const [, owner, repo] = match;
//   let accessToken = process.env.GITHUB_PAT; // Default token

//   // Attempt to use a user-specific accessToken if available
//   const user = await User.findOne({ username: owner });
//   if (user && user.accessToken) {
//     accessToken = user.accessToken;
//   }

//   const octokit = new Octokit({ auth: accessToken });

//   try {
//     const repoDetails = await octokit.repos.get({ owner, repo });
//     const promptText = `Analyze the GitHub repository "${owner}/${repo}" and provide a summary of its main features, technologies used, and overall purpose.`;
//     const analysisResult = await analyzeTextWithGPT(promptText);
//     return res.json({ analysis: analysisResult, repoDetails: repoDetails.data });
//   } catch (error) {
//     // More specific error handling can be added here
//     return res.status(401).json({
//       error: "Authentication required to access this repository. Please authenticate via GitHub.",
//       authUrl: authRoutes.getGithubAuthUrl(),
//     });
//   }
// };



export const repoRoutes = {
  analyzeGithubUrl,
};

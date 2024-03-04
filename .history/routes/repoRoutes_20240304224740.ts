// routes\repoRoutes.ts
import { Octokit } from "@octokit/rest";
import User from '../models/User'; // Adjust this import based on your actual User model file path
import { analyzeTextWithGPT } from '../config/openai-setup'; // Adjust this import as necessary
import { Request, Response } from 'express';
import authRoutes from './authRoutes';

// const analyzeGithubUrl = async (req: Request, res: Response) => {
//   const { githubUrl, userId } = req.body;

//   const pathRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
//   const match = githubUrl.match(pathRegex);
//   if (!match) {
//     return res.status(400).json({ error: "Invalid GitHub URL" });
//   }
//   const [, owner, repo] = match;

//   const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
//   //  check if repo is private or public using octokit
  
//     const repoDetails = await octokit.repos.get({ owner, repo });
//     const visibility = repoDetails.data.private ? 'private' : 'public';
    
//     // if repo is not equal to public check the owner's access token in db and use it to authenticate and analyze the repo and if owner's access token is not found redirect to github auth
//     // if visibility not equal to public or repo not found 
//       if (visibility !== 'public' || !repoDetails.data) {
//         // dont go to the 500 error, check for the user in the db and if not found redirect to github auth ask user to authenticate
//         const user = await  User.findOne  ({ username: owner }).exec();
//         if (!user) {
//           return res.redirect('/auth/github');
//         } else {
//           const octokit = new Octokit({ auth: user.accessToken });
//           const repoDetails = await octokit.repos.get({ owner, repo });
//           if (!repoDetails.data) {
//             return res.status(404).json({ error: "Repository not found or you do not have access to this repository" });
//           } else {
//             const promptText = `Analyze the GitHub repository "${owner}/${repo}" and provide a summary of its main features, technologies used, and overall purpose.`;
//             const analysisResult = await analyzeTextWithGPT(promptText);
//             res.json({ analysis: analysisResult, repoDetails: repoDetails.data });
//           }
//         }
//       }
//       else {
//         const promptText = `Analyze the GitHub repository "${owner}/${repo}" and provide a summary of its main features, technologies used, and overall purpose.`;
//         const analysisResult = await analyzeTextWithGPT(promptText);
//         res.json({ analysis: analysisResult, repoDetails: repoDetails.data });
//       }
// }

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
    // Attempt to retrieve the repository details with the provided token or anonymously
    const repoDetails = await octokit.repos.get({ owner, repo });
    const visibility = repoDetails.data.private ? 'private' : 'public';

    // If the repository is public or successfully retrieved, proceed with analysis
    const promptText = `Analyze the GitHub repository "${owner}/${repo}" and provide a summary of its main features, technologies used, and overall purpose.`;
    // Assuming analyzeTextWithGPT is an asynchronous function that analyzes the text
    const analysisResult = await analyzeTextWithGPT(promptText);
    return res.json({ analysis: analysisResult, repoDetails: repoDetails.data });
  } catch (error) {
    // Handle errors related to repository access
    if ((error as any).status === 404 || (error as any).status === 403) {
      // If the repository is not accessible, attempt to find the user and use their access token
      const user = await User.findOne({ username: owner }).exec();
      if (!user) {
        return res.redirect('/auth/github');
      } else {
        // Retry with the user's access token
        const userOctokit = new Octokit({ auth: user.accessToken });
        try {
          const repoDetails = await userOctokit.repos.get({ owner, repo });
          const promptText = `Analyze the GitHub repository "${owner}/${repo}" using the user's access token and provide a summary.`;
          const analysisResult = await analyzeTextWithGPT(promptText);
          return res.json({ analysis: analysisResult, repoDetails: repoDetails.data });
        } catch (userError) {
          // Handle failure with the user's token
          return res.status(404).json({ error: "Repository not found or you do not have access to this repository" });
        }
      }
    } else {
      // Handle other errors
      return res.status(500).json({ error: "An unexpected error occurred" });
    }
  }
};


const repoRoutes = {
  analyzeGithubUrl,
};

export default repoRoutes;


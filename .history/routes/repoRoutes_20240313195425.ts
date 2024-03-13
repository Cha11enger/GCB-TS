//routes/repoRoutes.ts
import express, { Request, Response } from 'express';
import { Octokit } from "@octokit/rest";
import { analyzeTextWithGPT } from '../config/openai-setup';
import User, {  IUser } from '../models/User';
import { getGithubAuthUrl } from '../utils/authHelpers'; 
// import { getCustomSessionProperty } from '../utils/sessionUtils';


// Define an interface for GitHub API errors, as they typically have a status code.
interface GitHubApiError extends Error {
  status?: number;
}

const router = express.Router(); 

const analyzeGithubUrl = async (req: Request, res: Response) => {
  const { githubUrl } = req.body;
  const pathRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = githubUrl.match(pathRegex);

  if (!match) {
    return res.status(400).json({ error: "Invalid GitHub URL" });
  }

  const [, owner, repo] = match;
  const accessToken = (req.session as { user?: { accessToken: string } }).user?.accessToken || process.env.GITHUB_PAT; // Assuming session.user has been set

  try {
    const octokit = new Octokit({ auth: accessToken });
    const repoDetails = await octokit.repos.get({ owner, repo });
    const promptText = `Analyze the GitHub repository "${owner}/${repo}" and provide a summary of its main features, technologies used, and overall purpose.`;
    const analysisResult = await analyzeTextWithGPT(promptText);
    res.json({ analysis: analysisResult, repoDetails: repoDetails.data });
  } catch (error) {
    const typedError = error as GitHubApiError;
    if (typedError.status === 404 || typedError.status === 403) {
      // Repository not found or access denied
      res.status(typedError.status).json({
        error: "Repository not found or access denied. Please check the repository URL and access permissions.",
        authUrl: typedError.status === 403 ? getGithubAuthUrl() : undefined,
      });
    } else {
      console.error('GitHub API Error:', typedError);
      res.status(500).json({ error: "Error fetching repository details." });
    }
  }
};


// const analyzeGithubUrl = async (req: Request, res: Response) => {
//   const { githubUrl } = req.body;
//   const pathRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
//   const match = githubUrl.match(pathRegex);

//   if (!match) {
//     return res.status(400).json({ error: "Invalid GitHub URL" });
//   }

//   const [, owner, repo] = match;

//   // Retrieve successState from the session
//   const successState = getCustomSessionProperty<string>(req.session, 'successState');

//   // Determine the access token to use
//   let accessToken = '';
//   if (successState === 'success') {
//     // Attempt to find the user and use their access token if authentication was successful
//     const user = await User.findOne({ 'username': owner });
//     accessToken = user ? user.accessToken : '';
//   } else {
//     // Use the global access token for public repositories
//     accessToken = process.env.GITHUB_PAT || '';
//   }

//   // Function to attempt repository access
//   const attemptAccess = async (token: string) => {
//     const octokit = new Octokit({ auth: token });
//     return await octokit.repos.get({ owner, repo });
//   };

//   try {
//     const repoDetails = await attemptAccess(accessToken);
//     const promptText = `Analyze the GitHub repository "${owner}/${repo}" and provide a summary of its main features, technologies used, and overall purpose.`;
//     const analysisResult = await analyzeTextWithGPT(promptText);
//     console.log('Analysis Result:', analysisResult);
//     return res.json({ analysis: analysisResult, repoDetails: repoDetails.data });
//   } catch (error) {
//     const typedError = error as GitHubApiError;

//     // Handle specific errors (e.g., repository not found, access denied, etc.)
//     if (typedError.status === 404 || typedError.status === 403) {
//       return res.status(typedError.status).json({
//         error: typedError.message,
//         authUrl: successState !== 'success' ? getGithubAuthUrl() : undefined,
//       });
//     } else {
//       console.error('GitHub API Error:', error);
//       return res.status(500).json({ error: "Error fetching repository details." });
//     }
//   }
// };


router.post('/analyze', analyzeGithubUrl); // This line should now work without issue

export default router;

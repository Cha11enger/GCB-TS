//routes/repoRoutes.ts
import express, { Request, Response } from 'express';
import { Octokit } from "@octokit/rest";
import { analyzeTextWithGPT } from '../config/openai-setup';
import User {  IUser } from '../models/User';
import { getGithubAuthUrl } from '../utils/authHelpers'; // Ensure this utility function is implemented
// import router from '.';
import { getCustomSessionProperty } from '../utils/sessionUtils';
// import User from '../models/User';


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
  const accessToken = req.user ? (req.user as User).accessToken : process.env.GITHUB_PAT;

  // Function to attempt repository access
  const attemptAccess = async (token: string) => {
    const octokit = new Octokit({ auth: token });
    return await octokit.repos.get({ owner, repo });
  };

  try {
    // First attempt with PAT or an empty string
    const repoDetails = accessToken ? await attemptAccess(accessToken) : null;
    const promptText = `Analyze the GitHub repository "${owner}/${repo}" and provide a summary of its main features, technologies used, and overall purpose.`;
    const analysisResult = await analyzeTextWithGPT(promptText);
    console.log('Analysis Result:', analysisResult);
    return res.json({ analysis: analysisResult, repoDetails: repoDetails ? repoDetails.data : "Repository details not available" });
  } catch (error) {
    const typedError = error as GitHubApiError; // Type assertion
    if (typedError.status === 404 || typedError.status === 403) {
      // Check if a user-specific accessToken is available for a retry
      const user = await User.findOne({ username: owner });
      if (user && user.accessToken) {
        try {
          // Retry with the user's access token
          const repoDetails = await attemptAccess(user.accessToken);
          const promptText = `Analyze the GitHub repository "${owner}/${repo}" and provide a summary of its main features, technologies used, and overall purpose.`;
          const analysisResult = await analyzeTextWithGPT(promptText);
          console.log('Analysis Result:', analysisResult);
          return res.json({ analysis: analysisResult, repoDetails: repoDetails.data });
        } catch (retryError) {
          // If still failing after user token, likely an auth issue, prompt for auth
          console.log('Retry Error:', retryError);
          return res.status(401).json({
            error: "Authentication required to access this repository. Please authenticate via GitHub.",
            authUrl: getGithubAuthUrl(),
          });
        }
      } else {
        // No user token available, prompt for authentication
        return res.status(401).json({
          error: "Authentication required to access this repository. Please authenticate via GitHub.",
          authUrl: getGithubAuthUrl(),
        });
      }
    } else {
      // Generic error after all attempts
      console.error('GitHub API Error:', typedError);
      return res.status(500).json({ error: "Error fetching repository details." });
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

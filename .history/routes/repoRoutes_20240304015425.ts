import express from 'express';
import { Octokit } from "@octokit/rest";
import User from '../models/User'; // Adjust this import based on your actual User model file path
import { analyzeTextWithGPT } from '../config/openai-setup'; // Adjust this import as necessary

const router = express.Router();

// router.post('/analyze-github-url', async (req, res) => {
//   const { githubUrl, userId } = req.body;

//   const pathRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
//   const match = githubUrl.match(pathRegex);
//   if (!match) {
//     return res.status(400).json({ error: "Invalid GitHub URL" });
//   }
//   const [, owner, repo] = match;

//   try {
//     let accessToken: string | null = null;

//     // Fetch the user's access token if a userId is provided
//     if (userId) {
//         const user = await User.findById(userId).exec(); // Use .exec() for proper TypeScript support with Mongoose
//         accessToken = user ? user.accessToken : null;
//     }

//     // Initialize Octokit with the user's access token or a generic token for public repos
//     const octokit = new Octokit({ auth: accessToken || process.env.GITHUB_PAT });

//     // Fetch repository details using Octokit
//     const repoDetails = await octokit.repos.get({ owner, repo });

//     // Analyze the repository with OpenAI
//     const promptText = `Analyze the GitHub repository "${owner}/${repo}" and provide a summary of its main features, technologies used, and overall purpose.`;
//     const analysisResult = await analyzeTextWithGPT(promptText);
//     const plainTextResponse = analysisResult; // Assuming `analysisResult` is a string.
//     res.send({ plainTextResponse, repoDetails: repoDetails.data });
//     // res.json({ analysis: analysisResult, repoDetails: repoDetails.data });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Error processing your request." });
//   }
// });

router.post('/analyze-github-url', async (req, res) => {
  const { githubUrl, userId } = req.body;

  // Regex to validate and extract owner and repo name from GitHub URL
  const pathRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = githubUrl.match(pathRegex);
  if (!match) {
    // If the URL doesn't match the expected pattern, send a bad request response
    return res.status(400).json({ error: "Invalid GitHub URL" });
  }

  // Destructure the owner and repo from the regex match
  const [, owner, repo] = match;

  try {
    let accessToken: string | null = null;

    // If a userId is provided, attempt to retrieve the associated access token
    if (userId) {
      const user = await User.findById(userId).exec(); // Use .exec() for proper TypeScript support with Mongoose
      accessToken = user ? user.accessToken : null;
    }

    // Initialize Octokit with either the user's access token or a generic token for public repositories
    const octokit = new Octokit({ auth: accessToken || process.env.GITHUB_PAT });

    // Attempt to fetch repository details using Octokit
    let repoDetails;
    try {
      repoDetails = await octokit.repos.get({ owner, repo });
    } catch (error) {
      if (error.status === 404 && !accessToken) {
        // If a 404 error is received and no access token is available, prompt for authentication
        return res.status(401).json({ message: "Authentication required for private repository." });
      } else {
        // If any other error occurs, throw to be caught by the outer catch block
        throw error;
      }
    }

    // If the repository details are successfully fetched, proceed to analyze the repository
    const promptText = `Analyze the GitHub repository "${owner}/${repo}" and provide a summary of its main features, technologies used, and overall purpose.`;
    const analysisResult = await analyzeTextWithGPT(promptText);
    // Send the analysis result and repository details in the response
    res.json({ analysis: analysisResult, repoDetails: repoDetails.data });

  } catch (error) {
    // Log the error and send a server error response
    console.error(error);
    res.status(500).json({ error: "Error processing your request." });
  }
});


export default router;

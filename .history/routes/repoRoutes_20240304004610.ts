import express from 'express';
import { Octokit } from "@octokit/rest";
import User from '../models/User'; // Adjust this import based on your actual User model file path
import { analyzeTextWithGPT } from '../config/openai-setup'; // Adjust this import as necessary

const router = express.Router();

router.post('/analyze-github-url', async (req, res) => {
  const { githubUrl, userId } = req.body;

  const pathRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = githubUrl.match(pathRegex);
  if (!match) {
    return res.status(400).json({ error: "Invalid GitHub URL" });
  }
  const [, owner, repo] = match;

  try {
    let accessToken: string | null = null;

    // Fetch the user's access token if a userId is provided
    if (userId) {
        const user = await User.findById(userId).exec(); // Use .exec() for proper TypeScript support with Mongoose
        accessToken = user ? user.accessToken : null;
    }

    // Initialize Octokit with the user's access token or a generic token for public repos
    const octokit = new Octokit({ auth: accessToken || process.env.GITHUB_PAT });

    // Fetch repository details using Octokit
    const repoDetails = await octokit.repos.get({ owner, repo });

    // Analyze the repository with OpenAI
    const promptText = `Analyze the GitHub repository "${owner}/${repo}" and provide a summary of its main features, technologies used, and overall purpose.`;
    const analysisResult = await analyzeTextWithGPT(promptText);
    // Send the analysis result and repository details back to the client and to the custom gpt page as response from the custom gpt
    const 
    // const plainTextResponse = analysisResult; // Assuming `analysisResult` is a string.
    // res.send({ plainTextResponse, repoDetails: repoDetails.data });
    // res.json({ analysis: analysisResult, repoDetails: repoDetails.data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error processing your request." });
  }
});

export default router;

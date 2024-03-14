import express, { Request, Response } from 'express';
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';
import { analyzeTextWithGPT } from '../config/openai-setup'; // Importing OpenAI setup for analysis
import { Session } from 'express-session';
import User, { IUser } from '../models/User'; // Adjust path as necessary
import { getGithubAuthUrl } from '../utils/authHelpers'; // Importing the helper function to generate GitHub OAuth URL

// routes/repoRoutes.ts
// import User from '../models/User'; // Adjust this import as necessary
// import { Session } from 'express-session';

dotenv.config();

const router = express.Router();

interface CustomRequest extends Request {
  session: Session & {
    githubId?: string;
    accessToken?: string; // Assuming the temporary storage of accessToken in session after auth callback
  };
}

// Function to create an Octokit client
const createOctokitClient = (token: string) => {
  console.log('Inside createOctokitClient');
  console.log('Token:', token);
  return new Octokit({ auth: token });
};

// Function to analyze the repository
const analyzeRepository = async (owner: string, repo: string, token: string) => {
  console.log('Inside analyzeRepository');
  console.log('Owner:', owner);
  console.log('Repo:', repo);
  console.log('Token:', token);
  const octokit = createOctokitClient(token);
  try {
    const { data: repoDetails } = await octokit.repos.get({ owner, repo });
    const analysisResult = await analyzeTextWithGPT(`Analyze the GitHub repository "${owner}/${repo}"`);
    console.log('Analysis Result:', analysisResult);
    return { success: true, repoDetails, analysisResult };
  } catch (error) {
    console.error('Failed to fetch repository details:', error);
    return { success: false, error: "Failed to fetch repository details." };
  }
};

// Route to analyze a GitHub repository
router.post('/analyze', async (req: Request, res: Response) => {
  console.log('Inside /analyze route');
  const { githubUrl } = req.body;
  console.log('GitHub URL:', githubUrl);
  const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    console.log('Invalid GitHub URL');
    return res.status(400).json({ error: "Invalid GitHub URL." });
  }

  const [, owner, repo] = match;

  // Try using PAT
  if (process.env.GITHUB_PAT) {
    console.log('Using PAT');
    const result = await analyzeRepository(owner, repo, process.env.GITHUB_PAT);
    if (result.success) {
      console.log('Analysis Result:', result);
      return res.json(result);
    }
    console.log('Prompting for authentication');
    return promptForAuthentication(res);
  }

  // Try using user's access token
  const userAccessToken = await getUserAccessToken(req);
  if (userAccessToken) {
    console.log('Using User Access Token');
    const result = await analyzeRepository(owner, repo, userAccessToken);
    if (result.success) {
      console.log('Analysis Result:', result);
      return res.json(result);
    }
  }

  // Prompt for authentication if all else fails
  console.log('Prompting for authentication');
  promptForAuthentication(res);
});

// Retrieve the user's access token from session, database, or callback URL
async function getUserAccessToken(req: CustomRequest): Promise<string | null> {
  console.log('Inside getUserAccessToken');
  // Attempt to retrieve from session first
  if (req.session && req.session.githubId) {
    try {
      const user: IUser | null = await User.findById(req.session.githubId).exec();
      if (user && user.accessToken) {
        console.log('Access Token:', user.accessToken);
        return user.accessToken;
      }
    } catch (error) {
      console.error('Error fetching user from DB:', error);
    }
  }
  
  // Check for direct retrieval post-authentication if applicable
  if (req.session && req.session.accessToken) {
    console.log('Access Token:', req.session.accessToken);
    return req.session.accessToken; // Use accessToken stored in session after auth callback
  }

  return null; // Return null if no access token is found
}

// Function to prompt for user authentication
// function promptForAuthentication(res: Response) {
//   console.log('Inside promptForAuthentication');
//   res.status(403).json({
//     error: "Authentication required. Please authenticate to access this repository.",
//     // authUrl: `${process.env.SERVER_URL}/api/auth/github`
//     authUrl: getGithubAuthUrl()
//   });
// }

export default router;

// routes/repoRoutes.ts
import express, { Request, Response } from 'express';
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';
// import User from '../models/User'; // Adjust this import as necessary
import { analyzeTextWithGPT } from '../config/openai-setup'; // Importing OpenAI setup for analysis
import { Session } from 'express-session';
import User, { IUser } from '../models/User'; // Adjust path as necessary
// import { Session } from 'express-session';

dotenv.config();

const router = express.Router();

interface CustomRequest extends Request {
  session: Session & {
    userId?: string;
    accessToken?: string; // Assuming the temporary storage of accessToken in session after auth callback
  };
}
// Function to create an Octokit client
const createOctokitClient = (token: string) => new Octokit({ auth: token });

// Function to analyze the repository
const analyzeRepository = async (owner: string, repo: string, token: string) => {
  const octokit = createOctokitClient(token);
  try {
    const { data: repoDetails } = await octokit.repos.get({ owner, repo });
    const analysisResult = await analyzeTextWithGPT(`Analyze the GitHub repository "${owner}/${repo}"`);
    return { success: true, repoDetails, analysisResult };
  } catch (error) {
    console.error('Failed to fetch repository details:', error);
    return { success: false, error: error.message };
  }
};

// Route to analyze a GitHub repository
router.post('/analyze', async (req: Request, res: Response) => {
  const { githubUrl } = req.body;
  const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    return res.status(400).json({ error: "Invalid GitHub URL." });
  }

  const [, owner, repo] = match;

  // Try using PAT
  if (process.env.GITHUB_PAT) {
    const result = await analyzeRepository(owner, repo, process.env.GITHUB_PAT);
    if (result.success) {
      return res.json(result);
    }
    return promptForAuthentication(res);
  }

  // Try using user's access token
  const userAccessToken = await getUserAccessToken(req);
  if (userAccessToken) {
    const result = await analyzeRepository(owner, repo, userAccessToken);
    if (result.success) {
      return res.json(result);
    }
  }

  // Prompt for authentication if all else fails
  promptForAuthentication(res);
});

// Retrieve the user's access token from session, database, or callback URL
async function getUserAccessToken(req: Request): Promise<string | null> {
  const session = req.session as Session & { userId?: string }; // Update the type definition for the session object
  const userId = session.userId; // Assuming session storage of userId
  if (userId) {
    const user = await User.findById(userId).exec();
    if (user && user.accessToken) {
      return user.accessToken;
    }
  }
  // Implement additional logic here if needed, e.g., handling callback URL
  return null;
}

// Function to prompt for user authentication
function promptForAuthentication(res: Response) {
  res.status(403).json({
    error: "Authentication required. Please authenticate to access this repository.",
    authUrl: `${process.env.SERVER_URL}/api/auth/github`
  });
}

export default router;
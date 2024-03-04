
import { Octokit } from "@octokit/rest";
import User from '../models/User'; // Adjust this import based on your actual User model file path
import { analyzeTextWithGPT } from '../config/openai-setup'; // Adjust this import as necessary
import { Request, Response } from 'express';
import authRoutes from './authRoutes';
// import session from 'express-session';


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

// function for checking whether the repo is private or public using octokit
export const checkRepoVisibility = async (req: Request, res: Response) => {
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
    const visibility = repoDetails.data.private ? 'private' : 'public';
  
    if (visibility === 'private' && !req.session.isAuthenticated) {
      // Redirect to GitHub OAuth flow if not authenticated
      res.redirect('/auth/github');
    } else {
      res.json({ visibility, repoDetails: repoDetails.data });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error checking repository visibility" });
  }
}




const analyzeGithubUrl = async (req: Request, res: Response) => {
  const { githubUrl, userId } = req.body;

  const pathRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = githubUrl.match(pathRegex);
  if (!match) {
    return res.status(400).json({ error: "Invalid GitHub URL" });
  }
  const [, owner, repo] = match;

  // next check if checkRepoVisibility return private or public if private then use authRoutes.github
  // const visibility = await checkRepoVisibility(owner, repo);
  // if (visibility === 'private') {
  //   return authRoutes.github;
  // }

  try {
    let accessToken: string | null = null;

    if (userId) {
      const user = await User
        .findById(userId)
        .exec();
      accessToken = user ? user.accessToken : null;
    }

    const octokit = new Octokit({ auth: accessToken || process.env.GITHUB_PAT });

    const repoDetails = await octokit.repos.get({ owner, repo });

    const promptText = `Analyze the GitHub repository "${owner}/${repo}" and provide a summary of its main features, technologies used, and overall purpose.`;
    const analysisResult = await analyzeTextWithGPT(promptText);
    res.json({ analysis: analysisResult, repoDetails: repoDetails.data });
  }
  catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
      res.status(500).json({ error: error.message });
    } else {
      console.error('An unknown error occurred', error);
      res.status(500).json({ error: "An unknown error occurred" });
    }
  }
}



//   try {
//     let accessToken: string | null = null;

//     if (userId) {
//       const user = await User.findById(userId).exec();
//       accessToken = user ? user.accessToken : null;
//     }

//     const octokit = new Octokit({ auth: accessToken || process.env.GITHUB_PAT });

//     const repoDetails = await octokit.repos.get({ owner, repo });

//     if (repoDetails.data.private && !accessToken) {
//       // use authRoutes.github
//       return authRoutes.github;
//       // if auth 
//       // return res.status(401).json({ message: "Repository is private. Please authenticate." });

//     }

//     const promptText = `Analyze the GitHub repository "${owner}/${repo}" and provide a summary of its main features, technologies used, and overall purpose.`;
//     const analysisResult = await analyzeTextWithGPT(promptText);
//     res.json({ analysis: analysisResult, repoDetails: repoDetails.data });
//   } catch (error: unknown) {
//     if (error instanceof Error) {
//       console.error(error.message);
//       res.status(500).json({ error: error.message });
//     } else {
//       console.error('An unknown error occurred', error);
//       res.status(500).json({ error: "An unknown error occurred" });
//     }
//   }
// };

const repoRoutes = {
  analyzeGithubUrl,
  checkRepoVisibility
};

export default repoRoutes;


// export default router;

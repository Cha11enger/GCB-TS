// routes\repoRoutes.ts
import { Octokit } from "@octokit/rest";
import User from '../models/User'; // Adjust this import based on your actual User model file path
import { analyzeTextWithGPT } from '../config/openai-setup'; // Adjust this import as necessary
import { Request, Response } from 'express';
import authRoutes from './authRoutes';

const analyzeGithubUrl = async (req: Request, res: Response) => {
  const { githubUrl, userId } = req.body;

  const pathRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = githubUrl.match(pathRegex);
  if (!match) {
    return res.status(400).json({ error: "Invalid GitHub URL" });
  }
  const [, owner, repo] = match;

  const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
  //  check if repo is private or public using octokit
  try {
    const repoDetails = await octokit.repos.get({ owner, repo });
    const visibility = repoDetails.data.private ? 'private' : 'public';
    
    // if repo is not equal to public check the owner's access token in db and use it to authenticate and analyze the repo and if owner's access token is not found redirect to github auth
    // if visibility not equal to public or repo not found 
    if (visibility !== 'public', 
    // if (visibility !== 'public') {
    // if (visibility === 'private') {
      //check owner name in db and its access token
      const user = await  User.findOne  ({ username: owner }).exec();
      if (!user) {
        // Redirect to GitHub OAuth flow if not authenticated
        return res.redirect('/auth/github');
      } else {
        const octokit = new Octokit({ auth: user.accessToken });
        const repoDetails = await octokit.repos.get({ owner, repo });
        const promptText = `Analyze the GitHub repository "${owner}/${repo}" and provide a summary of its main features, technologies used, and overall purpose.`;
        const analysisResult = await analyzeTextWithGPT(promptText);
        res.json({ analysis: analysisResult, repoDetails: repoDetails.data });
      }
    }
    // if repo is public analyze the repo
    else {
      const promptText = `Analyze the GitHub repository "${owner}/${repo}" and provide a summary of its main features, technologies used, and overall purpose.`;
      const analysisResult = await analyzeTextWithGPT(promptText);
      res.json({ analysis: analysisResult, repoDetails: repoDetails.data });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error checking repository visibility" });
  }
}

const repoRoutes = {
  analyzeGithubUrl,
};

export default repoRoutes;


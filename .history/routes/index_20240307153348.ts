// routes\index.ts
import { authRoutes } from './authRoutes';
import { repoRoutes } from './repoRoutes'; // Fixed code
import express from 'express';

const router = express.Router();

router.get('/auth/github', authRoutes.authenticateWithGitHub); // Fixed code
router.get('/auth/github/callback', authRoutes.handleGitHubCallback); // Fixed code
router.get('/repo/analyze', repoRoutes.analyzeGithubUrl);
export const authRoutes = {
    authenticateWithGitHub: (req: Request, res: Response) => {
        // implementation
    },
    handleGitHubCallback: (req: Request, res: Response) => {
        // implementation
    },
};
// router.get('/repo/private', repoRoutes.checkRepoVisibility);

export default router;



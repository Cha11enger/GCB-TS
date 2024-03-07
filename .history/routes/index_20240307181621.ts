// routes\index.ts
import { authRoutes } from './authRoutes';
import { repoRoutes } from './repoRoutes'; // Fixed code
import express from 'express';

const router = express.Router();

router.get('/auth/github', authRoutes.authenticateWithGitHub);
router.get('/auth/github/callback', authRoutes.handleGitHubCallback);
router.get('/repo/analyze', repoRoutes.analyzeGithubUrl);
router.post('/auth/github/token', authRoutes.exchangeGithubToken); // Fixed code


// router.get('/repo/private', repoRoutes.checkRepoVisibility);

export default router;



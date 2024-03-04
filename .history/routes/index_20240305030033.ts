// routes\index.ts
import authRoutes from './authRoutes';
import { repoRoutes } from './repoRoutes'; // Fixed code
import express from 'express';

const router = express.Router();

router.get('/auth/github', authRoutes.github); // Fixed code
router.post('/auth/github/callback', authRoutes.githubCallback); // Fixed code
router.post('/repo/analyze', repoRoutes.analyzeGithubUrl);
// router.get('/repo/private', repoRoutes.checkRepoVisibility);

export default router;



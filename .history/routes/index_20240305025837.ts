// routes\index.ts
import authRoutes from './authRoutes';
import { repoRoutes } from './repoRoutes'; // Fixed code
import express from 'express';

const router = express.Router();

router.post('/auth/github', authRoutes.github); // Fixed code
router.use('/auth/github/callback', authRoutes.githubCallback); // Fixed code
router.post('/repo/analyze', repoRoutes.analyzeGithubUrl);
// router.get('/repo/private', repoRoutes.checkRepoVisibility);

export default router;



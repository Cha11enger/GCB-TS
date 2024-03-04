// 
import authRoutes from './authRoutes';
import repoRoutes from './repoRoutes';
import express from 'express';

const router = express.Router();

router.use('/auth/github', authRoutes.github); // Fixed code
router.use('/auth/github/callback', authRoutes.githubCallback); // Fixed code
router.post('/repo/analyze', repoRoutes.analyzeGithubUrl);
router.get('/repo/private', repoRoutes.checkRepoVisibility);

export default router;



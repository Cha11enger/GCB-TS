import authRoutes from './authRoutes';
import repoRoutes from './repoRoutes';
import express from 'express';

const router = express.Router();

router.use('/auth/github', authRoutes.github); // Fixed code
router.use('/auth/github/callback', authRoutes.githubCallback); // Fixed code
router.use('/repo/analyze', repoRoutes.analyzeGithubUrl);
router.use

export default router;



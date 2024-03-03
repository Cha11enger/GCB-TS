import authRoutes from './authRoutes';
import repoRoutes from './repoRoutes';
import express from 'express';

const router = express.Router();

// router.use('/auth', authRoutes);
router.use('/auth/github', authRoutes.git); // Fixed code
router.use('/repo/analyze', repoRoutes.analyzeGithubUrl);

export default router;

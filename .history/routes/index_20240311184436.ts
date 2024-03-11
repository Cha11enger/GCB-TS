// routes\index.ts
import authRoutes from './authRoutes';
import { repoRoutes } from './repoRoutes'; // Fixed code
import express from 'express';

const router = express.Router();

router.get('/auth', authRoutes);
router.get('/repo/analyze', repoRoutes.analyzeGithubUrl); // Fixed code


// router.get('/repo/private', repoRoutes.checkRepoVisibility);

export default router;



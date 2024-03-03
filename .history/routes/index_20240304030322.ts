// import router from './authRoutes';
import authRoutes from './authRoutes';
import repoRoutes from './repoRoutes';
import express from 'express';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/repo', repoRoutes);

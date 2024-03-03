import authRoutes from './authRoutes';
import repoRoutes from './repoRoutes';

router.use('/auth', authRoutes);
router.use('/repos', repoRoutes);

export { authRoutes, repoRoutes };

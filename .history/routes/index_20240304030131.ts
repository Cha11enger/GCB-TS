// import router from './authRoutes';
import authRoutes from './authRoutes';
import repoRoutes from './repoRoutes';

const router = express.Router();

router.post('/analyze-github-url', alnalyseGitHubUrl);

export { authRoutes, repoRoutes };

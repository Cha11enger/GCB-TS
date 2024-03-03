import authRoutes from './authRoutes';
import repoRoutes from './repoRoutes';

// add as apiRoutes with /api prefix
const router = express.Router();


export { authRoutes, repoRoutes };

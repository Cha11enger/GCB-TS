// Add this in a type definitions file or at the top of your authRoutes file

import { Session } from 'express-session';
import { User as PassportUser } from 'passport';

declare module 'express-session' {
  export interface SessionData {
    accessToken: string;
    repoUrl: string;
  }
}

interface GithubProfile extends PassportUser {
  accessToken: string;
  // ... add any additional properties you need from the GitHub profile
}

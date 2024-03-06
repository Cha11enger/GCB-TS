// Add this to the top of your authRoutes.ts or repoRoutes.ts

import session from 'express-session';

declare module 'express-session' {
  export interface SessionData {
    accessToken?: string;
    repoUrl?: string;
  }
}

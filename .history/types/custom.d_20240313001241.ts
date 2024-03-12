// custom.d.ts or any other .d.ts file in your project
import session from 'express-session';

declare module 'express-session' {
  interface SessionData {
    accessToken?: string;
    githubUrl?: string;
    state?: string;
    code?: string;
    successState?: string;
    githubId?: string;
  }
}



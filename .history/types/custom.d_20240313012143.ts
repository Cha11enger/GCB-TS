// types/custom.d.ts or any other .d.ts file in your project
// types/custom.d.ts
import "express-session";

declare module "express-session" {
  interface SessionData {
    githubId?: string;
    accessToken?: string;
    state?: string;
    code?: string;
    successState?: string;
    git
  }
}



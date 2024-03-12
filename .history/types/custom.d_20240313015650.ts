// types/custom.d.ts
import "express-session";

declare module "express-session" {
  interface SessionData {
    githubId?: string;
    accessToken?: string;
    state?: string;
    code?: string;
    successState?: string;
    githubUrl?: string;
  }
}

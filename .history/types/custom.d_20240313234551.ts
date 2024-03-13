// types/custom.d.ts
import "express-session";

declare module "express-session" {
  interface SessionData {
    user?: { // Include a user object
      accessToken?: string;
      // Add other user-related properties here
    };
    githubId?: string;
    state?: string;
    code?: string;
    successState?: string;
    githubUrl?: string;
  }
}

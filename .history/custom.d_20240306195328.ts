// custom.d.ts
import "express-session";

declare module "express-session" {
  interface SessionData {
    accessToken?: string;
    repoUrl?: string;
  }
}

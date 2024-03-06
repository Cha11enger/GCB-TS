// custom.d.ts or any other filename ending with .d.ts
import "express-session";

declare module "express-session" {
  interface SessionData {
    accessToken?: string;
    githubUrl?: string;
  }
}

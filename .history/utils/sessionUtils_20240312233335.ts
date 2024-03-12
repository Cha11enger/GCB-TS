// utils/sessionUtils.ts

import { Session } from "express-session";

// Define interfaces for your custom session properties
interface CustomSession extends Session {
    accessToken?: string;
    githubUrl?: string;
    state?: string;
    code?: string;
    successState?: string;
    githubId?: string;
}

// Utility function to set custom session properties safely
// export function setCustomSessionProperty(session: Session, key: keyof CustomSession, value: any): void {
//     (session as CustomSession)[key] = value;
// }

// Utility function to set custom session properties safely and save the session
export function setCustomSessionProperty(session: Session, key: keyof CustomSession, value: any, callback?: (err?: any) => void): void {
    (session as CustomSession)[key] = value;
    session.save(callback);
}

// Utility function to get custom session properties safely
export function getCustomSessionProperty<T>(session: Session, key: keyof CustomSession): T | undefined {
    return (session as CustomSession)[key] as T;
}

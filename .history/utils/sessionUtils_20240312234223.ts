// utils/sessionUtils.ts
import { Session } from "express-session";

// Utility function to set custom session properties safely and save the session
export function setCustomSessionProperty(session: Session, key: keyof Session['sessionData'], value: any, callback?: (err?: any) => void): void {
    session[key] = value;
    session.save(callback);
}

// Utility function to get custom session properties safely
export function getCustomSessionProperty<T>(session: Session, key: keyof Session['sessionData']): T | undefined {
    return session[key] as T;
}

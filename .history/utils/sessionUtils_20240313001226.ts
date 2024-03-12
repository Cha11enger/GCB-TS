// utils/sessionUtils.ts
import { Session } from "express-session";
// import { SessionData } from "express-session";

// Assumes SessionData has been globally extended to include your custom properties
// No need to directly refer to a 'sessionData' property, as it doesn't exist

// Utility function to set custom session properties safely and save the session
export function setCustomSessionProperty(SessionData: Session, key: string, value: any, callback?: (err?: any) => void): void {
    SessionData[key as keyof Session] = value;
    if (callback) {
        SessionData.save(callback);
    } else {
        SessionData.save();
    }
}

// Utility function to get custom session properties safely
export function getCustomSessionProperty<T>(SessionData: Session, key: string): T | undefined {
    return SessionData[key as keyof Session] as T | undefined;
}

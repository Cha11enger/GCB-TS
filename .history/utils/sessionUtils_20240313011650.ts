// utils/sessionUtils.ts
import { Session } from "express-session";

export function setCustomSessionProperty<T>(session: Session & {[key: string]: any}, key: string, value: T): void {
    session[key] = value;
    // save the session
    session.save(err => {
        if (err) {
            console.error('Session save error:', err);
        } else {
            console.log('Session saved successfully');
        }
    });

}

export function getCustomSessionProperty<T>(session: Session & {[key: string]: any}, key: string): T | undefined {
    return session[key] as T | undefined;
}

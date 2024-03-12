// utils/sessionUtils.ts
import { Session } from "express-session";

export function setCustomSessionProperty<T>(session: Session & {[key: string]: any}, key: string, value: T): void {
    session[key] = value;
    
}

export function getCustomSessionProperty<T>(session: Session & {[key: string]: any}, key: string): T | undefined {
    return session[key] as T | undefined;
}

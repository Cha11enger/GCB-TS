import { Session } from "express-session";

export function setCustomSessionProperty(session: Session & { [key: string]: any }, key: string, value: any): void {
  session[key] = value;
  session.save((err: any) => {
    if (err) {
      console.error('Session save error:', err);
    } else {
      console.log('Session saved successfully for key:', key);
    }
  });
}

export function getCustomSessionProperty<T>(session: Session & { [key: string]: any }, key: string): T | undefined {
  return session[key] as T | undefined;
}

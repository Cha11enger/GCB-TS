// models/User.ts
import mongoose, { Document } from 'mongoose';

export interface IUser extends Document {
  githubId: string;
  accessToken: string;
  displayName: string;
  username: string;
  profileUrl: string;
  avatarUrl: string;
  state?: string;
}

const userSchema = new mongoose.Schema({
  githubId: { type: String, required: true },
  accessToken: { type: String, required: true },
  displayName: { type: String },
  username: { type: String },
  profileUrl: { type: String },
  avatarUrl: { type: String }
});

const User = mongoose.model<IUser>('User', userSchema);
export default User;

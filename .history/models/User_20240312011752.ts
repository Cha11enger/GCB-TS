// models/User.ts
import mongoose, { Schema, Document } from 'mongoose';

// Extend the Document to ensure type safety for user document properties
import { Document } from 'mongoose';

export interface IUser extends Document {
  githubId: string;
  accessToken: string;
  displayName: string | null;
  username: string;
  profileUrl: string;
  avatarUrl: string;
  state?: string;
}

// Define the schema for the User model
const userSchema = new Schema({
  githubId: { type: String, required: true, unique: true }, // Ensure githubId is unique
  accessToken: { type: String, required: true },
  displayName: { type: String, default: null }, // Use default value for optional fields
  username: { type: String, required: true },
  profileUrl: { type: String, required: true },
  avatarUrl: { type: String, required: true },
  state: { type: String, default: null }, // It's optional; default can be null
});

// Create the User model from the schema
const User = mongoose.model<IUser>('User', userSchema);

export default User;

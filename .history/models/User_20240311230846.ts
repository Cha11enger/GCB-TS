import mongoose, { Schema, Document } from 'mongoose';

// Extend the Document to ensure type safety for user document properties
export interface IUser extends Document {
  githubId: string;
  accessToken: string;
  displayName: string | null; // Considering displayName could be null if not provided by GitHub
  username: string;
  profileUrl: string;
  avatarUrl: string;
  state?: string; // Optional to handle OAuth flow or other states
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

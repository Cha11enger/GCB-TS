// config/passport-setup.ts
import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/User'; // Adjust the import path as necessary

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id); // Typed interaction with User model
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID as string,
    clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    callbackURL: process.env.GITHUB_CALLBACK_URL as string
  },
async (accessToken: string, refreshToken: string, profile: any, done: Function) => {
    try {
      let user = await User.findOne({ githubId: profile.id });
      if (!user) {
        user = new User({
          githubId: profile.id,
          accessToken: accessToken,
          displayName: profile.displayName,
          username: profile.username,
          profileUrl: profile.profileUrl,
          avatarUrl: profile._json.avatar_url
        });
        await user.save();
        console.log("New user created:", user);
      } else {
        // Optionally update the access token on each login
        user.accessToken = accessToken;
        await user.save();
        console.log("User updated:", user);
      }
      done(null, user);
    } catch (error) {
      console.error("Error saving the user:", error);
      done(error, null);
    }
  }
));

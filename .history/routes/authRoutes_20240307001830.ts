// // routes\authRoutes.ts
// import { Request, Response } from 'express';
// import passport from 'passport';
// // import IUser from '../models/User';
// import User, { IUser } from '../models/User';
// import { setCustomSessionProperty, getCustomSessionProperty } from '../utils/sessionUtils';

// // const router = express.Router();

// const getGithubAuthUrl = () => {
//   // Direct users to your endpoint that handles GitHub OAuth
//   return 'https://gcb-ts.onrender.com/api/auth/github';
//   // return 'https://gcb-ts.onrender.com/api/auth/github/callback'
// };

// // Initiates GitHub authentication process
// const github = async (req: Request, res: Response) => {
//   passport.authenticate('github', {
//     // Ensure this callbackURL matches exactly the one registered in your GitHub app settings
//     // Including it here for demonstration; usually, it's set in the strategy configuration.
//     callbackURL: process.env.GITHUB_CALLBACK_URL as string
//   } as passport.AuthenticateOptions)(req, res);
// };


// // GitHub callback route
// // const githubCallback = async (req: Request, res: Response) => {
// //   passport.authenticate('github', {
// //     // once authenticated send req.session.isAuthenticated = true;
// //     successRedirect: '/',
// //     failureRedirect: '/auth/github'
// //   } as passport.AuthenticateOptions)(req, res);
// // }

// const githubCallback = async (req: Request, res: Response) => {
//   passport.authenticate('github', (err: Error | null, user: IUser | false) => {
//       if (err || !user) {
//           console.error(err); // Optionally log the error
//           return res.redirect('/auth/github');
//       }
//       req.login(user, (err) => {
//           if (err) {
//               console.error(err); // Optionally log the error
//               return res.redirect('/auth/github');
//           }
//           // Use utility function to set the accessToken
//           setCustomSessionProperty(req.session, 'accessToken', user.accessToken);
//           // Redirect to the analyze route with the repository information
//           const githubUrl = getCustomSessionProperty<string>(req.session, 'githubUrl') || '';
//           return res.redirect(`/api/repo/analyze?githubUrl=${encodeURIComponent(githubUrl)}`);
//       });
//   })(req, res);
// };


//     // GitHub callback route
//     const authRoutes = {
//       github,
//       githubCallback,
//       getGithubAuthUrl,
//     };

// export default authRoutes;


import { Request, Response } from 'express';
import passport from 'passport';
import { IUser } from '../models/User';
import { setCustomSessionProperty, getCustomSessionProperty } from '../utils/sessionUtils';
import { sendMessageToGPTInterface } from '../utils/gptInterface'; // This utility function needs to be created

const getGithubAuthUrl = () => {
  // Direct users to your endpoint that handles GitHub OAuth
  return 'https://gcb-ts.onrender.com/api/auth/github';
};

// Initiates GitHub authentication process
const github = async (req: Request, res: Response) => {
  // Store the URL before authentication starts
  const githubUrl = req.query.repoUrl as string;
  setCustomSessionProperty(req.session, 'repoUrl', githubUrl);

  passport.authenticate('github', {
    callbackURL: process.env.GITHUB_CALLBACK_URL as string
  })(req, res);
};

// GitHub callback route
const githubCallback = async (req: Request, res: Response) => {
  passport.authenticate('github', (err: Error | null, user: IUser | false) => {
    if (err || !user) {
      console.error(err);
      sendMessageToGPTInterface({ success: false, message: 'Authentication failed.' });
      return res.status(401).send('Authentication failed.');
    }
    req.login(user, async (err) => {
      if (err) {
        console.error(err);
        sendMessageToGPTInterface({ success: false, message: 'Authentication failed.' });
        return res.status(401).send('Login failed.');
      }

      sendMessageToGPTInterface({ success: true, message: 'Successfully authenticated. Proceeding with the analysis.' });
      const githubUrl = getCustomSessionProperty<string>(req.session, 'repoUrl');
      // Here, you need to initiate the analysis process, which might be another utility function or API call
      initiateAnalysisForRepo(githubUrl); // This function should be implemented by you

      // Optionally, you can end the response here if the above function is an API call
      res.end();
    });
  })(req, res);
};

// Export the authRoutes
const authRoutes = {
  github,
  githubCallback,
  getGithubAuthUrl,
};

export default authRoutes;

import { Strategy as GoogleStrategy } from 'passport-google-oauth2';
import User from '../models/user.model.js';
import generateAuthToken from '../utils/generateToken.js';

const googleVerify = async (request, accessToken, refreshToken, profile, done) => {
    try {
        let jwtTokenPair;
        const existingUser = await User.findOne({
            email: profile.email,
        });
        if (existingUser) {
            jwtTokenPair = generateAuthToken({ _id: existingUser._id });
            return done(null, { ...existingUser, ...jwtTokenPair });
        }
        const savedUser = await User.create({
            name: profile.displayName,
            email: profile.email,
            googleId: profile.id,
        });
        jwtTokenPair = generateAuthToken({ _id: savedUser._id });
        return done(null, { ...savedUser, ...jwtTokenPair });
    } catch (error) {
        return done(error, false);
    }
};

const passportGoogleConfig = (passport) => {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: 'http://localhost:5000/api/v1/users/login/oauth2/code/google',
                passReqToCallback: true,
            },
            googleVerify,
        ),
    );
};

export { passportGoogleConfig };

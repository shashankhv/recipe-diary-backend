var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
var User = require("../models/users");
var JtwStrategy = require("passport-jwt").Strategy;
var ExtractJwt = require("passport-jwt").ExtractJwt;
var jwt = require("jsonwebtoken");
var FacebookTokenStrategy = require("passport-facebook-token");

require("dotenv").config();


exports.local = passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

/* To generate Token using JwtWebToken and use sign method */
exports.getToken = (user_id) => {
  // params are payload data, secret key for encription and other options
  return jwt.sign(user_id, process.env.JWT_SECRET);
};

var optionsForJWTStragety = {};
optionsForJWTStragety.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
optionsForJWTStragety.secretOrKey = process.env.JWT_SECRET;

exports.jwtPassport = passport.use(
  new JtwStrategy(optionsForJWTStragety, (jwt_payload, done) => {
    // console.log("JWT payload", jwt_payload);
    User.findOne({ _id: jwt_payload._id }, (err, user) => {
      if (err) {
        return done(err, false);
      } else if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    });
  })
);

exports.verifyUser = passport.authenticate("jwt", { session: false });

exports.verifyAdmin = (req, res, next) => {
  if (req.user.admin) return next();
  err = new Error("You are not authorized to perform this operation!");
  err.status = 403;
  return next(err);
};

// exports.facebookPassport = passport.use(
//   new FacebookTokenStrategy(
//     {
//       clientID: config.facebook.clientId,
//       clientSecret: config.facebook.clientSecret,
//     },
//     (accessToken, refreshToken, profile, done) => {
//       User.findOne({ facebookId: profile.id }, (err, user) => {
//         if (err) {
//           return done(err, false);
//         } else if (user) {
//           return done(null, user);
//         } else {
//           user = new User({ username: profile.displayName });
//           user.facebookId = profile.id;
//           user.firstname = profile.name.givenName;
//           user.lastname = profile.name.familyName;
//           user.save((err, user) => {
//             if (err) return done(err, false);
//             else return done(null, user);
//           });
//         }
//       });
//     }
//   )
// );

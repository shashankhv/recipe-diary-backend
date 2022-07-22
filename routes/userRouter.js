var express = require("express");
const bodyParser = require("body-parser");
const User = require("../models/users");
var passport = require("passport");
var authenticate = require("../config/authenticate");
const cors = require("./cors");

var userRouter = express.Router();
userRouter.use(bodyParser.json());

userRouter.options("*", cors.corsWithOptions, (req, res) => {
  res.sendStatus(200);
});

/* GET users listing. */
userRouter.get(
  "/",
  cors.corsWithOptions,
  authenticate.verifyUser,
  authenticate.verifyAdmin,
  (req, res, next) => {
    User.find({})
      .then(
        (users) => {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.json(users);
        },
        (err) => next(err)
      )
      .catch((err) => next(err));
  }
);

userRouter.post("/signup", cors.corsWithOptions, function (req, res, next) {
  // register is a passport method
  User.register(
    new User({
      username: req.body.username,
    }),
    req.body.password,
    (err, user) => {
      if (err) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.json({ err: err });
      } else {
        user.firstname = req.body.firstname;
        user.lastname = req.body.lastname;
        user.fullname = req.body.firstname + " " + req.body.lastname;
        user.email = req.body.email;
        user.save((err, user) => {
          if (err) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.json({ err: err });
            return;
          }
          passport.authenticate("local")(req, res, () => {
            console.log(req, res);
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.json({ success: true, status: "Registration Successful!" });
          });
        });
      }
    }
  );
});

userRouter.post("/login", cors.corsWithOptions, (req, res, next) => {
  passport.authenticate("local", { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      return res.json({
        success: false,
        status: "Login Unsuccessful!",
        err: info,
      });
    }
    req.logIn(user, { session: false }, (err) => {
      if (err) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        return res.json({
          success: false,
          status: "Login Unsuccessful!",
          err: "Could not log in user!",
        });
      }

      var token = authenticate.getToken({ _id: req.user._id });
      User.findById(req.user._id)
        // .populate(["recents.recipes"])
        .then(
          (user) => {
            console.log(user);
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.json({
              success: true,
              status: "Login Successful!",
              token: token,
              user: user,
            });
          },
          (err) => next(err)
        )
        .catch((err) => next(err));
    });
  })(req, res, next);
});

userRouter.post(
  "/verifyUser",
  cors.corsWithOptions,
  authenticate.verifyUser,
  (req, res, next) => {
    User.findByIdAndUpdate(
      req.user._id,
      {
        $set: { isVerified: true },
      },
      { new: true }
    )
      .then(
        (user) => {
          console.log("User Updated ", user);
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.json(user);
        },
        (err) => next(err)
      )
      .catch((err) => next(err));
  }
);

userRouter.post(
  "/removeVerifyUser",
  cors.corsWithOptions,
  authenticate.verifyUser,
  (req, res, next) => {
    User.findByIdAndUpdate(
      req.user._id,
      {
        $set: { isVerified: false },
      },
      { new: true }
    )
      .then(
        (user) => {
          console.log("User Updated ", user);
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.json(user);
        },
        (err) => next(err)
      )
      .catch((err) => next(err));
  }
);

/* FACEBOOK AUTHENTICATION */

// userRouter.get(
//   "/facebook/token",
//   passport.authenticate("facebook-token"),
//   (req, res) => {
//     if (req.user) {
//       var token = authenticate.getToken({ _id: req.user._id });
//       res.statusCode = 200;
//       res.setHeader("Content-Type", "application/json");
//       res.json({
//         success: true,
//         status: "You are successful logged in!",
//         token: token,
//       });
//     }
//   }
// );

userRouter.get("/checkJWTtoken", cors.corsWithOptions, (req, res) => {
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      return res.json({ status: "JWT invalid!", success: false, err: info });
    } else {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      return res.json({ status: "JWT valid!", success: true, user: user });
    }
  })(req, res);
});

module.exports = userRouter;

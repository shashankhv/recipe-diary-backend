var express = require("express");
const bodyParser = require("body-parser");
const User = require("../models/users");
var passport = require("passport");
var authenticate = require("../config/authenticate");
const cors = require("./cors");
const Recipe = require("../models/recipes");

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

userRouter
  .route("/favorites")
  .options(cors.corsWithOptions, (req, res) => {
    res.sendStatus(200);
  })
  .get(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    User.findById(req.user._id)
      .then(
        (user) => {
          if (user != null) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.json(user.favorites);
          } else {
            err = new Error("User favorites not found");
            err.status = 404;
            return next(err);
          }
        },
        (err) => next(err)
      )
      .catch((err) => next(err));
  })
  .post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    User.findById(req.user._id)
      // .populate("favorites.recipes")
      .then(
        (user) => {
          if (user != null) {
            if (user.favorites[req.body.category]) {
              Recipe.findById(req.body.id, (err, recipe) => {
                if (err) {
                  err = new Error(
                    "Recipe doesn't exist, hence it cannot be added to your favorites "
                  );
                  err.status = 404;
                  return next(err);
                }
                if (recipe) {
                  if (
                    !user.favorites[req.body.category].includes(req.body.id)
                  ) {
                    user.favorites[req.body.category] = [
                      ...user.favorites[req.body.category],
                      req.body.id,
                    ];
                  }
                  user.save().then(
                    (user) => {
                      res.statusCode = 200;
                      res.setHeader("Content-Type", "application/json");
                      res.json(user.favorites[req.body.category]);
                    },
                    (err) => next(err)
                  );
                }
              });
            } else {
              err = new Error(
                req.body.category + " is not a category in favorites"
              );
              err.status = 404;
              return next(err);
            }
          } else {
            err = new Error("User favorites not found");
            err.status = 404;
            return next(err);
          }
        },
        (err) => next(err)
      )
      .catch((err) => next(err));
  })
  .put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res.statusCode = 403;
    res.end("Put operation not supported on /users/favorites/");
  })
  .delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    User.findById(req.user._id)
      .then((user) => {
        if (user != null) {
          if (user.favorites[req.body.category]) {
            if (user.favorites[req.body.category].includes(req.body.id)) {
              user.favorites[req.body.category].splice(
                user.favorites[req.body.category].indexOf(req.body.id),
                1
              );
            }
            user.save().then(
              (user) => {
                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.json(user.favorites[req.body.category]);
              },
              (err) => next(err)
            );
          } else {
            err = new Error(
              req.body.category + " is not a category in favorites"
            );
            err.status = 404;
            return next(err);
          }
        } else {
          err = new Error("Favorite not found");
          err.status = 404;
          return next(err);
        }
      })
      .catch((err) => next(err));
  });

userRouter
  .route("/recents")
  .options(cors.corsWithOptions, (req, res) => {
    res.sendStatus(200);
  })
  .get(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    User.findById(req.user._id)
      .then(
        (user) => {
          if (user != null) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.json(user.recents);
          } else {
            err = new Error("User recents not found");
            err.status = 404;
            return next(err);
          }
        },
        (err) => next(err)
      )
      .catch((err) => next(err));
  })
  .post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    User.findById(req.user._id)
      // .populate("recents.recipes")
      .then(
        (user) => {
          if (user != null) {
            if (user.recents[req.body.category]) {
              Recipe.findById(req.body.id, (err, recipe) => {
                if (err) {
                  err = new Error(
                    "Recipe doesn't exist, hence it cannot be added to your recents "
                  );
                  err.status = 404;
                  return next(err);
                }
                if (recipe) {
                  if (!user.recents[req.body.category].includes(req.body.id)) {
                    user.recents[req.body.category] = [
                      ...user.recents[req.body.category],
                      req.body.id,
                    ];
                  }
                  user.save().then(
                    (user) => {
                      res.statusCode = 200;
                      res.setHeader("Content-Type", "application/json");
                      res.json(user.recents[req.body.category]);
                    },
                    (err) => next(err)
                  );
                }
              });
            } else {
              err = new Error(
                req.body.category + " is not a category in recents"
              );
              err.status = 404;
              return next(err);
            }
          } else {
            err = new Error("User recents not found");
            err.status = 404;
            return next(err);
          }
        },
        (err) => next(err)
      )
      .catch((err) => next(err));
  })
  .put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res.statusCode = 403;
    res.end("Put operation not supported on /users/recents/");
  })
  .delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    User.findById(req.user._id)
      .then((user) => {
        if (user != null) {
          if (user.recents[req.body.category]) {
            if (user.recents[req.body.category].includes(req.body.id)) {
              user.recents[req.body.category].splice(
                user.recents[req.body.category].indexOf(req.body.id),
                1
              );
            }
            user.save().then(
              (user) => {
                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.json(user.recents[req.body.category]);
              },
              (err) => next(err)
            );
          } else {
            err = new Error(
              req.body.category + " is not a category in recents"
            );
            err.status = 404;
            return next(err);
          }
        } else {
          err = new Error("Recents not found");
          err.status = 404;
          return next(err);
        }
      })
      .catch((err) => next(err));
  });

module.exports = userRouter;

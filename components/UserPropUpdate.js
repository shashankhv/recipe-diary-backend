const Recipe = require("../models/recipes");
const { populate } = require("../models/users");
const User = require("../models/users");
var mongoose = require("mongoose");

const UserPropUpdate = {
  getRecipesByProperty: (req, res, next, endpoint) => {
    User.findById(req.user._id)
      .populate({
        path: `${req.query.property}.${req.query.category}`,
      })
      .then(
        (user) => {
          if (user != null) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.json(user[req.query.property][req.query.category]);
          } else {
            err = new Error(`User not found`);
            err.status = 404;
            return next(err);
          }
        },
        (err) => next(err)
      )
      .catch((err) => next(err));
  },
  addRecipesToUser: (req, res, next, recipes) => {
    User.findById(req.user._id)
      // .populate("favorites.recipes")
      .then(
        (user) => {
          console.log(user);
          if (user != null) {
            if (user["published"]["recipes"]) {
              var tempArr = user["published"]["recipes"];
              tempArr = [...recipes, ...tempArr];
              console.log(tempArr);

              user["published"]["recipes"] = [...new Set(tempArr)];
              // console.log("user", user);

              user.save().then(
                (user) => {
                  res.statusCode = 200;
                  res.setHeader("Content-Type", "application/json");
                  res.json(user["published"]["recipes"]);
                },
                (err) => next(err)
              );
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

    return true;
  },
  addRecipeToUser: (req, res, next, endpoint) => {
    User.findById(req.user._id)
      // .populate("favorites.recipes")
      .then(
        (user) => {
          if (user != null) {
            if (req.body.category === "recipes") {
              if (user[req.body.property][req.body.category]) {
                Recipe.findById(req.body.id, (err, recipe) => {
                  if (err) {
                    err = new Error(
                      `Recipe doesn't exist, hence it cannot be added to your ${req.body.property}`
                    );
                    err.status = 404;
                    return next(err);
                  }
                  if (recipe) {
                    var tempArr = user[req.body.property][
                      req.body.category
                    ].map((e) => e._id.toString());
                    tempArr = [req.body.id, ...tempArr];
                    user[req.body.property][req.body.category] = [
                      ...new Set(tempArr),
                    ];

                    user.save().then(
                      (user) => {
                        if (endpoint === true) {
                          res.statusCode = 200;
                          res.setHeader("Content-Type", "application/json");
                          res.json(user[req.body.property][req.body.category]);
                        }
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

    return true;
  },
  deleteRecipesFromUser: (req, res, next, endpoint) => {
    User.findById(req.user._id)
      .then((user) => {
        if (user != null) {
          if (user[req.body.property][req.body.category]) {
            if (
              user[req.body.property][req.body.category].includes(req.body.id)
            ) {
              user[req.body.property][req.body.category].splice(
                user[req.body.property][req.body.category].indexOf(req.body.id),
                1
              );
            }
            user.save().then(
              (user) => {
                if (endpoint === true) {
                  res.statusCode = 200;
                  res.setHeader("Content-Type", "application/json");
                  res.json(user[req.body.property][req.body.category]);
                }
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
  },
};

module.exports = UserPropUpdate;

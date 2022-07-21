var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
const authenticate = require("../config/authenticate");
const cors = require("./cors");
const Recipe = require("../models/recipes");

var recipeRouter = express.Router();
recipeRouter.use(bodyParser.json());

/* api endpoint for /recipes */
recipeRouter
  .route("/")
  .options(cors.corsWithOptions, (req, res) => {
    res.sendStatus(200);
  })
  .get(cors.cors, (req, res, next) => {
    Recipe.find(req.query)
      .populate("author")
      .then(
        (recipes) => {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.json(recipes);
        },
        (err) => next(err)
      )
      .catch((err) => next(err));
  })
  .post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    req.body.author = req.user._id;
    Recipe.create(req.body)
      .then(
        (recipe) => {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.json(recipe);
        },
        (err) => next(err)
      )
      .catch((err) => next(err));
  })
  .put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res.statusCode = 403;
    res.end("PUT operation not supported on /recipes");
  })
  .delete(
    cors.corsWithOptions,
    authenticate.verifyUser,
    authenticate.verifyAdmin,
    (req, res, next) => {
      Recipe.remove({})
        .then((resp) => {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.json(resp);
        })
        .catch((err) => next(err));
    }
  );

/* api endpoint for /recipes/bulkUpload */
recipeRouter
  .route("/bulkUpload")
  .options(cors.corsWithOptions, (req, res) => {
    res.sendStatus(200);
  })
  .get(cors.cors, (req, res, next) => {
    res.statusCode = 403;
    res.end("GET operation not supported on /recipes/bulkUpload");
  })
  .post(
    cors.corsWithOptions,
    authenticate.verifyUser,
    authenticate.verifyAdmin,
    (req, res, next) => {
      req.body = req.body.map((recipe) => {
        return { ...recipe, author: req.user._id };
      });
      Recipe.insertMany(req.body)
        .then(
          (docs) => {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.json(docs);
          },
          (err) => next(err)
        )
        .catch((err) => next(err));
    }
  )
  .put(cors.corsWithOptions, (req, res, next) => {
    res.statusCode = 403;
    res.end("PUT operation not supported on /recipes/bulkUpload");
  })
  .delete(cors.corsWithOptions, (req, res, next) => {
    res.statusCode = 403;
    res.end("DELETE operation not supported on /recipes/bulkUpload");
  });

/* api endpoint for /recipes/recipeId  */

recipeRouter
  .route("/:recipeId")
  .options(cors.corsWithOptions, (req, res) => {
    res.sendStatus(200);
  })
  .get(cors.cors, (req, res, next) => {
    Recipe.findById(req.params.recipeId)
      .populate("author")
      .then(
        (recipe) => {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.json(recipe);
        },
        (err) => next(err)
      )
      .catch((err) => next(err));
  })
  .post(cors.corsWithOptions, (req, res, next) => {
    res.statusCode = 403;
    res.end("POST operation not supported on /recipes/" + req.params.recipeId);
  })
  .put(
    cors.corsWithOptions,
    authenticate.verifyUser,
    authenticate.verifyAdmin,
    (req, res, next) => {
      Recipe.findByIdAndUpdate(
        req.params.recipeId,
        {
          $set: req.body,
        },
        { new: true }
      )
        .then(
          (recipe) => {
            console.log("Dish Created ", recipe);
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.json(recipe);
          },
          (err) => next(err)
        )
        .catch((err) => next(err));
    }
  )
  .delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    console.log(req.user);
    Recipe.findById(req.params.recipeId)
      .then((recipe) => {
        console.log("RECIPES", recipe, res.user);
        if (recipe.author === req.user._id || req.user.admin) {
          Recipe.findByIdAndRemove(req.params.recipeId)
            .then((resp) => {
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.json(resp);
            })
            .catch((err) => next(err));
        } else {
          res.statusCode = 200;
          res.end("Only the author of this recipe can delete this recipe");
        }
      })
      .catch((err) => next(err));
  });

recipeRouter
  .route("/:recipeId/comments")
  .options(cors.corsWithOptions, (req, res) => {
    res.sendStatus(200);
  })
  .get(cors.cors, (req, res, next) => {
    Recipe.findById(req.params.recipeId)
      .populate("comments.author")
      .then(
        (recipe) => {
          if (recipe != null) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.json(recipe.comments);
          } else {
            err = new Error("Dish " + req.params.recipeId + " not found");
            err.status = 404;
            return next(err);
          }
        },
        (err) => next(err)
      )
      .catch((err) => next(err));
  })
  .post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Recipe.findById(req.params.recipeId)
      .populate("comments.author")
      .then(
        (recipe) => {
          if (recipe != null) {
            req.body.author = req.user._id;
            recipe.comments.unshift(req.body);
            recipe.save().then(
              (recipe) => {
                Recipe.findById(recipe._id)
                  .populate("comments.author")
                  .then((recipe) => {
                    res.statusCode = 200;
                    res.setHeader("Content-Type", "application/json");
                    res.json(recipe);
                  });
              },
              (err) => next(err)
            );
          } else {
            err = new Error("Dish " + req.params.recipeId + " not found");
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
    res.end(
      "Put operation not supported on /recipes/" +
        req.params.recipeId +
        "/comments"
    );
  })
  .delete(
    cors.corsWithOptions,
    authenticate.verifyUser,
    authenticate.verifyAdmin,
    (req, res, next) => {
      Recipe.findById(req.params.recipeId)
        .then((recipe) => {
          if (recipe != null) {
            // recipe.comments = [];
            for (var i = recipe.comments.length - 1; i >= 0; i--) {
              recipe.comments.id(recipe.comments[i]._id).remove();
            }
            recipe.save().then(
              (recipe) => {
                Recipe.findById(recipe._id)
                  .populate("comments.author")
                  .then((recipe) => {
                    res.statusCode = 200;
                    res.setHeader("Content-Type", "application/json");
                    res.json(recipe);
                  });
              },
              (err) => next(err)
            );
          } else {
            err = new Error("Dish " + req.params.recipeId + " not found");
            err.status = 404;
            return next(err);
          }
        })
        .catch((err) => next(err));
    }
  );

/* api endpoint for /recipes/recipeId  */

recipeRouter
  .route("/:recipeId/comments/:commentId")
  .options(cors.corsWithOptions, (req, res) => {
    res.sendStatus(200);
  })
  .get(cors.cors, (req, res, next) => {
    Recipe.findById(req.params.recipeId)
      .populate("comments.author")
      .then(
        (recipe) => {
          if (
            recipe != null &&
            recipe.comments.id(req.params.commentId) != null
          ) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.json(recipe.comments.id(req.params.commentId));
          } else if (recipe == null) {
            err = new Error("Dish " + req.params.recipeId + " not found");
            err.status = 404;
            return next(err);
          } else {
            err = new Error("Comment " + req.params.commentId + " not found");
            err.status = 404;
            return next(err);
          }
        },
        (err) => next(err)
      )
      .catch((err) => next(err));
  })
  .post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res.statusCode = 403;
    res.end(
      "POST operation not supported on /recipes/" +
        req.params.recipeId +
        "/comments/" +
        req.params.commentId
    );
  })
  .put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Recipe.findById(req.params.recipeId)
      .then(
        (recipe) => {
          if (
            recipe != null &&
            recipe.comments.id(req.params.commentId) != null
          ) {
            if (
              req.user._id.toString() ==
              recipe.comments.id(req.params.commentId).author._id.toString()
            ) {
              if (req.body.rating) {
                recipe.comments.id(req.params.commentId).rating =
                  req.body.rating;
              }
              if (req.body.comment) {
                recipe.comments.id(req.params.commentId).comment =
                  req.body.comment;
              }
              recipe.save().then((recipe) => {
                Recipe.findById(recipe._id)
                  .populate("comments.author")
                  .then((recipe) => {
                    res.statusCode = 200;
                    res.setHeader("Content-Type", "application/json");
                    res.json(recipe);
                  });
              });
            } else {
              res.statusCode = 403;
              res.end("You cannot edit a comment you didn't write yourself");
            }
          } else if (recipe == null) {
            err = new Error("Dish " + req.params.recipeId + " not found");
            err.status = 404;
            return next(err);
          } else {
            err = new Error("Comment " + req.params.commentId + " not found");
            err.status = 404;
            return next(err);
          }
        },
        (err) => next(err)
      )
      .catch((err) => next(err));
  })
  .delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Recipe.findById(req.params.recipeId)
      .then((recipe) => {
        if (
          recipe != null &&
          recipe.comments.id(req.params.commentId) != null
        ) {
          if (
            req.user._id.toString() ==
            recipe.comments.id(req.params.commentId).author._id.toString()
          ) {
            recipe.comments.id(req.params.commentId).remove();
            recipe.save().then(
              (recipe) => {
                Recipe.findById(recipe._id)
                  .populate("comments.author")
                  .then((recipe) => {
                    res.statusCode = 200;
                    res.setHeader("Content-Type", "application/json");
                    res.json(recipe);
                  });
              },
              (err) => next(err)
            );
          } else {
            res.statusCode = 403;
            res.end("You cannot delete a comment you didn't write yourself");
          }
        } else if (recipe == null) {
          err = new Error("Dish " + req.params.recipeId + " not found");
          err.status = 404;
          return next(err);
        } else {
          err = new Error("Comment " + req.params.commentId + " not found");
          err.status = 404;
          return next(err);
        }
      })
      .catch((err) => next(err));
  });

module.exports = recipeRouter;

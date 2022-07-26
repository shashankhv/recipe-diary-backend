var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
const authenticate = require("../config/authenticate");
const cors = require("./cors");
const Recipe = require("../models/recipes");
const Comment = require("../models/comments");
const ChildComment = require("../models/childComment");

const User = require("../models/users");

var recipeRouter = express.Router();
recipeRouter.use(bodyParser.json());

/* api endpoint for /recipes */
recipeRouter
  .route("/")
  .options(cors.corsWithOptions, (req, res) => {
    res.sendStatus(200);
  })
  .get(cors.cors, (req, res, next) => {
    console.log("GET", req.query);
    Recipe.find(req.query)
      // .sort({})
      .skip(req.query.offset)
      .limit(req.query.limit)
      .populate(["author", "comments"])
      .then(
        (recipes) => {
          console.log(recipes);
          Recipe.count().then(
            (count) => {
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.json({
                results: recipes,
                limit: Number(req.query.limit),
                nextOffset: Number(req.query.offset) + Number(req.query.limit),
                count,
              });
            },
            (err) => next(err)
          );
        },
        (err) => next(err)
      )
      .catch((err) => next(err));
  })
  .post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    req.body.author = req.user._id;
    req.body.featured = true;
    Recipe.create(req.body)
      .then(
        (recipe) => {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.json([recipe]);
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
        return {
          ...recipe,
          author: req.user._id,
          featured: Math.round(Math.random()) === 1 ? true : false,
        };
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
    Recipe.findById(req.params.recipeId)
      .then((recipe) => {
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
      .populate({
        path: "comments",
        populate: [
          {
            path: "author",
            model: "User",
          },
          {
            path: "children",
            populate: [
              {
                path: "author",
                model: "User",
              },
              {
                path: "replyAuthor",
                model: "User",
              },
            ],
          },
        ],
      })
      .then(
        (recipe) => {
          if (recipe != null) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.json(recipe.comments);
          } else {
            err = new Error("Recipe " + req.params.recipeId + " not found");
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
      // .populate(["author", "comments"])
      .then(
        (recipe) => {
          if (recipe != null) {
            if (req.body.parent === null) {
              delete req.body["parent"];
              delete req.body["replyAuthor"];
              req.body.author = req.user._id;
              req.body.children = [];
              Comment.create(req.body).then(
                (comment) => {
                  recipe.comments.push(comment._id);
                  recipe.save().then(
                    (recipe) => {
                      Recipe.findById(recipe._id)
                        // .populate(["comments", "author"])
                        .then((recipe) => {
                          res.statusCode = 200;
                          res.setHeader("Content-Type", "application/json");
                          res.json({ status: "success", recipe: recipe });
                        });
                    },
                    (err) => next(err)
                  );
                },
                (err) => next(err)
              );
            } else {
              Comment.findById(req.body.parent)
                .then((parentComment) => {
                  if (!parentComment) {
                    err = new Error(
                      "This comment cannot be asigned to another comment because the parent comment doesn't exist"
                    );
                    err.status = 404;
                    next(err);
                  } else {
                    req.body.author = req.user._id;
                    ChildComment.create(req.body)
                      .then((comment) => {
                        parentComment.children.push(comment._id);
                        parentComment.save().then(
                          (updatedComment) => {
                            Recipe.findById(recipe._id).then((recipe) => {
                              res.statusCode = 200;
                              res.setHeader("Content-Type", "application/json");
                              res.json({ status: "success", recipe: recipe });
                            });
                          },
                          (err) => next(err)
                        );
                      })
                      .catch((err) => next(err));
                  }
                })
                .catch((err) => next(err));
            }
          } else {
            err = new Error("Recipe " + req.params.recipeId + " not found");
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
                Recipe.findById(recipe._id).then((recipe) => {
                  res.statusCode = 200;
                  res.setHeader("Content-Type", "application/json");
                  res.json({ status: "Successful", recipe: recipe });
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
      .populate({
        path: "comments",
        populate: [
          {
            path: "author",
            model: "User",
          },
          {
            path: "children",
            populate: [
              {
                path: "author",
                model: "User",
              },
              {
                path: "replyAuthor",
                model: "User",
              },
            ],
          },
        ],
      })
      .then(
        (recipe) => {
          if (
            recipe != null &&
            recipe.comments.some((value) =>
              value._id.equals(req.params.commentId)
            )
          ) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");

            res.json(
              recipe.comments.filter(
                (comment) => comment._id.toString() === req.params.commentId
              )[0]
            );
          } else if (recipe != null && recipe.comments.length > 0) {
            for (var i = 0; i < recipe.comments.length; i++) {
              if (recipe.comments[i].children.length > 0) {
                if (
                  recipe.comments[i].children.some((value) =>
                    value._id.equals(req.params.commentId)
                  )
                ) {
                  res.statusCode = 200;
                  res.setHeader("Content-Type", "application/json");
                  return res.json(
                    recipe.comments[i].children.filter(
                      (comment) =>
                        comment._id.toString() === req.params.commentId
                    )[0]
                  );
                }
              }
            }
            err = new Error("Comment " + req.params.commentId + " not found");
            err.status = 404;
            return next(err);
          } else if (recipe == null) {
            err = new Error("Recipe " + req.params.recipeId + " not found");
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
      .populate({
        path: "comments",
        populate: [
          {
            path: "author",
            model: "User",
          },
          {
            path: "children",
            populate: [
              {
                path: "author",
                model: "User",
              },
              {
                path: "replyAuthor",
                model: "User",
              },
            ],
          },
        ],
      })
      .then(
        async (recipe) => {
          if (
            recipe != null &&
            recipe.comments.some((value) =>
              value._id.equals(req.params.commentId)
            )
          ) {
            Comment.findByIdAndUpdate(
              req.params.commentId,
              {
                $set: req.body,
              },
              { new: true }
            )
              .then((comment) => {
                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");

                res.json(comment);
              })
              .catch((err) => next(err));
          } else if (recipe != null && recipe.comments.length > 0) {
            for (var i = 0; i < recipe.comments.length; i++) {
              if (recipe.comments[i].children.length > 0) {
                if (
                  recipe.comments[i].children.some((value) =>
                    value._id.equals(req.params.commentId)
                  )
                ) {
                  await ChildComment.findByIdAndUpdate(
                    req.params.commentId,
                    {
                      $set: req.body,
                    },
                    { new: true }
                  )
                    .then((comment) => {
                      res.statusCode = 200;
                      res.setHeader("Content-Type", "application/json");
                      return res.json(comment);
                    })
                    .catch((err) => {
                      return next(err);
                    });
                }
              }
            }
            err = new Error("Comment " + req.params.commentId + " not found");
            err.status = 404;
            return next(err);
          } else if (recipe == null) {
            err = new Error("Recipe " + req.params.recipeId + " not found");
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
      .populate({
        path: "comments",
        populate: [
          {
            path: "author",
            model: "User",
          },
          {
            path: "children",
            populate: [
              {
                path: "author",
                model: "User",
              },
              {
                path: "replyAuthor",
                model: "User",
              },
            ],
          },
        ],
      })
      .then(async (recipe) => {
        if (
          recipe != null &&
          recipe.comments.some(
            (value) => value._id.toString() === req.params.commentId
          )
        ) {
          Comment.findById(req.params.commentId)
            .then((comment) => {
              if (
                recipe.author.equals(req.user._id.toString()) ||
                comment.author.equals(req.user._id.toString())
              ) {
                recipe.comments.splice(recipe.comments.indexOf(comment), 1);
                recipe
                  .save()
                  .then((recipe) => {
                    Recipe.findById(recipe._id)
                      .populate({
                        path: "comments",
                        populate: [
                          {
                            path: "author",
                            model: "User",
                          },
                          {
                            path: "children",
                            populate: [
                              {
                                path: "author",
                                model: "User",
                              },
                              {
                                path: "replyAuthor",
                                model: "User",
                              },
                            ],
                          },
                        ],
                      })
                      .then((recipe) => {
                        res.statusCode = 200;
                        res.setHeader("Content-Type", "application/json");
                        res.json(recipe);
                      })
                      .catch((err) => next(err));
                  })
                  .catch((err) => next(err));
              } else {
                res.statusCode = 403;
                res.end(
                  "You cannot delete a comment you didn't write yourself "
                );
              }
            })
            .catch((err) => next(err));
        } else if (recipe != null && recipe.comments.length > 0) {
          for (var i = 0; i < recipe.comments.length; i++) {
            if (recipe.comments[i].children.length > 0) {
              if (
                recipe.comments[i].children.some((value) =>
                  value._id.equals(req.params.commentId)
                )
              ) {
                for (var p = 0; p < recipe.comments[i].children.length; p++) {
                  if (
                    recipe.comments[i].children[p]._id.equals(
                      req.params.commentId
                    )
                  ) {
                    await Comment.findById(recipe.comments[i]._id)
                      .then(async (parentComment) => {
                        parentComment.children.splice(p, 1);
                        await parentComment
                          .save()
                          .then(async (comment) => {
                            await Recipe.findById(req.params.recipeId)
                              .populate({
                                path: "comments",
                                populate: [
                                  {
                                    path: "author",
                                    model: "User",
                                  },
                                  {
                                    path: "children",
                                    populate: [
                                      {
                                        path: "author",
                                        model: "User",
                                      },
                                      {
                                        path: "replyAuthor",
                                        model: "User",
                                      },
                                    ],
                                  },
                                ],
                              })
                              .then((updatedRecipe) => {
                                res.statusCode = 200;
                                res.setHeader(
                                  "Content-Type",
                                  "application/json"
                                );
                                return res.json(updatedRecipe);
                              })
                              .catch((err) => next(err));
                          })
                          .catch((err) => next(err));
                      })
                      .catch((err) => next(err));
                  }
                }
              }
            }
          }
          err = new Error("Comment " + req.params.commentId + " not found");
          err.status = 404;
          return next(err);
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

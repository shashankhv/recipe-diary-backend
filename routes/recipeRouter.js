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

/* api endpoint for /recipes */
recipeRouter
  .route("/")
  .options(cors.corsWithOptions, (req, res) => {
    res.sendStatus(200);
  })
  .get(cors.cors, (req, res, next) => {
    Recipe.find(req.query)
      .populate(["author", "comments"])
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
              console.log("POST", req.params.recipeId, req.body);
              Comment.create(req.body).then(
                (comment) => {
                  recipe.comments.push(comment._id);
                  recipe.save().then(
                    (recipe) => {
                      Recipe.findById(recipe._id)
                        .populate(["comments", "author"])
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
                                res.setHeader(
                                  "Content-Type",
                                  "application/json"
                                );
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

// commentRouter
//   .route("/:recipeId")
//   .options(cors.corsWithOptions, (req, res) => {
//     res.sendStatus(200);
//   })
//   .get(cors.cors, (req, res, next) => {
//     Comments.find(req.params.recipeId)
//       .populate(["author", "dish", "children"])
//       .then(
//         (comments) => {
//           res.statusCode = 200;
//           res.setHeader("Content-Type", "application/json");
//           res.json(comments);
//         },
//         (err) => next(err)
//       )
//       .catch((err) => next(err));
//   })
//   .post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
//     if (req.body != null) {
//       req.body.author = req.user._id;
//       Comments.create(req.body)
//         .then(
//           (comment) => {
//             Comments.findById(comment._id)
//               .populate("author")
//               .then((comment) => {
//                 res.statusCode = 200;
//                 res.setHeader("Content-Type", "application/json");
//                 res.json(comment);
//               });
//           },
//           (err) => next(err)
//         )
//         .catch((err) => next(err));
//     } else {
//       err = new Error("Comment not found in request body");
//       err.status = 404;
//       return next(err);
//     }
//   })
//   .put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
//     res.statusCode = 403;
//     res.end("PUT operation not supported on /comments/");
//   })
//   .delete(
//     cors.corsWithOptions,
//     authenticate.verifyUser,
//     authenticate.verifyAdmin,
//     (req, res, next) => {
//       Comments.remove({})
//         .then(
//           (resp) => {
//             res.statusCode = 200;
//             res.setHeader("Content-Type", "application/json");
//             res.json(resp);
//           },
//           (err) => next(err)
//         )
//         .catch((err) => next(err));
//     }
//   );

// commentRouter
//   .route("/:commentId")
//   .options(cors.corsWithOptions, (req, res) => {
//     res.sendStatus(200);
//   })
//   .get(cors.cors, (req, res, next) => {
//     Comments.findById(req.params.commentId)
//       .populate("author")
//       .then(
//         (comment) => {
//           res.statusCode = 200;
//           res.setHeader("Content-Type", "application/json");
//           res.json(comment);
//         },
//         (err) => next(err)
//       )
//       .catch((err) => next(err));
//   })
//   .post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
//     res.statusCode = 403;
//     res.end(
//       "POST operation not supported on /comments/" + req.params.commentId
//     );
//   })
//   .put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
//     Comments.findById(req.params.commentId)
//       .then(
//         (comment) => {
//           if (comment != null) {
//             if (!comment.author.equals(req.user._id)) {
//               var err = new Error(
//                 "You are not authorized to update this comment!"
//               );
//               err.status = 403;
//               return next(err);
//             }
//             req.body.author = req.user._id;
//             Comments.findByIdAndUpdate(
//               req.params.commentId,
//               {
//                 $set: req.body,
//               },
//               { new: true }
//             ).then(
//               (comment) => {
//                 Comments.findById(comment._id)
//                   .populate("author")
//                   .then((comment) => {
//                     res.statusCode = 200;
//                     res.setHeader("Content-Type", "application/json");
//                     res.json(comment);
//                   });
//               },
//               (err) => next(err)
//             );
//           } else {
//             err = new Error("Comment " + req.params.commentId + " not found");
//             err.status = 404;
//             return next(err);
//           }
//         },
//         (err) => next(err)
//       )
//       .catch((err) => next(err));
//   })
//   .delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
//     Comments.findById(req.params.commentId)
//       .then(
//         (comment) => {
//           if (comment != null) {
//             if (!comment.author.equals(req.user._id)) {
//               var err = new Error(
//                 "You are not authorized to delete this comment!"
//               );
//               err.status = 403;
//               return next(err);
//             }
//             Comments.findByIdAndRemove(req.params.commentId)
//               .then(
//                 (resp) => {
//                   res.statusCode = 200;
//                   res.setHeader("Content-Type", "application/json");
//                   res.json(resp);
//                 },
//                 (err) => next(err)
//               )
//               .catch((err) => next(err));
//           } else {
//             err = new Error("Comment " + req.params.commentId + " not found");
//             err.status = 404;
//             return next(err);
//           }
//         },
//         (err) => next(err)
//       )
//       .catch((err) => next(err));
//   });

// module.exports = commentRouter;

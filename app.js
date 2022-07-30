var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var session = require("express-session");
var FileStore = require("session-file-store")(session);
var passport = require("passport");
var authenticate = require("./config/authenticate");
var config = require("./config/config");
var mongoose = require("mongoose");
const schedule = require("node-schedule");
const Recipe = require("./models/recipes");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/userRouter");
var recipeRouter = require("./routes/recipeRouter");
var uploadRouter = require("./routes/uploadRouter");

const mongoUrl = config.mongoUrl;
const connect = mongoose.connect(mongoUrl, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  autoIndex: true, //make this also true
});

const updateFeatured = (count) => {
  console.log("updateFeatured");
  if (count < 5) {
    count = count + 1;
    Recipe.updateMany({ featured: true }, { $set: { featured: false } })
      .then((docs) => {
        Recipe.find({}).then((recipes) => {
          var numberOfRecipes = recipes.length;
          for (var i = 0; i < 9; i++) {
            var index = Math.floor(Math.random() * numberOfRecipes);

            Recipe.findByIdAndUpdate(
              recipes[index]._id,
              {
                $set: { featured: true },
              },
              { new: true }
            )
              .then((recipe) => {})
              .catch((err) => updateFeatured(count));
          }
        });
      })
      .catch((err) => updateFeatured(count));
  }
};
const rule = new schedule.RecurrenceRule();
rule.second = 50;
rule.tz = "Etc/UTC";

connect
  .then((db) => {
    console.log("Connected correctly to server");
    schedule.scheduleJob(rule, () => {
      var count = 0;
      updateFeatured(count);
    });
  })
  .catch((err) => console.log("Error", err));

var app = express();

// middleware to redirect to secureServer
app.all("*", (req, res, next) => {
  if (req.secure) {
    return next();
  } else {
    // redirecting to secure server
    res.redirect(
      307,
      "https://" + req.hostname + ":" + app.get("secPort") + req.url
    );
  }
});
// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(passport.initialize());
// app.use(passport.session());
app.use(express.static(path.join(__dirname, "public")));
const urlPathsForImages = [
  { path: "/images/recipes", location: "recipes" },
  { path: "/images/users", location: "users" },
];

urlPathsForImages.map((urlPath) => {
  app.use(
    urlPath.path,
    express.static(path.join(__dirname, `public/images/${urlPath.location}`))
  );
});
// app.use(
//   "/images/recipes",
//   express.static(path.join(__dirname, "public/images/recipes"))
// );

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/recipes", recipeRouter);
app.use("/uploads", uploadRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;

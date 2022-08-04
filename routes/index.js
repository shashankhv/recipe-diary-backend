var express = require("express");
var cors = require("./cors");
const bodyParser = require("body-parser");

var indexRouter = express.Router();
indexRouter.use(bodyParser.json());

indexRouter.options("*", cors.corsWithOptions, (req, res) => {
  res.sendStatus(200);
});
/* GET home page. */
indexRouter.get("/", function (req, res, next) {
  res.render("index", { title: "Express" });
});

indexRouter.get("/checkConnection", cors.corsWithOptions, (req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.json({ serverRunning: true });
});

module.exports = indexRouter;

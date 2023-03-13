const express = require("express");
const cors = require("cors");
const app = express();

const whitelist = [
  "http://localhost:3000",
  "https://localhost:3443",
  "https://localhost:3001",
  "http://localhost:3001",
  "http://localhost:3002",
  "https://eliterudy.github.io/recipe-diary-frontend",
  "https://eliterudy.github.io/recipe-diary-frontend/"
];

var corsOptionsDelegate = (req, callback) => {
  var corsOptions;
  if (whitelist.indexOf(req.header("Origin")) !== -1) {
    // if (true) {
    corsOptions = {
      origin: true,
    };
  } else {
    corsOptions = {
      origin: true,
    };
  }
  callback(null, corsOptions);
};

exports.cors = cors();
exports.corsWithOptions = cors(corsOptionsDelegate);

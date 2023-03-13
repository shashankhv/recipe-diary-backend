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
  "https://gavin97dmello.github.io/recipe-diary-frontend/",
  "https://build-my-stack.github.io",
  "https://gavindmello97.github.io",
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
      origin: false,
    };
  }
  callback(null, corsOptions);
};

exports.cors = cors();
exports.corsWithOptions = cors(corsOptionsDelegate);

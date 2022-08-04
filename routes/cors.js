const express = require("express");
const cors = require("cors");
const app = express();

const whitelist = [
  "https://localhost:3000",
  "https://localhost:3443",
  "https://localhost:3001",
  "http://localhost:3001",
  "http://localhost:3002",
];

var corsOptionsDelegate = (req, callback) => {
  var corsOptions;
  // if (whitelist.indexOf(req.header("Origin")) !== -1) {
  if (true) {
    corsOptions = {
      origin: false,
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

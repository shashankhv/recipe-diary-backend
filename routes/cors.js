const cors = require("cors");

const whitelist = [
  "http://localhost:5173",
  "https://localhost:5173",
  // add production frontend URL too if needed
  "https://shashankhv.github.io/recipe-diary-frontend/"
];

const corsOptionsDelegate = function (req, callback) {
  const origin = req.header("Origin");
  let corsOptions;

  if (whitelist.includes(origin)) {
    corsOptions = {
      origin: true, // reflects request origin
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    };
  } else {
    corsOptions = { origin: false }; // deny others
  }

  callback(null, corsOptions);
};

module.exports = {
  cors: cors(),
  corsWithOptions: cors(corsOptionsDelegate),
};
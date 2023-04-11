var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var passportLocalMongoose = require("passport-local-mongoose");

var userFavorites = new Schema({
  recipes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recipe",
    },
  ],
});

var userRecents = new Schema({
  recipes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recipe",
    },
  ],
});

var userSchema = new Schema({
  firstname: {
    type: String,
    default: "",
  },
  lastname: {
    type: String,
    default: "",
  },
  email: {
    type: String,
    default: "",
  },
  fullname: {
    type: String,
    default: "",
  },
  facebookId: String,
  admin: {
    type: Boolean,
    default: false,
  },
  favorites: {
    recipes: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Recipe" }],
      default: [],
    },
  },
  published: {
    recipes: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Recipe" }],
      default: [],
    },
  },
  recents: {
    recipes: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Recipe" }],
      default: [],
    },
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
});

// adds support for username and password from passport-local-mongoose package
userSchema.plugin(passportLocalMongoose);

var Users = mongoose.model("User", userSchema);
module.exports = Users;

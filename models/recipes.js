const mongoose = require("mongoose");
const Schema = mongoose.Schema;

var recipeSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
    },
    ingredients: {
      type: [String],
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    totalTimeInMins: {
      type: Number,
      required: true,
    },
    cuisine: {
      type: String,
      required: true,
    },
    course: {
      type: String,
      required: true,
    },
    diet: {
      type: String,
      required: true,
    },
    instructions: {
      type: [String],
      required: true,
    },
    prepTimeInMins: {
      type: Number,
      required: true,
    },
    cookTimeInMins: {
      type: Number,
      required: true,
    },
    servings: {
      type: Number,
      required: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
  },
  {
    timestamps: true,
  }
);

var Recipes = mongoose.model("Recipe", recipeSchema);

module.exports = Recipes;

const mongoose = require("mongoose");
const Schema = mongoose.Schema;
var childCommentSchema = new Schema(
  {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" },
    replyAuthor: { type: mongoose.Schema.Types.ObjectId, ref: "User" } | null,
  },
  {
    timestamps: true,
  }
);
var ChildComment = mongoose.model("ChildComment", childCommentSchema);
module.exports = ChildComment;

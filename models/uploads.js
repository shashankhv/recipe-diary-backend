var mongoose = require("mongoose");

var imageSchema = new mongoose.Schema({
  data: Buffer,
  contentType: String,
});

//Image is a model which has a schema imageSchema
var Images = new mongoose.model("Image", imageSchema);

module.exports = Images;

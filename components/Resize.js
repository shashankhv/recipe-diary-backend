const sharp = require("sharp");
const { v4 } = require("uuid");
const path = require("path");

class Resize {
  constructor(folder, type) {
    this.folder = folder;
    this.fileExt = type;
  }

  filepath = (filename) => {
    return path.resolve(`${this.folder}/${filename}`);
  };
  save = async (buffer) => {
    console.log(this.folder, this.fileExt);
    const filename = `${v4()}.${this.fileExt}`;
    const filepath = this.filepath(filename);

    await sharp(buffer)
      .flatten({ background: "#F0A703" })
      .resize(1080, 720, {
        fit: sharp.fit.inside,
        withoutEnlargement: false,
      })

      .toFile(filepath);

    return filename;
  };
}
module.exports = Resize;

const Mongoose = require("mongoose");
const Schema = Mongoose.Schema;

const ReplySchema = Schema({
  creator: { type: Schema.Types.ObjectId, ref: "user" },
  content: String,
});

module.exports = Mongoose.model("reply", ReplySchema);

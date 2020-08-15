const Mongoose = require("mongoose");
const Schema = Mongoose.Schema;

const TweetSchema = Schema({
  creator: { type: Schema.Types.ObjectId, ref: "user" },
  likes: { type: Schema.Types.ObjectId, ref: "reaction" },
  replies: [{ type: Schema.Types.ObjectId, ref: "reply" }],
  retweets: [{ type: Schema.Types.ObjectId, ref: "retweet" }],
  date: Date,
  content: String,
});

module.exports = Mongoose.model("tweet", TweetSchema);

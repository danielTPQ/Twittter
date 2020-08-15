const Tweet = require("../models/tweet.model");
const Reply = require("../models/reply.model");
const Like = require("../models/like.model");
const Retweet = require("../models/retweet.model");

const addTweet = async (user, args) => {
  try {
    let newTweet = new Tweet();
    let likes = new Like();
    newTweet.creator = user.sub;
    newTweet.date = new Date();
    newTweet.content = args[0];

    const likeSaved = await likes.save();
    if (!likeSaved) {
      return {
        message:
          "Error, este tweet no tiene un objeto de interacción para guardar sus me gusta",
      };
    } else {
      newTweet.likes = likeSaved._id;
      const newTweetAdded = await (await newTweet.save())
        .populate("creator", "-password -following -followers -name -email")
        .populate("likes", "-_id -interactors")
        .execPopulate();
      if (!newTweetAdded) return { message: "Error al agregar un nuevo tweet" };
      else {
        return newTweetAdded;
      }
    }
  } catch (err) {
    console.log(err);
    return { message: "Error general" };
  }
};

const switchUpdateDelete = async (user, args, operation) => {
  try {
    let resultTweet;
    let tweetFound;
    if (operation === 0) tweetFound = await Tweet.findById(args[1]);
    else tweetFound = await Tweet.findById(args[0]);

    if (!tweetFound)
      return {
        message: "El tweet con esa identificación no existe",
      };
    else {
      if (String(user.sub) !== String(tweetFound.creator)) {
        return { message: "Lo siento, no puedes administrar este tweet" };
      } else {
        if (operation === 0) {
          resultTweet = await Tweet.findByIdAndUpdate(
            args[1],
            { content: args[0] },
            { new: true }
          );
        } else {
          const deleteLikes = await Like.findByIdAndRemove(tweetFound.likes);
          resultTweet = await Tweet.findByIdAndRemove(args[0]);
        }
        if (!resultTweet)
          return { message: "Ocurrio un error, intente de nuevo" };
        else {
          if (operation === 0) return resultTweet;
          else return { message: "Tweet eliminado" };
        }
      }
    }
  } catch (err) {
    console.log(err);
    return { message: "Error general" };
  }
};

const doLike = async (id, userId) => {
  try {
    const liked = await Like.findOneAndUpdate(
      { _id: id },
      { $push: { likers: userId }, $inc: { likes: 1 } }
    );
    if (!liked)
      return { message: "Error al intentar dar me gusta a este tweet" };
    else return { message: "Te gusta este tweet" };
  } catch (err) {
    console.log(err);
    return { message: "Error general" };
  }
};

const dislike = async (id, userId) => {
  try {
    const disliked = await Like.findOneAndUpdate(
      { _id: id },
      { $pull: { likers: userId }, $inc: { likes: -1 } }
    );
    if (!disliked)
      return { message: "Error al intentar quitar el me gusta de este tweet" };
    else return { message: "Ya no te gusta este tweet" };
  } catch (err) {
    console.log(err);
    return { message: "Error general" };
  }
};

const like = async (user, args) => {
  try {
    const tweet = await Tweet.findById(args[0]);
    if (!tweet) return { message: "Lo siento, este tweet no existe" };
    else {
      const previusLikes = await Like.findOne({
        $and: [{ _id: tweet.likes }, { likers: { _id: user.sub } }],
      });
      if (!previusLikes) {
        const toLike = await Like.findById(tweet.likes);
        return await doLike(toLike._id, user.sub);
      } else return await dislike(previusLikes._id, user.sub);
    }
  } catch (err) {
    console.log(err);
    return { message: "Error general" };
  }
};

const makeReply = async (user, args) => {
  try {
    const newReply = new Reply();
    const tweetFound = await Tweet.findById(args[1]);
    if (!tweetFound) return { message: "Lo siento, este tweet no existe" };
    else {
      newReply.creator = user.sub;
      newReply.content = args[0];
      const newReplyAdded = await newReply.save();
      if (!newReplyAdded)
        return {
          message: "Error no se pudo guardar la respuesta",
        };
      else {
        const addReply = await Tweet.findByIdAndUpdate(
          tweetFound._id,
          {
            $push: { replies: newReplyAdded._id },
          },
          { new: true }
        )
          .populate(
            "creator",
            "-_id -password -following -followers -name -email"
          )
          .populate("likes", "-_id -interactors")
          .populate([
            {
              path: "replies",
              select: "-_id",
              populate: {
                path: "creator",
                select: "-_id -password -following -followers -name -email",
              },
            },
          ])
          .populate([
            {
              path: "retweets",
              select: "comment",
              populate: {
                path: "creator",
                select: "-_id -password -following -followers -name -email",
              },
            },
          ]);

        return !addReply ? { message: "Respuesta no agregada" } : addReply;
      }
    }
  } catch (err) {
    console.log(err);
    return { message: "Error general" };
  }
};

const retweet = async (user, args) => {
  try {
    const tweetExists = await Tweet.findById(args[1]);
    if (!tweetExists) return { message: "Este tweet no existe" };
    else {
      const newRetweet = new Retweet();
      newRetweet.creator = user.sub;

      if (args[0] !== "") newRetweet.title = args[0];

      const retweetAdded = await newRetweet.save();
      if (!retweetAdded) return { message: "Retweet no agregado" };
      else {
        const updateTweet = await Tweet.findByIdAndUpdate(
          tweetExists._id,
          {
            $push: { retweets: retweetAdded._id },
          },
          { new: true }
        )
          .populate("creator", "username")
          .populate("likes", "-_id -interactors")
          .populate([
            {
              path: "replies",
              select: "-_id",
              populate: {
                path: "creator",
                select: "-_id -password -following -followers -name -email",
              },
            },
          ])
          .populate([
            {
              path: "retweets",
              select: "-_id",
              populate: {
                path: "creator",
                select: "-_id -password -following -followers -name -email",
              },
            },
          ]);

        return !updateTweet
          ? { message: "No se puede guardar el retweet" }
          : updateTweet;
      }
    }
  } catch (err) {
    console.log(err);
    return { message: "Error general" };
  }
};

module.exports = {
  addTweet,
  switchUpdateDelete,
  like,
  makeReply,
  retweet,
};

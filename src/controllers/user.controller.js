const jwt = require("../services/jwt");
const User = require("../models/user.model");
const Tweet = require("../models/tweet.model");
const bcrypt = require("bcrypt");

const signUp = async (args) => {
  const user = User();
  try {
    let userExists = await User.findOne({
      $or: [{ email: args[1] }, { username: args[2] }],
    });
    if (userExists) return { message: "Este usuario ya existe" };
    else {
      user.name = args[0];
      user.email = args[1];
      user.username = args[2];
      const password = await generatePassword(args[3]);
      if (!password) return { message: "Error al crear la contraseña" };
      else {
        user.password = password;
        let accountCreated = await user.save();
        if (!accountCreated) return { message: "Error al crear la cuenta" };
        else {
          return accountCreated;
        }
      }
    }
  } catch (err) {
    console.log(err);
    return { message: "Error general" };
  }
};

const signIn = async (args) => {
  try {
    const userFound = await User.findOne({
      $or: [{ username: args[0] }, { email: args[0] }],
    });

    if (!userFound)
      return {
        message: "Nombre de usuario o correo electrónico  incorrecto",
      };
    else {
      const correctPassword = await bcrypt.compare(args[1], userFound.password);
      if (!correctPassword) return { message: "Contraseña incorrecta" };
      else {
        return { token: jwt.createToken(userFound) };
      }
    }
  } catch (err) {
    console.log(err);
    return { message: "Error general" };
  }
};

const followUser = async (user, args) => {
  try {
    const toFollow = await User.findOne({ username: args[0] });
    if (!toFollow)
      return { message: "El usuario con ese nombre de usuario no existe" };
    else {
      const alreadyFollowed = await User.findOne({
        $and: [{ _id: user.sub }, { following: { _id: toFollow._id } }],
      });
      if (alreadyFollowed) return { message: `Ya sigues ${toFollow.username}` };
      else {
        const addFollowing = await User.findByIdAndUpdate(
          user.sub,
          { $push: { following: toFollow } },
          { new: true }
        )
          .select("username")
          .populate(
            "following",
            "-password -following -followers -name -email"
          );
        const addFollower = await User.findByIdAndUpdate(toFollow._id, {
          $push: { followers: user.sub },
        });
        if (addFollowing && addFollower) {
          return addFollowing;
        } else {
          return { message: `Error al intentar seguir ${toFollow.username}` };
        }
      }
    }
  } catch (err) {
    console.log(err);
    return { message: "Error general" };
  }
};

const unfollowUser = async (user, args) => {
  try {
    const toUnFollow = await User.findOne({ username: args[0] });
    if (!toUnFollow)
      return { message: "El usuario con ese nombre de usuario no existe" };
    else {
      const following = await User.findOne({
        $and: [{ _id: user.sub }, { following: { _id: toUnFollow._id } }],
      });
      if (!following)
        return { message: `No estas siguiendo ${toUnFollow.username}` };
      else {
        const stopFollowing = await User.findByIdAndUpdate(
          user.sub,
          { $pull: { following: toUnFollow._id } },
          { new: true }
        )
          .populate("following", "-following -password -followers -name -email")
          .select("username");

        const removeFollower = await User.findByIdAndUpdate(toUnFollow._id, {
          $pull: { followers: user.sub },
        });

        if (stopFollowing && removeFollower) {
          return stopFollowing;
        } else {
          return {
            message: `Error al intentar dejar de seguir a ${toUnFollow.username}`,
          };
        }
      }
    }
  } catch (err) {
    console.log(typeof err);
    return { message: "Error general" };
  }
};

const profile = async (args) => {
  try {
    const profile = await User.findOne({ username: args[0] })
      .select("_id username following followers")
      .populate("following", "-_id -name -email -password -folloing -followers")
      .populate(
        "followers",
        "-_id -name -email -password -folloing -followers -following"
      );
    if (!profile)
      return {
        message:
          "No se puede obtener el perfil de ese usuario, verifique el nombre de usuario",
      };
    else return profile;
  } catch (err) {
    console.log(err);
    return { message: "Error general" };
  }
};

const viewTweets = async (args) => {
  try {
    if (args[0] === "all") {
      const allTweets = await Tweet.find({})
        .populate("creator", "-password -following -followers -name -email")
        .populate("likes", "-_id -interactors")
        .populate("replies", "-_id");
      if (!allTweets) return { message: "No puedo recibir tweets" };
      else return allTweets;
    } else {
      const userFound = await User.findOne({ username: args[0] });
      if (!userFound)
        return { message: "El usuario con ese nombre de usuario no existe" };
      else {
        const tweets = await Tweet.find({ creator: userFound._id })
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

        if (!tweets) return { message: "No puedo recibir tweets" };
        else if (tweets.length === 0)
          return { message: `${userFound.username} Aun no tienes tweets` };
        else return tweets;
      }
    }
  } catch (err) {
    console.log(err);
    return { message: "Error general" };
  }
};

const generatePassword = async (password) => {
  return await new Promise((res, rej) => {
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) rej(err);
      res(hash);
    });
  });
};

module.exports = {
  signUp,
  signIn,
  followUser,
  unfollowUser,
  profile,
  viewTweets,
};

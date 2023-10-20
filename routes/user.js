const express = require("express");
const router = express.Router();
const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary").v2;
const convertToBase64 = require("../utils/convertToBase64");

const uid2 = require("uid2"); // Package qui sert à créer des string aléatoires
const SHA256 = require("crypto-js/sha256"); // Sert à encripter une string
const encBase64 = require("crypto-js/enc-base64"); // Sert à transformer l'encryptage en string

const User = require("../models/User");

router.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/user/signup", fileUpload(), async (req, res) => {
  try {
    const { username, email, password, newsletter } = req.body;

    if (!username) {
      return res.status(400).json({ message: "Missing parameter" });
    }

    const userAlreadyInDb = await User.findOne({ email: email });

    if (userAlreadyInDb) {
      return res.status(409).json({ message: "This email is already used" });
    }

    const token = uid2(64);
    const salt = uid2(16);
    const hash = SHA256(password + salt).toString(encBase64);

    const transformedPicture = convertToBase64(req.files.avatar);
    const avatar = await cloudinary.uploader.upload(transformedPicture);

    const user = await User.create({
      email,
      account: { username, avatar },
      newsletter,
      token,
      salt,
      hash,
    });

    res.json({ id: user._id, account: user.account, token: user.token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/user/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const newHash = SHA256(password + user.salt).toString(encBase64);

    if (newHash !== user.hash) {
      return res.status(401).json({ message: "Bad hash" });
    }

    res.json({
      _id: user._id,
      token: user.token,
      account: user.account,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

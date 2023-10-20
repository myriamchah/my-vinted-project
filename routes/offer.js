const express = require("express");
const router = express.Router();
const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary").v2;
const convertToBase64 = require("../utils/convertToBase64");
const isAuthenticated = require("../middlewares/isAuthenticated");

const Offer = require("../models/Offer");

router.get("/offers", async (req, res) => {
  try {
    const { title, min, max, sort, page } = req.query;
    const order = sort ? sort.replace("price-", "") : "asc";
    const toSkip = Math.abs(page - 1);

    let q = {};
    if (title) q.product_name = new RegExp(title, "i");
    if (min) q.product_price.$gte = min;
    if (max) q.product_price.$lte = max;

    const offers = await Offer.find(q)
      .sort({ product_price: order })
      .skip(toSkip * 20)
      .limit(20);

    const count = await Offer.countDocuments(q);

    res.json({ count: count, offers: offers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/offers/:id", async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate(
      "owner",
      "account _id"
    );

    res.json(offer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post(
  "/offers/publish",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      const { title, description, price, ...details } = req.body;

      const newOffer = await Offer.create({
        product_name: title,
        product_description: description,
        product_price: price,
        product_details: [details],
        owner: req.user,
      });

      const transformedPicture = convertToBase64(req.files.pic);
      const resultPicture = await cloudinary.uploader.upload(
        transformedPicture,
        { folder: `vinted/offers/${newOffer._id}` }
      );

      newOffer.product_image = resultPicture;
      await newOffer.save();

      res.status(200).json(newOffer);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.put("/offers/:id", async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    const { title, description, price, ...details } = req.body;

    if (title) offer.product_name = title;
    if (description) offer.product_description = description;
    if (price) offer.product_price = price;
    if (details) offer.product_details = details;

    await offer.save();
    res.status(200).json(offer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/offers/:id", async (req, res) => {
  try {
    await Offer.findByIdAndDelete(req.params.id);
    res.status(200).json({
      message: "Offer successfully deleted",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

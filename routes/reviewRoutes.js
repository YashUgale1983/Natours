const reviewController = require("./../controllers/reviewController");
const express = require("express");
const authController = require("./../controllers/authController");

const router = express.Router({ mergeParams: true }); // ---> mergeParams allows access to params from parent route

router
  .route("/")
  .get(authController.protect, reviewController.getAllReviews)
  .post(
    authController.protect,
    authController.restrictTo("user"),
    reviewController.createReview
  );

router
  .route("/:id")
  .get(authController.protect, reviewController.getReview)
  .delete(
    authController.protect,
    authController.restrictTo("user", "admin"),
    reviewController.deleteReview
  )
  .patch(
    authController.protect,
    authController.restrictTo("user", "admin"),
    reviewController.updateReview
  );

module.exports = router;

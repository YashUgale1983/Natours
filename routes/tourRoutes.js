// requiring dependencies
const express = require("express");
const tourController = require("./../controllers/tourController");
const router = express.Router();
const authController = require("./../controllers/authController");
// const reviewController = require("./../controllers/reviewController");
const reviewRouter = require("./reviewRoutes");

router.use("/:tourId/reviews", reviewRouter);

// route requests
router
  .route("/top-5-best&cheap")
  .get(tourController.aliasTopTours, tourController.getAllTours); //aliasTopTours is a middleware function in tourController.js

router.route("/tour-stats").get(tourController.getTourStats);

router
  .route("/monthly-plan/:year")
  .get(
    authController.protect,
    authController.restrictTo("admin", "lead-guide", "guide"),
    tourController.getMonthlyPlan
  );

router
  .route("/tours-within/:distance/center/:latlng/unit/:unit")
  .get(tourController.getToursWithin);

router.route("/distances/:latlng/unit/:unit").get(tourController.getDistances);

router
  .route("/")
  .get(tourController.getAllTours) //here, authController.protect checks if the user is logged in.
  .post(
    authController.protect,
    authController.restrictTo("admin", "lead-guide"),
    tourController.createTour
  );

router
  .route("/:id")
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo("admin", "lead-guide"),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo("admin", "lead-guide"),
    tourController.deleteTour
  );

// exporting module
module.exports = router;

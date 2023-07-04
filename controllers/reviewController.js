const AppError = require("../utils/appError");
const Review = require("./../models/reviewModel");
const catchAsync = require("./../utils/catchAsync");
const factory = require("./handlerFactory");

exports.createReview = catchAsync(async (req, res, next) => {
  // this nested routing allows user to specify tour. If not specified, tour is taken from the params
  //and user is taken from the user document from protect middleware
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;

  // this helps us to restrict the user from posting only one review on one tour
  const exists = await Review.findOne({
    user: req.body.user,
    tour: req.body.tour,
  });

  if (exists) {
    return next(
      new AppError("User has already posted a review on this...", 409)
    );
  }
  // another way to perform the same work is to write the below given code in reviewModel.js
  // reviewSchema.index({ user: 1, tour: 1 }, { unique: true });

  const newReview = await Review.create(req.body);

  res.status(201).json({
    status: "success",
    data: {
      review: newReview,
    },
  });
});

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);

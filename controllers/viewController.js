const tour = require("../models/tourModel");
const Booking = require("../models/bookingModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.getOverview = catchAsync(async (req, res, next) => {
  // 1) Get tour data from collection
  const tours = await tour.find();

  // 2) Build template
  // 3) Render that template using tour data from 1)
  res.status(200).render("overview", {
    title: "All tours",
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // 1) Get the data for the requested tour
  const reqTour = await tour.findOne({ slug: req.params.slug }).populate({
    path: "reviews",
    field: "review rating user",
  });

  if (!reqTour) return next(new AppError("No tour found with that name!", 404));

  res.status(200).render("tour", {
    title: `${reqTour.name} Tour`,
    reqTour,
  });
});

exports.getLoginForm = (req, res) => {
  res.status(200).render("login", {
    title: "Log into your account",
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render("account", {
    title: "Your account",
  });
};

exports.getForgotPasswordForm = (req, res) => {
  res.status(200).render("forgotpassword", {
    title: "Forgot password",
  });
};

exports.getResetPasswordForm = (req, res) => {
  res.status(200).render("resetpassword", {
    title: "Reset password",
  });
};

exports.getSignupForm = (req, res) => {
  res.status(200).render("signup", {
    title: "Sign up",
  });
};

exports.getFullSignUpForm = (req, res) => {
  res.status(200).render("signupForm", {
    title: "Sign up Form",
  });
};

exports.getMyTours = catchAsync(async (req, res) => {
  // 1) Find all bookings
  const bookings = await Booking.find({
    user: req.user.id,
  });
  // 2) Find tours with the returned id
  const tourIds = bookings.map((el) => el.tour);
  const tours = await tour.find({ _id: { $in: tourIds } });

  res.status(200).render("overview", {
    title: "My tours",
    tours,
  });
});

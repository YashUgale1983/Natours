const express = require("express");
const router = express.Router();
const viewController = require("./../controllers/viewController");
const authController = require("./../controllers/authController");
const bookingController = require("./../controllers/bookingController");

// Routes for getting the Pug template --->

// 1) Overview pug
router.get("/", authController.isLoggedIn, viewController.getOverview);

// 2) Tour pug
router.get("/tour/:slug", authController.isLoggedIn, viewController.getTour);

// 3) Login pug
router.get("/login", authController.isLoggedIn, viewController.getLoginForm);

// 4) Account pug
router.get("/me", authController.protect, viewController.getAccount);

// 5) Forgot password pug
router.get("/forgotpassword", viewController.getForgotPasswordForm);

// 6) Reset password pug
router.get("/resetpassword/:token", viewController.getResetPasswordForm);

// 7) Sign up pug
router.get("/signup-email", viewController.getSignupForm);

// 8) Sign up form pug
router.get("/signupForm", viewController.getFullSignUpForm);

// 9) My tours pug
router.get("/my-tours", authController.protect, viewController.getMyTours);

module.exports = router;

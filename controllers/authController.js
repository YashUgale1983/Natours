const User = require("./../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const AppError = require("./../utils/appError");
const { appendFile } = require("fs");
const Email = require("./../utils/email");
const crypto = require("crypto");
const { log } = require("console");
const redisClient = require("./../redis");
const redisGetAsync = promisify(redisClient.get).bind(redisClient); // promisifying redisclient.get method

// signToken function generates a token according to the payload
// which is set by the ID parameter
const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// this is used to create a token and send it. this function is used when logging in, sign up, update password, reset password, etc.
const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    //secure: true, // this ensures that cookie is sent on an encrypted connection i.e. https
    httpOnly: true, // this ensures that cookie is not accessed or modified by the browser
  };

  if (req.secure) {
    cookieOptions.secure = true;
  }
  res.cookie("jwt", token, cookieOptions);

  user.password = undefined; // ---> to remove password from the output

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const username = req.body.username;
  const password = req.body.password;
  const passwordConfirm = req.body.passwordConfirm;
  const otp = req.body.otp;
  const enteredOtpHashed = crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");
  const systemOtp = await redisGetAsync(username + ":hashedOTP");
  const systemEmail = await redisGetAsync(username + ":email");

  if (enteredOtpHashed === systemOtp) {
    const newUser = await User.create({
      name: username,
      password: password,
      passwordConfirm: passwordConfirm,
      email: systemEmail,
    });
    const url = `${req.protocol}://${req.get("host")}/me`;
    await new Email(newUser, url).sendWelcome();
    createSendToken(newUser, 201, req, res);
  } else {
    res
      .status(400)
      .json({ message: "Invalid OTP or email verification failed" });
  }
});

exports.sendOTP = catchAsync(async (req, res, next) => {
  const name = req.body.name;
  const email = req.body.email;
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a random number between 1000 and 9999
  const dummyUser = {
    name,
    email,
  }; // we could have directly sent the name and email but creating a dummyuser to maintain email structure
  await new Email(dummyUser, otp).sendOTP();
  const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

  await redisClient.set(name + ":email", email, "EX", 900);
  await redisClient.set(name + ":hashedOTP", hashedOTP, "EX", 900);

  res.status(201).json({
    status: "success",
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  //1 check if password and email are entered
  if (!email || !password) {
    return next(new AppError("Please enter email and password", 400));
  }

  //2 check if user exists and the password is correct

  // here, we find the user with the entered email
  const user = await User.findOne({ email }).select("+password");

  // check if user exists. If yes, compare the entered password with the user password
  if (!user || !(await user.passwordCheck(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  //3 if everything is correct, send the token to the client
  createSendToken(user, 200, req, res);
});

// here, we implement a middleware function to log out a user
exports.logout = (req, res) => {
  res.clearCookie("jwt", { httpOnly: true });

  res.status(200).json({
    status: "success",
  });
};

// here, we implement a middleware function to check if the user is
// logged in before accessing 'getAllTours'
exports.protect = catchAsync(async (req, res, next) => {
  //1 getting token and checking if it's there
  let token;
  // here, we check if the 'authorization' header is present and contains required info
  // the format for authorization header is "Bearer 'token'"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError("Please login to get access...", 401));
  }

  //2 verifying token
  // here, we are promisifying the jwt.verify function i.e. making it
  // asynnchronous as it is inherently synchronous
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // console.log(decoded);

  //3 checking if the user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("The user belonging to this token does not exist...", 401)
    );
  }

  //4 check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password. Please login again...", 401)
    );
  }

  //currentUser.changedPasswordAfter(decoded.iat);    ----> dont know why it was there. commented for future reference

  // if all conditions above are fulfilled, grant access to the protected route
  // by calling the next middleware and then eventually the protected route
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// this middleware is used to check if the user is logged in.
// the difference between this middleware and protect middleware is that this middleware will work for all rendering and not just protected routes
exports.isLoggedIn = async (req, res, next) => {
  // here, we check if the cookie contains the jwt token
  if (req.cookies.jwt) {
    try {
      // here, we are promisifying the jwt.verify function i.e. making it
      // asynnchronous as it is inherently synchronous
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );
      // console.log(decoded);

      //checking if the user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      //checking if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      //currentUser.changedPasswordAfter(decoded.iat);    ----> dont know why it was there. commented for future reference

      // if all conditions above are fulfilled, grant access to the protected route
      // by calling the next middleware and then eventually the protected route
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

// this is used to restrict some functionalities to specific user roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          "You do not have permission to perform this action!!!",
          403
        )
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1. check whether the user exists with the provided email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    next(new AppError("User with the given email does not exist!!!", 404));
  }

  // 2. if the user exists, create a password reset token which will be sent
  // to the user's email and will also be stored in the database after encryption.
  // this token will be confirmed and only then password can be reset
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    // 3. send the token to the user's email

    const resetURL = `${req.protocol}://${req.get(
      "host"
    )}/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();
    res.status(200).json({
      status: "success",
      message: "token sent to email",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "there was an error sending the email. try again later....",
        500
      )
    );
  }
});

// this is used to allow reset password functionality
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1. get user based on the token and also check if the token has not expired
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2. if token not expired and the user exists, set the new password
  if (!user) {
    return next(
      new AppError(
        "user with the given token does not exist or the token has expired...",
        400
      )
    );
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3. update changedPasswordAt property
  user.passwordChangedAt = Date.now() - 1000;

  // 4. log the user in and send JWT
  createSendToken(user, 200, req, res);
});

// this is used to allow user to update password
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1. get user from collection ---> user is already logged in so find using id
  const user = await User.findById(req.user.id).select("+password");

  // 2. check if POSTed password is correct
  if (!(await user.passwordCheck(req.body.passwordCurrent, user.password))) {
    return next(new AppError("password is wrong!!!", 401));
  }

  // 3. if so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4. log user in and then send JWT
  createSendToken(user, 200, req, res);
});

// here, we are implementing an error handling middleware function
// to dislay the error set by 'AppError' to the client

const app = require("../app");
const AppError = require("../utils/appError");

const handleJWTExpiredError = () => {
  return new AppError("Your token has expired. Please login again...", 401);
};

const handleJWTError = () => {
  return new AppError("Invalid token. Please login again...", 401);
};

const handleDuplicateFieldsDB = (err) => {
  // this function returns a
  //modified err with operational===true
  const value = err.keyValue.name;
  const message =
    "Duplicate field value : '" + value + "'. Please use another value.";
  return new AppError(message, 400);
};

const handleCastErrorDB = (err) => {
  // this function returns a
  //modified err with operational===true

  const message = "Invalid " + err.path + " : " + err.value;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  // here, we have a lot of required fields and hence a lot of errors.
  // thus we loop over the entire object and extract the message of every error in an array

  const message = "Invalid input data : " + errors.join(". ");
  return new AppError(message, 400);
};

const sendErrorDev = (err, req, res) => {
  // In development env, we can send any error details as clients won't have access

  // if API call, send error data like this -->
  if (req.originalUrl.startsWith("/api")) {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    // if RENDERED website, send error data like this -->
    console.error("ERROR", err);
    res.status(err.statusCode).render("error", {
      title: "Something went wrong!",
      msg: err.message,
    });
  }
};

const sendErrorProd = (err, req, res) => {
  // In production env, we have to be careful what errors details to send to the client

  // if API call, send error data like this -->
  if (req.originalUrl.startsWith("/api")) {
    // operational, trusted error : send the message to the client
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    } else {
      // programming or other unknown details : don't leak the error details
      // but as developers, we want to know the error. Hence, console log it
      console.error("ERROR", err);

      res.status(500).json({
        status: "error",
        message: "Something went wrong!!!",
      });
    }
  } else {
    // if RENDERED website, send error data like this -->
    // operational, trusted error : send the message to the client
    if (err.isOperational) {
      res.status(err.statusCode).render("error", {
        title: "Something went wrong!",
        msg: err.message,
      });
    } else {
      console.error("ERROR", err);

      res.status(err.statusCode).render("error", {
        title: "Something went wrong!",
        msg: "Please try again later.",
      });
    }
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err };
    error.message = err.message;
    // we create a copy of 'err' as we will make changes to it.

    if (error.name === "CastError") {
      error = handleCastErrorDB(error);
    }
    if (error.code === 11000) {
      error = handleDuplicateFieldsDB(error);
    }
    if (error.name === "ValidationError") {
      error = handleValidationErrorDB(error);
    }
    if (error.name === "JsonWebTokenError") {
      error = handleJWTError();
    }
    if (error.name === "TokenExpiredError") {
      error = handleJWTExpiredError();
    }

    // above line converts the mongo error to operational error
    sendErrorProd(error, req, res);
  }
};

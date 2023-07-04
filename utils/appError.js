// here, we are creating a class 'AppError' that will accept parameters such as
// error message, statusCode, etc. and hence set customised error messages.
// using a class will enable us to use this functionality for various types of errors

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = statusCode.toString().startsWith("4") ? "fail" : "error";
    this.isOperational = true; // all errors defined by us are operational errors and hence
    // it is set to 'true'. Only these errors are to be sent down to the client when using 'production' env

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;

// requiring dependencies
const express = require("express");
const app = express();
const morgan = require("morgan");
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const path = require("path");
const cookieParser = require("cookie-parser");
const compression = require("compression"); // package to compress responses
const cors = require("cors"); // package to enable CORS

// connecting sub-application routes via mounting
const tourRouter = require("./routes/tourRoutes");
const userRouter = require("./routes/userRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const viewRouter = require("./routes/viewRoutes");
const bookingRouter = require("./routes/bookingRoutes");

// setting view engine. For Natours project, we will be using Pug templates
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// Global middleware functions - these should come before any routing as these functions should be called before the request-response cycle ends

// to make Cross Origin Resource Sharing work, we implement cors -->
app.use(cors()); // by default, only GET and POST is allowed using cors. For other methods like PUT, PATCH, DELETE etc. we use options -->
app.options("*", cors()); // "*" means cors() will be implemented for all routes defined in out API. We can allow specific routes too.

// Setting Security HTTP Headers using 'helmet' -->
// 1st Method -
//app.use(helmet()); // ---> this is one way. But due to CSP policy issue, we could not access external scripts. So we need to set some parameters with helmet

// therefore, 2nd Method -
// included at the bottom. It is necessary for all routes to be defined first before using 'helmet.contentSecurityPolicy() middleware'
// because only then it will be able to check the external scripts we want to include

// here, we parse the cookie for accessing them
app.use(cookieParser());

// development environment logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// this is used to limit the no. of requests from one IP. this is a security feature to avoid DOS, brute-force type of attacks
const limiter = rateLimit({
  max: 100,
  windowMS: 60 * 60 * 1000,
  message: "too many requests from this IP. try in an hour...",
});
app.use("/api", limiter);

// body parser ---> reading data from body to req.body
app.use(express.json({ limit: "10kb" }));

// data sanitization to protect against NoSQL query injection
app.use(mongoSanitize());

// data sanitization to protect against XSS
app.use(xss());

// prevent parameter pollution. Here, all other params except whitelisted ones will be trimmed. ex: sort=duration&sort=price will become sort=price
app.use(
  hpp({
    whitelist: [
      "duration",
      "ratingsQuantity",
      "ratingsAverage",
      "maxGroupSize",
      "difficulty",
      "price",
    ],
  })
);

// 'compression' used to compress responses- be it json or html
app.use(compression());

// serving static files
app.use(express.static(`${__dirname}/public`));

// below written function gets the time of request
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next(); // next() is used to call the next middleware function
});

// routes using mounting and middleware
app.use("/", viewRouter);
app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/bookings", bookingRouter);

// if both - tourRouter and userRouter don't catch the route requested,
// we will run this middleware to handle unhandled routes
// also, we need to write this middleware after all routes are checked
app.all("*", (req, res, next) => {
  next(
    // here we are creating an object of the class 'AppError' and passing that to the
    // error handling middleware function
    new AppError(
      "Can't find the requested URL " + req.originalUrl + " on this server",
      404
    )
  );
});

// here, we are redirecting to the global error handling middleware function
app.use(globalErrorHandler);

// <---- This section of code is used to allow access to certain external scripts which might be restricted under Content Security Policy.
const scriptSrcUrls = ["https://unpkg.com/", "https://tile.openstreetmap.org"];
const styleSrcUrls = [
  "https://unpkg.com/",
  "https://tile.openstreetmap.org",
  "https://fonts.googleapis.com/",
];
const connectSrcUrls = ["https://unpkg.com", "https://tile.openstreetmap.org"];
const fontSrcUrls = ["fonts.googleapis.com", "fonts.gstatic.com"];

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: [],
      connectSrc: ["'self'", ...connectSrcUrls],
      scriptSrc: ["'self'", ...scriptSrcUrls],
      styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
      workerSrc: ["'self'", "blob:"],
      objectSrc: [],
      imgSrc: ["'self'", "blob:", "data:", "https:"],
      fontSrc: ["'self'", ...fontSrcUrls],
    },
  })
);
// ---->

// setting up port
module.exports = app;

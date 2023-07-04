// requiring dependencies
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const app = require("./app");
const redisClient = require("./redis");

// console.log(process.env); --> // logs the environment variables

// this is used to take care of cases when the error is not caught in the 'catch' block
// example of this would be console.log(x) when 'x' is not defined
// we should therefore have this section code at the start
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION....... SHUTTING DOWN!!!");
  console.log(err.name, err.message);
});

// using mongoose to connect to MongoDB database
const DB = process.env.DATABASE.replace(
  "<password>",
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    // useCreateIndex: true,  ---> deprecated in latest version of mongoose
    // useFindAndModify: false,   ---> deprecated in latest version of mongoose
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("DB connection successful !!!");
  });

// listening to a port
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log("Server set up at port : " + port);
  console.log(process.env.NODE_ENV);
});

// this is used to take care of cases when the error occurs outside the scope
// of 'express'. Example : Database connection
process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message);
  console.log("UNHANDLED REJECTION....... SHUTTING DOWN!!!");

  server.close(() => {
    //server.close is used to smoothly close the server
    // i.e. stops accepting requests
    process.exit(1); // used to shut down the application.
    // Here, '1' means exited with failure and '0' would be exited with success.
  });
});

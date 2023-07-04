const fs = require("fs");
const mongoose = require("mongoose"); // requiring mongoose module for connecting to MongoDB
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const tour = require("./../../models/tourModel");
const User = require("./../../models/userModel");
const Review = require("./../../models/reviewModel");

// console.log(process.env); // this console logs the environment variables

// using mongoose to connect to MongoDB database
const DB = process.env.DATABASE.replace(
  "<password>",
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    // useCreateIndex: true,
    // useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("DB connection successful !!!");
  });

// reading JSON file
const tours = JSON.parse(fs.readFileSync(__dirname + "/tours.json", "utf-8"));
const users = JSON.parse(fs.readFileSync(__dirname + "/users.json", "utf-8"));
const reviews = JSON.parse(
  fs.readFileSync(__dirname + "/reviews.json", "utf-8")
);

// importing data into database
const importData = async () => {
  try {
    await tour.create(tours);
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

// deleting data from the database
const deleteData = async () => {
  try {
    await tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    console.log("data successfully deleted");
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

console.log(process.argv);

if (process.argv[2] === "--import") {
  importData();
} else if (process.argv[2] === "--delete") {
  deleteData();
}

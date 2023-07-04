const mongoose = require("mongoose"); // requiring mongoose module for connecting to MongoDB
const validator = require("validator"); // to use validators
const bcrypt = require("bcryptjs"); // this is used to encrypt passwords
const { json } = require("express");
const crypto = require("crypto"); // node library for encryption and token generation

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "User name must be entered..."],
    unique: true,
    trim: true, // removes extra spaces
  },
  email: {
    type: String,
    required: [true, "User email address must be provided..."],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Invalid email..."],
  },
  photo: {
    type: String,
    default: "default.jpg",
  },
  role: {
    type: String,
    enum: ["user", "guide", "lead-guide", "admin"],
    default: "user",
  },
  password: {
    type: String,
    required: [true, "please provide a password..."],
    unique: true,
    minlength: 4,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "please confirm your password..."],
    validate: {
      // this would work only on creating a new user and saving
      // we have to keep in mind the condition when the user wants to update the password
      validator: function (el) {
        return el === this.password;
      },
      message: "passwords don't match",
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

// here, we are implementing a pre-save middleware function to encrypt passwords
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  //hash the password with the cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  // delete the password confirm field
  this.passwordConfirm = undefined;

  next();
});

// this is a query middleware. this is executed before every 'find' query
userSchema.pre(/^find/, function (next) {
  // this function helps to filter only those users who do not have active: false
  this.find({ active: { $ne: false } });
  next();
});

// here, we have implemented an instance method which is available on all user documents
userSchema.methods.passwordCheck = async function (
  candidatePassword,
  userPassword
) {
  // this compares the entered password and user password and return true or false
  return await bcrypt.compare(candidatePassword, userPassword);
};

// here, we check if the token was issued after password change or before password change
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    // returns true if password changed after token issued
    return JWTTimestamp < changedTimeStamp; // 100 < 200 therefore sends true which triggers error
  }
  // returns false if password changed before token issued
  return false;
};

// this is used to create a reset token to reset password. token is send to authcontroller and encrypted token is saved in the database
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;

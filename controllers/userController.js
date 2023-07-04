const catchAsync = require("./../utils/catchAsync");
const User = require("./../models/userModel");
const AppError = require("./../utils/appError");
const factory = require("./handlerFactory");
const multer = require("multer"); // using multer to upload photos
const sharp = require("sharp"); // sharp package is use to resize uploaded images

// here, we define some settings for multer to store files
// 1st way - if no processing required on the file
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "public/img/users"); // Specify the destination folder where uploaded files will be stored
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split("/")[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`); // Define the filename for the uploaded file
//   },
// });
// 2nd way - saves in buffer then we do the required processing and then save in diskStorage
const multerStorage = multer.memoryStorage(); // this way, the file is saved as a buffer

// here, we use multer filter to set rules for accepting or rejecting files
const multerFilter = (req, file, cb) => {
  const fileSize = parseInt(req.headers["content-length"]);
  // console.log(fileSize);
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Please upload image only!", false));
  }

  if (fileSize >= 1024 * 1024 * 5) {
    // throw an error if fileSize >= 5MB
    cb(new AppError("Max. upload size is 1MB", false));
  }
};

// here, we define some settings for multer like storage, filter, etc
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  // limits : {
  //   fileSize: 1024 * 1024 * 10, // 10MB limit
  // }  ---> this is another way of limiting fileSize
});

exports.uploadUserPhoto = upload.single("photo");

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

const filterObj = (userDefinedDataFields, ...allowedFields) => {
  // in this function, we loop through all the data fields that user wants to update and check if those are allowed.
  // only the allowed ones are updated
  const allowedDataFields = {};
  Object.keys(userDefinedDataFields).forEach((el) => {
    if (allowedFields.includes(el)) {
      allowedDataFields[el] = userDefinedDataFields[el];
    }
  });

  return allowedDataFields;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// route handlers
exports.getAllUsers = factory.getAll(User);

// this is used to update user info excluding password
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1. create error if error tries to update password because we have a different function for that
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "this route is not for password updates. please use updatePassword route."
      )
    );
  }

  // 2. filter out restricted fields and only select allowed fields to be updated
  const filteredBody = filterObj(req.body, "name", "email"); // ---> allowing to only update name and email else user can mess with role, password, etc.
  if (req.file) filteredBody.photo = req.file.filename; // here, we check if a file exists in the fields. if yes, update the photo field in the database with the filename

  // 3. update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  }); // new : true helps to return the updated document and runvalidators: true to run validators like to check if valid format email is put, etc.
  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

// this is used to delete the user. we dont actually delete, but just make the user inactive
exports.deleteMe = catchAsync(async (req, res, next) => {
  // user has to be logged in to delete
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: "error",
    message: "This route is not defined yet. Use SignUp instead!!!",
  });
};

exports.getUser = factory.getOne(User);

// DO NOT UPDATE PASSWORDS WITH THESE
exports.deleteUser = factory.deleteOne(User);
exports.updateUser = factory.updateOne(User);

// requiring dependencies
const AppError = require("./../utils/appError");
const tour = require("./../models/tourModel");
const APIfeatures = require("./../utils/apiFeatures");
const catchAsync = require("./../utils/catchAsync");
const factory = require("./handlerFactory");
const multer = require("multer");
const sharp = require("sharp");

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

  if (fileSize >= 1024 * 1024 * 10) {
    // throw an error if fileSize >= 5MB
    cb(new AppError("Max. upload size is 10MB", false));
  }
};
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});
exports.uploadTourImages = upload.fields([
  { name: "imageCover", maxCount: 1 },
  { name: "images", maxCount: 3 },
]);
exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) imageCover
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) images
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    })
  );

  next();
});

// route handlers
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = "5";
  req.query.sort = "-ratingsAverage,price";
  req.query.fields = "name,price,ratingsAverage,summary,difficulty";
  next();
}; // this is a middleware function to pre-set the query parameters for 'top-5-best&cheap'

// here, we have to populate 2 fields.
exports.getTour = factory.getOne(tour, [
  { path: "guides", select: "-__v -passwordChangedAt" },
  "reviews",
]);
exports.getAllTours = factory.getAll(tour);
exports.createTour = factory.createOne(tour);
exports.updateTour = factory.updateOne(tour);
exports.deleteTour = factory.deleteOne(tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  // using aggregation to perform operations on the database
  // this object passed in aggregate is called pipelining i.e. it will run according to the order specified
  const stats = await tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4 } },
    },
    {
      $group: {
        _id: "$difficulty",
        numTours: { $sum: 1 },
        numRatings: { $sum: "$ratingsQuantity" },
        avgRatings: { $avg: "$ratingsAverage" },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  // using aggregation to perform operations on the database
  // this object passed in aggregate is called pipelining i.e. it will run according to the order specified
  const plan = await tour.aggregate([
    {
      $unwind: "$startDates",
    },
    {
      $match: {
        startDates: {
          $gte: new Date(year + "-01-01"),
          $lte: new Date(year + "-12-31"),
        },
      },
    },
    {
      $group: {
        _id: { $month: "$startDates" },
        numTourStarts: { $sum: 1 },
        tours: { $push: "$name" },
      },
    },
    {
      $addFields: { month: "$_id" },
    },
    {
      $project: { _id: 0 },
    },
    {
      $sort: { numTourStarts: -1 },
    },
    {
      $limit: 12,
    },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      plan,
    },
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");

  const radius = unit === "mi" ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        "please provide latitude and longitude in the format lat,lng",
        400
      )
    );
  }

  const tours = await tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  console.log(distance, lat, lng, unit);

  res.status(200).json({
    status: "success",
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");

  const multiplier = unit === "mi" ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        "please provide latitude and longitude in the format lat,lng",
        400
      )
    );
  }

  const distances = await tour.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng * 1, lat * 1] },
        distanceField: "distance",
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    results: distances.length,
    data: {
      data: distances,
    },
  });
});

const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const APIfeatures = require("./../utils/apiFeatures");

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }
    res.status(204).json({
      status: "success",
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);
    res.status(201).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findById(req.params.id).populate(popOptions);
    // we do .populate to fill the guides section before displaying. This does not change the database.
    // the guides section in the DB still contains only the Id of guides. .populate just references the Users using those Id's and displays the details of the guides
    // 'select' allows us to only show certain stuff.

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // catchAsync is a function and we are passing this async function
    // as a parameter to the catchAsync function which will handle the 'catch' block and execute the error handling middleware function

    // this is used to GET reviews on a particular tour. If no tour specified, filter will be empty and all reviews will be displayed
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    // console.log(req.params);

    // running different API features on 'features' object
    const features = new APIfeatures(Model.find(filter), req.query) // passed the entire tour object by 'tour.find()' and query string by 'req.query'
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const doc = await features.query;

    // sending a response
    res.status(200).json({
      status: "success",
      results: doc.length,
      data: {
        data: doc,
      },
    });
  });

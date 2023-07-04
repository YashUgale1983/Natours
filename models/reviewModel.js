const mongoose = require("mongoose");
const tour = require("./tourModel");

const reviewSchema = mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "Review cannot be empty..."],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: "tour",
      required: [true, "Review must belong to a tour..."],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a user..."],
    },
  },
  {
    // this is to turn on JSON and object notations for virtual properties
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// we use .statics here to access all review documents. .method has access to only the current document
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: "$tour",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  // console.log(stats);

  // only set ratingsQuantity and ratingsAverage if stats.length > 0 i.e. atleast 1 review on a tour exists. else set to 0 and 4.5
  if (stats.length > 0) {
    await tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post("save", function () {
  this.constructor.calcAverageRatings(this.tour); // here we use this.constructor because
  // for Review.calcAverageRatings, we have declared Review later in this file
});

// here, for findByIdAndUpdate and findByIdAndDelete, we use post hook middleware.
// here, doc is the review document which we have acccess to in the post hook
reviewSchema.post(/^findOneAnd/, async function (doc) {
  await doc.constructor.calcAverageRatings(doc.tour);
});

reviewSchema.pre(/^find/, function (next) {
  // populating reviews with tours does'nt make sense. therefore, only populating with users

  //   this.populate({
  //     path: "tour",
  //     select: "name",
  //   }).populate({
  //     path: "user",
  //     select: "name photo",
  //   });
  this.populate({
    path: "user",
    select: "name photo",
  });

  next();
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;

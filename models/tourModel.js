const mongoose = require("mongoose"); // requiring mongoose module for connecting to MongoDB
const slugify = require("slugify"); // to slugify the tour name
const validator = require("validator"); // to validate the strings in the DB

// creating a schema for our database
const tourSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A tour must have a name"],
      unique: true,
      trim: true, // removes extra spaces
      // these are validators to ensure valid data is put in DB -->
      maxlength: [40, "Tour name cannot be more than 40 characters"],
      minlength: [10, "Tour name cannot be less than 10 characters"],
      //validate: [validator.isAlpha, "Tour name must contain only letters"],
      // -- > validator.isAlpha was used just for demonstration.
    },
    price: {
      type: Number,
      required: [true, "A tour must have a price"],
    },
    duration: {
      type: Number,
      required: [true, "A tour must have a duration"],
    },
    maxGroupSize: {
      type: Number,
      required: [true, "A tour must have a group size"],
    },
    difficulty: {
      type: String,
      required: [true, "A tour must have a difficulty"],
      // these are validators to ensure valid data is put in DB i.e. only easy, medium or difficult is entered-->
      enum: {
        values: ["easy", "medium", "difficult"],
        message: "Difficulty should be easy, medium or difficult",
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4,
      // these are validators to ensure valid data is put in DB -->
      min: [1, "Rating must be above 1"],
      max: [5, "Rating must be below 5"],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    priceDiscount: {
      type: Number,
      // below is a custom validator that we can make according to our need -->
      validate: {
        validator: function (val) {
          // 'this' only points to the current doc on new doc creation
          return val < this.price;
        },
        message: "Price is less than price discount",
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, "A tour must have a description"],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, "A tour must have a cover image"],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false, // this option makes sure that 'createdAt' is not returned.
    },
    startDates: [Date],
    slug: String, // used to slugify the tour name string
    // this would help in keeping some tours secret and in using middlewares -->
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      //GeoJSON
      type: {
        type: String,
        default: "Point",
        enum: ["Point"],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: "Point",
          enum: ["Point"],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId, // here we define the reference key
        ref: "User", // here we establish relationship with other dataset
      },
    ],
  },
  {
    // this is to turn on JSON and object notations for virtual properties
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// if we have a query for example asking for tours with price less than 1000 only, then mongo has to scan through all the documents.
// this is inefficient. therefore, we use indexes which increases efficiency
// here we assume that price and ratingsAverage will be the most important therefore using only those
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: "2dsphere" });

// creating a virtual property --> helps in conversions. ex: days to weeks without consuming space in the schema
tourSchema.virtual("durationWeeks").get(function () {
  return this.duration / 7;
});

// creating a virtual property to populated tour document with its reviews. ----> also called virtual populate
tourSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "tour",
  localField: "_id",
});

// document middleware also called as hook
// 'pre save' runs before .save() and .create() and 'post save' after .save() and .create()
tourSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// query middlewares ----->

// we can use this to have special access. ex: a secret tour for VIP people
tourSchema.pre(/^find/, function (next) {
  // using /^find/ will run the middleware for all methods starting with 'find'
  this.find({ secretTour: { $ne: true } }); // this will ensure all docs with secretTour = true are excluded
  this.start = Date.now();
  next();
});

// this query middleware is used to populate the guides section before displaying
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: "guides",
    select: "-__v -passwordChangedAt",
  });

  next();
});

// this query middleware is used to log the time taken for the query
tourSchema.post(/^find/, function (docs, next) {
  let queryTime = Date.now() - this.start;
  // console.log("This query took " + queryTime + " miliseconds");
  next();
});

// aggregation middleware
// we can use this before aggregating
tourSchema.pre("aggregate", function (next) {
  if (!(this.pipeline().length > 0 && "$geoNear" in this.pipeline()[0])) {
    this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  }

  // this ensures that docs with secretTour = true are excluded from the aggregation pipeline array
  // .unshift is used to add the $match stage at the beginning of the pipeline array
  // but, all this happens only if $geoNear is not present in the pipeline
  // console.log(this.pipeline());
  next();
});

// creating a model based on our defined schema. We can create objects on this model
const tour = mongoose.model("tour", tourSchema);

module.exports = tour; // exports the model we made

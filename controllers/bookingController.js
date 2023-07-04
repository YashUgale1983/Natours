const tour = require("./../models/tourModel");
const Booking = require("./../models/bookingModel");
const catchAsync = require("./../utils/catchAsync");
const factory = require("./handlerFactory");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) get currently booked tour
  const reqTour = await tour.findById(req.params.tourId);

  // 2) create checkout session
  const session = await stripe.checkout.sessions.create({
    success_url: `${req.protocol}://${req.get("host")}/?tour=${
      req.params.tourId
    }&user=${req.user.id}&price=${reqTour.price}`,
    cancel_url: `${req.protocol}://${req.get("host")}/tour/${reqTour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${reqTour.name} Tour`,
            description: reqTour.summary,
            images: [`https://www.natours.dev/img/tours/${reqTour.imageCover}`],
          },
          unit_amount: reqTour.price * 100,
        },
        quantity: 1,
      },
    ],
    payment_method_types: ["card"],
    mode: "payment",
  });

  // 3) create session as response
  res.status(200).json({
    status: "success",
    session,
  });
});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  const { tour, user, price } = req.query;

  if (!tour || !user || !price) {
    return next();
  }

  await Booking.create({ tour, user, price });

  res.redirect(req.originalUrl.split("?")[0]);
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);

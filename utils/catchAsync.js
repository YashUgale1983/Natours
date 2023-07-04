// here, using catchAsync function, we take the async functiona as the parameter
// and check if the 'catch' block is being executed. If not, then the function is
// returned as it is

module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

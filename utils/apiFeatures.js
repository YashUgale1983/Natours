class APIfeatures {
  constructor(query, queryStr) {
    this.query = query;
    this.queryStr = queryStr;
  }

  // CREATING A QUERY

  filter() {
    // 1A ) filtering -->
    const queryObj = { ...this.queryStr };
    const excludedFields = ["page", "sort", "limit", "fields"];
    excludedFields.forEach((el) => {
      delete queryObj[el];
    });

    // 1B ) advanced filtering -->
    let queryString = JSON.stringify(queryObj);
    queryString = queryString.replace(
      /\b(gte|gt|lte|lt)\b/g,
      (match) => "$" + match
    );
    // console.log(JSON.parse(queryString));
    this.query = this.query.find(JSON.parse(queryString));

    return this;
  }

  sort() {
    // 2 ) sorting
    if (this.queryStr.sort) {
      const sortBy = this.queryStr.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-createdAt");
    }
    return this;
  }

  limitFields() {
    // 3 ) Field limiting
    if (this.queryStr.fields) {
      const fields = this.queryStr.fields
        .split(",")
        .join(" ")
        .replace(/password/g, "");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }

    return this;
  }

  paginate() {
    // 4 ) Pagination
    const page = this.queryStr.page * 1;
    const limit = this.queryStr.limit * 1 || 100;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);

    if (this.queryStr.page) {
      const numTours = this.query.countDocuments();
      if (skip >= numTours) {
        throw new Error("This page does not exist...");
      }
    }
    return this;
  }
}

module.exports = APIfeatures;

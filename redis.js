// In redis.js, we have set up a redis database which we will use for caching purposes.

const redis = require("redis"); // using redis@3.1.2

const redisURL = "redis://127.0.0.1:" + process.env.REDIS_PORT; // defining redis port
const client = redis.createClient(redisURL); // creating a client instance
if (client) console.log("Redis DB set up on port : " + process.env.REDIS_PORT); // logging if connection successful

module.exports = client;

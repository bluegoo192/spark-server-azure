const redisOptions = require("../../secrets.js").redis;
const { promisify } = require('util');
const redis = require('redis');

const client = redis.createClient(redisOptions);
client.getAsync = promisify(client.get).bind(client); // let us get with promises

client.on("error", function (err) {
  console.error(err);
});

module.exports = client;

const googleMapsKey = require('../../secrets.js').googlemaps;
const { promisify } = require('util');

const map = require('@google/maps').createClient({
  key: googleMapsKey
});

const geocodeAsync = promisify(map.geocode);
const distanceAsync = promisify(map.distanceMatrix);

// find the driving time in seconds
module.exports = async function (agent, address) {
  try {
    const addressString = address.address + ', ' + address.zip;

    // geocode the given address
    const candidates = (await geocodeAsync({ address: addressString })).json.results;
    if (candidates.length !== 1) {
      throw "Address isn't precise enough!";
    }
    const showingLocation = candidates[0].geometry.location;

    // calculate driving time (thanks Google!)
    const res = await distanceAsync({
      origins: [agent.homelatitude+", "+agent.homelongitude],
      destinations: [showingLocation.lat+", "+showingLocation.lng]
    });
    return res.json.rows[0].elements[0].duration.value;

  } catch (err) {
    console.log(err);
    return -1;
  }
}

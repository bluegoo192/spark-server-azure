var db = require('../data/dbclient.js');
let cache = require('../data/cacheclient.js');
const moment = require('moment');

const CLOSED = "closed";

let sampleAvailabilityObject = {  // USE MILITARY TIME
  monday: ["8:30","17"],
  tuesday: ["8:30","17"],
  wednesday: ["8:30","17"],
  thursday: ["8:30","17"],
  friday: ["8:30","17"],
  saturday: ["12","15"],
  sunday: []
}

function getDayNumber (n) {
  switch (n) {
    case 0: return "monday";
    case 1: return "tuesday";
    case 2: return "wednesday";
    case 3: return "thursday";
    case 4: return "friday";
    case 5: return "saturday";
    case 6: return "sunday";
  }
}

function arrayToTimeString(arr) {
  if (arr.length === 0) return CLOSED;
  if (arr.length !== 2) {
    console.log("invalid arguments (arrayToTimeString): "+arr);
    return CLOSED;
  }
  return arr[0]+"-"+arr[1];
}

// converts a time to moment
function parseTime(time) {
  let timeAsArray = time.split(":"); // [hour, minute]
  let min = (timeAsArray[1]) ? timeAsArray[1] : 0;
  return moment().hour(timeAsArray[0]).minute(min).second(0);
}

function stringToTimeArray(str) {
  if (str == CLOSED) return [];
  let arr = str.split("-");
  if (arr.length !== 2) {
    console.log("invalid arguments (stringToTimeArray): "+str);
    return [];
  }
  return arr;
}

function encode(availability) {
  let a = [];
  a[0] = arrayToTimeString(availability.monday);
  a[1] = arrayToTimeString(availability.tuesday);
  a[2] = arrayToTimeString(availability.wednesday);
  a[3] = arrayToTimeString(availability.thursday);
  a[4] = arrayToTimeString(availability.friday);
  a[5] = arrayToTimeString(availability.saturday);
  a[6] = arrayToTimeString(availability.sunday);
  console.log(a);
  return a;
}

function decode(stringArray) {
  if (stringArray.length !== 7) {
    console.log("bad argument (decode): "+JSON.stringify(stringArray));
    return sampleAvailabilityObject;
  }
  let availability = {};
  availability.monday = stringToTimeArray(stringArray[0]);
  availability.tuesday = stringToTimeArray(stringArray[1]);
  availability.wednesday = stringToTimeArray(stringArray[2]);
  availability.thursday = stringToTimeArray(stringArray[3]);
  availability.friday = stringToTimeArray(stringArray[4]);
  availability.saturday = stringToTimeArray(stringArray[5]);
  availability.sunday = stringToTimeArray(stringArray[6]);
  return availability;
}

async function isAvailable(address, zip) {
  const availability = await getAvailability(address, zip);
  const now = moment();
  const range = availability[ getDayNumber(now.isoWeekday()) ];
  if (!range || range == []) return false;
  if (range.length !== 2) {
    console.error("bad availability range:" + range);
    return false;
  }
  if (now.isAfter(parseTime(range[0])) && now.isBefore(parseTime(range[1]))) {
    return true;
  }
  return false;
  console.log(target.range);
}

async function getAvailability(address, zip) {
  if (arguments.length !== 2) throw "bad arguments";
  const q = "SELECT availabilities FROM homes WHERE address = $1 AND zip = $2";
  let response = await db.pool.query(q, [address, zip]);
  if (response.rows.length !== 1) throw "database problem, address and zip aren't unique";
  return decode(response.rows[0].availabilities);
}

async function setAvailability(availability, address, zip) {
  if (arguments.length !== 3) throw "bad arguments";
  let q = "UPDATE homes SET availabilities = $1 WHERE address = $2 AND zip = $3";
  let a = encode(availability);
  let result = await db.pool.query(q, [a, address, zip]);
  if (result.rowCount !== 1) console.log("failed to set availability");
  return result.rowCount;
}

module.exports = { isAvailable, getAvailability, setAvailability }

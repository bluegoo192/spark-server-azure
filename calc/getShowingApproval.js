const db = require('../data/dbclient.js');

const pendingRequests = {};

// generate ID from request info
function encodeId(address, sessionId, moment) {
  return `${address.address},${address.zip}:${sessionId}:${moment.format()}`;
}

// asks listing agent for permission to do a showing.
async function getApproval(address, sessionId, moment) {
  // create Promise
  let get = new Promise((resolve, reject) => {
    // store a function linked to this promise
    pendingRequests[encodeId(address, sessionId, moment)] = response => {
      resolve(response);
    }
    let timeout = 1000 * 60 * 60;
    setTimeout(() => reject("No response from listing agent"), timeout);
  });

  // get listing agent
  const q = "SELECT listagent FROM homes WHERE address = $1 AND zip = $2";
  let response = await db.pool.query(q, [address.address, address.zip]);
  let agent = response.rows[0].listagent;

  if (!agent) return true; // if no listing agent, approve automatically

  return false;
}

function respond(address, sessionId, moment, response) {

}

module.exports = { getApproval, respond };

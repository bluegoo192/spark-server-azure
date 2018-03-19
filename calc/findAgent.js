const dbclient = require('../data/dbclient.js');
const cache = require('../data/cacheclient.js');
const driveTime = require('./drivingTime.js');
const { notifyAgent } = require('./notify.js');

const maxWait = 15; // soft max for minutes to wait for agent
const maxWaitSeconds = maxWait * 60;

const pendingRequests = {};

function encode(sessionId, address) {
  return sessionId+":"+address.address+":"+address.zip;
}

async function findAgent(sessionId, address) {
  // log sessionId and address for testing
  console.log(sessionId+"    "+JSON.stringify(address));

  // create promise
  let find = new Promise((resolve, reject) => {
    // put an object linked to this promise in pendingRequests
    pendingRequests[encode(sessionId, address)] = {
      resolve: (agent) => {
        resolve(agent); // when someone calls the function, resolve
      },
      data: { sessionId, address }
    }
    let hourInMilliseconds = 1000 * 60 * 60;
    setTimeout(() => { reject("No agents responded in time") }, hourInMilliseconds);
  });

  // get all agents within radius
  let agents = await dbclient.getAllAgents();
  let driveTimeCalculations = [];
  agents.forEach((agent) => {
    let driveTimePromise = driveTime(agent, address);
    driveTimePromise.then((driveTime) => {
      agent.driveTime = driveTime; // when calc is done, update agent with it
    });
    driveTimeCalculations.push(driveTimePromise);
  });
  await Promise.all(driveTimeCalculations);
  agents = agents.filter(agent => agent.driveTime < maxWaitSeconds);

  // notify all agents
  agents.forEach(agent => notifyAgent(agent, "Someone wants to look at "+address.address));

  // wait for someone to reply
  let agent = await find;

  // return full agent object
  return agent;
}

function provideAgent(agent, sessionId, address) {
  let id = encode(sessionId, address);
  if (pendingRequests[id]) {
    pendingRequests[id].resolve(agent);
    return true;
  }
  return false;
}

function getAllRequests() {
  return Object.values(pendingRequests);
}

module.exports = { findAgent, provideAgent, getAllRequests }

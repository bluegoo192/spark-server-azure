const parse = require('./parse.js');
const secrets = require('../../secrets.js');
const dbclient = require('../data/dbclient.js');
const cache = require('../data/cacheclient.js');
const calcDriveTime = require('../calc/drivingTime.js');
const { findAgent } = require('../calc/findAgent.js');
const createInfographic = require('../calc/createInfographic.js');
const { isAvailable } = require('../calc/availability.js');

const keepConvoSeconds = 21600; // persist conversation state for six hours

const rateAgentNextState = async (statement, sessionId) => {
  if (isNaN(statement)) {
    console.log("returning error");
    return "retryAskForRating";
  }
  if (statement < 1 || statement > 5) {
    console.log("returning error");
    return "retryAskForRating";
  }
  let agent = JSON.parse(await cache.getAsync(sessionId+":agent"));
  dbclient.rateAgent(agent.id, statement);
  return "done";
}

const states = {
  nullstate: {
    text: "If you're seeing this, something is wrong",
    nextState: (statement, sessionId) => {
      return "start";
    }
  },
  start: {
    text: "Hi, welcome to Spark Showings.  What's the address you're looking at?",
    nextState: (statement, sessionId) => {
      return "processingAddress";
    }
  },
  processingAddress: {
    text: "One second while we look that up...",
    run: async (context) => {
      let results = await dbclient.searchPartialAddress(context.message.Body);
      if (!results) { // null results object -> catastrophic error
        cache.set(context.sessionId+":state", "serverError", "EX", keepConvoSeconds);
        return;
      }
      switch (results.rowCount) {
        case 0:
          context.setState("addressNotFound");
          break;
        case 1:
          console.log("-- SELECTED ADDRESS --")
          cache.set(context.sessionId+":address", JSON.stringify(results.rows[0]), "EX", keepConvoSeconds);
          context.setState("confirmAddress");
          break;
        default:
          context.setState("multipleAddressesFound");
          break;
      }
    },
    nextState: (statement, sessionId) => {
      return "stillProcessingAddress";
    }
  },
  addressNotFound: {
    text: "Sorry, that address wasn't found.  Please try again",
    nextState: (statement, sessionId) => {
      return "processingAddress";
    }
  },
  multipleAddressesFound: {
    text: "Multiple addresses found.  Stub",
    nextState: () => {
      return "start";
    }
  },
  stillProcessingAddress: {
    text: "Sorry, we're still looking up the address you sent.  One more moment please...",
    nextState: (statement, sessionId) => {
      return "stillProcessingAddress";
    }
  },
  confirmAddress: {
    text: async (context) => {
      let address = JSON.parse(await cache.getAsync(context.sessionId+":address"));
      let infographic = await createInfographic(address);
      return [`You have selected ${address.address}, ${address.zip}`,
              "Here is some information about the property:",
              secrets.mediaKey + infographic]
    },
    run: async (context) => {
      let address = JSON.parse(await cache.getAsync(context.sessionId+":address"));
      let open = await isAvailable(address.address, address.zip);
      let next = open ? "askForShowing" : "houseNotAvailable";
      context.setState(next)
    },
    nextState: (statement, sessionId) => {
      return "checkingAvailability";
    }
  },
  checkingAvailability: {
    text: "Sorry, still looking up the availability of the house you picked.  One second please...",
    nextState: () => "checkingAvailability"
  },
  houseNotAvailable: {
    text: "Sorry, that house isn't available until right now.  Would you like to make an appointment?",
    nextState: () => "unhandled"
  },
  askForShowing: {
    text: "Would you like an agent to come show this house right now?",
    nextState: (statement, sessionId) => {
      return parse.affirmation(statement,
        () => "askIfHasAgent", // yes
        () => "maybeLater", // no
        () => "unhandled");
      }
  },
  askIfHasAgent: {
    text: "Are you currently working with an agent?",
    nextState: (statement, sessionId) => {
      return parse.affirmation(statement,
        () => "start", // yes
        () => "findingAgent", // no
        () => "unhandled");
    }
  },
  findingAgent: {
    text: "Okay, finding you an agent!  We'll be in touch in a minute or two...",
    run: async (context) => {
      const address = JSON.parse(await cache.getAsync(context.sessionId+":address"));
      const agent = await findAgent(context.sessionId, address);
      if (agent == null) {
        context.setState("serverError");
        return;
      }
      await cache.set(context.sessionId+":agent", JSON.stringify(agent), "EX", keepConvoSeconds);
      let requestObject = { address, sessionId: context.sessionId };
      cache.set("agent:"+agent.id+":request", JSON.stringify(requestObject), "EX", keepConvoSeconds);
      context.setState("foundAgent");
    },
    nextState: (statement, sessionId) => {
      if (statement.toLowerCase() == 'cancel') return "maybeLater";
      return "stillFindingAgent";
    }
  },
  stillFindingAgent: {
    text: "Sorry, we are still looking for an agent for you.  Hang tight!",
    nextState: (statement, sessionId) => {
      return "stillFindingAgent";
    }
  },
  foundAgent: {
    text: async (context) => {
      let agent = JSON.parse(await cache.getAsync(context.sessionId+":agent"));
      context.agent = agent;
      return [`Found an agent!  You'll be working with ${agent.name}`,
              `'${agent.blurb}' %0a - ${agent.name}`];
    },
    run: async (context) => {
      let address = JSON.parse(await cache.getAsync(context.sessionId+":address"));
      let time = await calcDriveTime(context.agent, address); // time in seconds
      if (time < 0) {
        context.setState("serverError");
        return;
      }
      time = parse.secondsToMinutes(time);
      context.send(`Your agent will arrive in ${time} minutes.  If you need to cancel, text 'NVM'`);
      setTimeout(() => context.setState("agentArrived"), time/* *60*1000 */);
    },
    nextState: (statement, sessionId) => {
      return "waitingForAgent";
    }
  },
  agentArrived: {
    text: "Your agent should be with you now.  Once you are done with the showing, please rate your experience from 1-5 (5 being best)",
    run: async (context) => {
      dbclient.registerBuyer(context.sessionId);
    },
    nextState: rateAgentNextState
  },
  retryAskForRating: {
    text: "Sorry, invalid input.  Please rate your experience from using a number from 1 to 5",
    nextState: rateAgentNextState
  },
  waitingForAgent: {
    text: "Please wait - your agent will be along shortly.  You can respond 'NVM' to cancel at any time",
    nextState: (statement, sessionId) => {
      if (statement == "NVM") {
        return "maybeLater";
      } else {
        return "waitingForAgent";
      }
    }
  },
  maybeLater: {
    text: "That's okay.  You can reach out to us later",
    nextState: (statement, sessionId) => {
      return "start";
    }
  },
  unhandled: {
    text: "Sorry, I'm not sure what that means.  Please try again.",
    nextState: (statement, sessionId) => {
      return "start";
    }
  },
  serverError: {
    text: "Sorry, there was a server error.  Please restart and try again.",
    nextState: (statement, sessionId) => {
      return "start";
    }
  },
  done: {
    text: "Great! Thanks for using Spark Showings.",
    nextState: () => "start"
  }
}

module.exports = states;

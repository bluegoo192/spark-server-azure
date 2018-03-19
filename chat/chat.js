/*  How this works: */
const states = require('./states.js');
const secrets = require('../../secrets.js');
const twilioClient = require('twilio')(secrets.twilio.sid, secrets.twilio.token);
const cache = require('../data/cacheclient');

const keepConvoSeconds = 21600; // persist conversation state for six hours

let moment = require('moment');

/* Twilio only lets us update cookies when the user texts us first,
    and state is stored in cookie
  However, sometimes we want to progess state arbitrarily.  This lets us update
    a user's state server side */
let actualStates = {};

const generateSessionId = function (message) {
  // session id must always be their number
  return message.From;
}

const getState = async function (sessionId) {
  const key = sessionId + ":state";
  const cachedState = await cache.getAsync(key);
  return cachedState || "nullstate";
}

const sendSms = async function (text, number) {
  if (text instanceof Function) text = await text(this); // this should be the context
  if (Array.isArray(text)) {
    for (let message of text) {
      if (message.startsWith(secrets.mediaKey)) {
        message = message.replace(secrets.mediaKey, "");
        await twilioClient.messages.create({
          to: number,
          from: '+18312268454',
          body: "",
          mediaUrl: message
        });
      } else {
        await twilioClient.messages.create({
          to: number,
          from: '+18312268454',
          body: message
        });
      }
    }
  } else {
    if (text.startsWith(secrets.mediaKey)) {
      text = text.replace(secrets.mediaKey, "");
      await twilioClient.messages.create({
        to: number,
        from: '+18312268454',
        body: "",
        mediaUrl: text
      });
    } else {
      await twilioClient.messages.create({
        to: number,
        from: '+18312268454',
        body: text
      });
    }
  }
};
const sendToConsole = async function (text) {
  if (text instanceof Function) text = await text(this);
  let sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };
  await sleep(1000);
  console.log("STUB SEND SUCCESS: "+text);
};

class Context {
  constructor(message, sessionId) {
    this.message = message;
    this.sessionId = sessionId;
    this.consoleMode = message.From.startsWith('local');
  }
  async send(text) {
    console.log(this.consoleMode + ", "+JSON.stringify(this.message));

    let correctSend = (this.consoleMode) ? sendToConsole.bind(this) : sendSms.bind(this);
    if (Array.isArray(text)) {
      for (let msg of text) {
        await correctSend(msg, this.message.From);
      }
    } else {
      await correctSend(text, this.message.From);
    }
  }
  async setState(stateString) {
    await this.send(states[stateString].text);
    await cache.set(this.sessionId+":state", stateString, "EX", keepConvoSeconds);
    if (states[stateString].run) states[stateString].run(this);
  }
}

const reply = async function (message) {
  const sessionId = generateSessionId(message);

  let oldStateString = await getState(sessionId);

  try {
    var oldState = states[ oldStateString ]; // use var so it's hoisted out of block
  } catch (err) {
    console.error("Current(old) state was invalid!");
    console.log("State string: "+oldStateString);
    console.log("State: "+oldState);
    cache.del(sessionId+":state");
    return "Sorry, there was a server error.  Please try again";
  }

  try {
    // progress state
    var newStateString = await oldState.nextState(message.Body, sessionId);

    // handle dev stuff
    if (message.Body == "RESET") {
      newStateString = "start";
    }
    var currentState = states[newStateString];
  } catch (err) {
    console.error("Invalid new state!");
    console.log("State string: "+newStateString);
    console.log("State: "+currentState);
    console.log("old State string: "+oldStateString);
    cache.del(sessionId+":state");
    return "Sorry, there was a server error.  Please try again";
  }

  try {
    // update data and finish
    var context = new Context(message, sessionId, );
    if (currentState.run) currentState.run(context); // run background tasks, if necessary
    await cache.set(sessionId+":state", newStateString, "EX", keepConvoSeconds);
    return (currentState.text instanceof Function) ? await currentState.text(context) : currentState.text;
  } catch (err) {
    console.error("Invalid state!");
    console.log("State string: "+newStateString);
    console.log(err);
    cache.del(sessionId+":state");
    return "Sorry, there was a server error.  Please try again";
  }

}

module.exports = { reply };

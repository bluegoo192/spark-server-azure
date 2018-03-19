const db = require('../calc/dbclient.js');
const Expo = require('expo-server-sdk');
const expo = new Expo();

async function genNotificationMsgs(agentEmail, message) {
  try {
    var tokens = db.getAgentTokens(agentEmail);
  } catch (err) {
    console.log(err);
    console.log("Failed to notify agent " + agentEmail);
  }
  if (tokens == null) {
    console.log("No tokens for "+agentEmail);
    return;
  }

  let messages = []; //
  tokens.forEach(token => {
    if (!Expo.isExpoPushToken(token)) {
      console.error(`Push token ${token} is not a valid Expo push token`);
      return;
    }
    messages.push({
      to: token,
      sound: 'default',
      body: message,
      data: { withSome: 'data' }
    });
  });
  return messages;
}

async function sendNotifications(messages) {
  let chunks = expo.chunkPushNotifications(messages);
  (async () => {
    for (let chunk of chunks) {
      try {
        let receipts = await expo.sendPushNotificationsAsync(chunk);
        console.log(receipts);
      } catch (error) {
        console.error(error);
      }
    }
  })();
}

module.exports = { genNotificationMsgs, sendNotifications };

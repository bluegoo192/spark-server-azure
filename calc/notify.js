const cache = require('../data/cacheclient.js');
const Expo = require('expo-server-sdk');

let expo = new Expo();

async function notifyAgent(agent, message) {
  let tokens = await cache.getAsync("agent:"+agent.id+":tokens");
  tokens = JSON.parse(tokens);
  if (tokens == null) return;
  let messages = [];
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
    })
  })

  let chunks = expo.chunkPushNotifications(messages);
  for (let chunk of chunks) {
    try {
      let receipts = await expo.sendPushNotificationsAsync(chunk);
    } catch (err) {
      console.error(err);
    }
  }
}

module.exports = { notifyAgent }

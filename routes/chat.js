// all API endpoints accessible via text (twilio)

const secrets = require('../../secrets.js');
var express = require('express');
var router = express.Router();
const twilio = require('twilio');
const chat = require('../chat/chat.js');

// Setup
const MessagingResponse = twilio.twiml.MessagingResponse;
const twiml = function(text) {
  const response = new MessagingResponse();
  if (Array.isArray(text)) {
    text.forEach( msg => response.message(msg) );
  } else {
    response.message(text);
  }
  return response.toString();
}

/* GET home page. */
router.get('/test', function(req, res, next) {
  res.send("test");
});

router.post('/start', function(req, res, next) {
  res.end();
});

router.post('/onMessageReceived', function(req, res, next) {
  res.format({
    'text/xml': async function() {
      if (!req.body.From) req.body.From = "localhost";
      const reply = await chat.reply(req.body);
      res.send(twiml(reply));
    },
    'text/plain': function() {
      res.send('hello.  sent in plain text');
    },
    'default': function() {
      console.log("not acceptable");
      res.status(406);
    }
  })
})


module.exports = router;

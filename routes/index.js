var express = require('express');
var router = express.Router();
const secrets = require('../../secrets.js');
const dbclient = require('../data/dbclient.js');
const cache = require('../data/cacheclient.js');
const jwt = require('jwt-simple');
const passport = require('passport');
const { provideAgent, getAllRequests } = require('../calc/findAgent.js');

const auth = passport.authenticate('jwt', { session: false });

// enable CORS
router.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/login', function(req, res, next) {
  console.log(req.body);
  dbclient.checkLogin(req.body.email, req.body.password).then((result) => {
    if (result) {
      const payload = { email: result.email, id: result.user.id };
      const token = jwt.encode(payload, secrets.jwt);
      cache.set("token:"+result.user.id, JSON.stringify(result.user), 'EX', 21600);
      res.send({ success: result.success, token: token });
    } else {
      res.sendStatus(401);
    }
  }).catch((err) => {
    console.log(err);
    res.sendStatus(500);
  })
});

router.post('/profile', auth, (req, res) => {
  res.send(req.user);
});

router.post('/registerPushToken', auth, async (req, res) => {
  if (!req.body.token) { // validate request
    res.sendStatus(400);
    return;
  }
  let tokens = await cache.getAsync("agent:"+req.user.id+":tokens");
  tokens = (tokens) ? JSON.parse(tokens) : [];
  tokens.push(req.body.token);
  await cache.set("agent:"+req.user.id+":tokens", JSON.stringify(tokens));
  res.sendStatus(200);
});

router.post('/acceptShowingRequest', auth, async (req, res) => {
  if (!req.body.sessionId || !req.body.address) {
    res.sendStatus(400);
    return;
  }
  let success = provideAgent(req.user, req.body.sessionId, req.body.address);
  res.send(success);
});

router.post('/getAgentProfile', auth, async (req, res) => {
  console.log(req.body);
  // if (!req.body.sessionId) {
  //   res.sendStatus(400);
  //   return;
  // }
  try {
    console.log(req.user);
    let agent = await dbclient.getAgentById(req.user.id);
    res.send(agent);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
})

router.get('/api/v1/houses', async (req, res) => {
  try {
    let houses = await dbclient.getAllHouses();
    res.send(houses);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

router.post('/api/v1/getHouses', async (req, res) => {
  try {
    let houses = await dbclient.getHouses(req.body.addresses);
    console.log(houses);
    res.send(houses);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

router.post('/api/v1/newHouse', async (req, res) => {
  let newHouseQuery = "INSERT INTO homes VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)";
  let values = [];
  values[0] = req.body.address;
  values[1] = req.body.zip;
  values[2] = req.body.price;
  values[3] = req.body.beds;
  values[4] = req.body.baths;
  values[5] = req.body.description;
  values[6] = req.body.showinfo;
  values[7] = req.body.availabilities;
  values[8] = req.body.sold;
  values[9] = req.body.pictures;
  try {
    let result = await dbclient.pool.query(newHouseQuery, values);
    res.sendStatus(201);
  } catch (err) {
    console.error(err);
    res.sendStatus(400);
  }
});

router.post('/api/v1/deleteHouse', async (req, res) => {
  let deleteQuery = "DELETE FROM homes WHERE address = $1 AND zip = $2";
  console.log(req.body);
  if (!req.body.address || !req.body.zip) {
    res.sendStatus(400);
    return;
  }
  let values = [req.body.address, req.body.zip];
  try {
    await dbclient.pool.query(deleteQuery, values);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

router.post('/api/v1/editHouse', async (req, res) => {
  let editQuery = "UPDATE homes SET";
  delete req.body.temp; // remove temporary fields
  let counter = 1;
  let data = [];
  Object.entries(req.body).forEach(keyValue => {
    if (keyValue[1] === null || keyValue[0] == "address" || keyValue[0] == "zip") return;
    editQuery += ` ${keyValue[0]} = $${counter},`;
    data.push(keyValue[1]);
    counter++;
  });
  editQuery = editQuery.slice(0, -1); // remove traililng comma
  editQuery += ` WHERE address = $${counter} AND zip = $${counter+1}`;
  data.push(req.body.address);
  data.push(req.body.zip);
  try {
    await dbclient.pool.query(editQuery, data);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    console.log(editQuery);
    console.log(JSON.stringify(data));
    res.sendStatus(500);
  }
});

router.get('/api/v1/requests', auth, async (req, res) => {
    res.send(getAllRequests());
});

module.exports = router;

const { Pool } = require('pg');
const sql = require('sql');
const moment = require('moment');

// Encryption setup
const bcrypt = require('bcrypt');
const salt = 10; // saltiness 10/10

sql.setDialect('postgres');
const pool = new Pool();

module.exports = {
  pool: pool,
  add: async function (table, data) {
    console.log("stub add");
  },
  get: async function (table, selector) {
    console.log("stub get");
  },
  update: async function (table, updatedData, selector) {
    console.log("stub update");
  },
  delete: async function (table, selector) {
    console.log("stub delete");
  },
  searchPartialAddress: async function (address) {
    const searchQuery = "SELECT address AS address, zip AS zip, pictures AS pictures FROM homes WHERE address ILIKE $1";
    try {
      let results = await pool.query(searchQuery, ['%'+address+'%']);
      return results;
    } catch (err) {
      console.error(err);
      console.log("FAILED TO SEARCH!  You probably need to whitelist the server IP in DB config :)");
      return null;
    }
  },
  findAgent: async function (addressRowString) {
    // for now, just select all 1 agents
    console.log("THIS FUNCTION IS DEPRECATED, DON'T USE");
    const searchQuery = "SELECT * FROM agents";
    try {
      let results = await pool.query(searchQuery);
      return results.rows;
    } catch (err) {
      console.error(err);
      return null;
    }
  },
  getAllAgents: async function () {
    const searchQuery = "SELECT * FROM agents";
    try {
      let results = await pool.query(searchQuery);
      return results.rows;
    } catch (err) {
      console.error(err);
      return null;
    }
  },
  getAgentById: async function (id) {
    const q = "SELECT * FROM agents WHERE id = $1";
    try {
      let results = await pool.query(q, [id]);
      return results.rows[0];
    } catch (err) {
      console.error(err);
      return null;
    }
  },
  registerBuyer: async function (sessionId) {
    const insertBuyer = "INSERT INTO buyers VALUES ($1, NULL, NULL, NULL, 'false') ON CONFLICT DO NOTHING";
    const values = [sessionId];
    try {
      let response = await pool.query(insertBuyer, values);
    } catch (err) {
      console.log(err);
    }
  },
  rateAgent: async function (agentId, rating) {

    const date = moment().format();
    const rate = "INSERT INTO agentratings VALUES ($1, NULL, $2, NULL, NULL)";
    const values = [agentId, rating];
    try {
      let response = await pool.query(rate, values);
      console.log(response);
    } catch (err) {
      console.log(err);
    }
  },
  checkLogin: async function (email, password) {
    const q = "SELECT * FROM agents WHERE email = $1";
    const values = [email];
    try {
      let response = await pool.query(q, values);
      if (response.rows.length !== 1) return false; // if no/too-many matches, fail
      let hash = response.rows[0].password;
      let success = await bcrypt.compare(password, hash);
      if (!success) return false;
      return {
        success: true,
        email: email,
        user: response.rows[0]
      }
    } catch (err) {
      throw err;
    }
  },
  registerAgentToken: async function (email, token) {
    const q = "UPDATE agents SET tokens = array_append(tokens, $1) WHERE email = $2";
    const values = [token, email];
    try {
      let response = await pool.query(q, values);
      console.log("updated token: "+response);
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  getAgentTokens: async function (email) {
    const q = "SELECT tokens FROM agents WHERE email = $1";
    try {
      let response = await pool.query(q, [email]);
      if (response.rows.length !== 1) return null; // some kind of error
      return response.rows[0].tokens;
    } catch (err) {
      console.log(err);
      return null;
    }
  },
  getAllHouses: async function () {
    const q = "SELECT * FROM homes";
    let response = await pool.query(q);
    return response.rows;
  },
  getHouses: async function (addresses) {
    var params = [];
    for(var i = 1; i <= addresses.length; i++) {
      params.push('$' + i);
    }
    var q = 'SELECT * FROM homes WHERE address IN (' + params.join(',') + ')';
    try {
      let response = await pool.query(q, addresses);
      return response.rows;
    } catch (err) {
      console.log(err);
      return null;
    }
  },
  reserveHouse: async function (address) {
    // try to lock the house.  return true if successful, false if otherwise
    const q = "UPDATE homes SET locked = $1 WHERE address = $2 AND zip = $3 AND "

  },
  unlockHouse: async function (address) {
    
  }
}

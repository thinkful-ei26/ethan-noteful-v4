'use strict';

const express = require('express');
const passport = require('passport');
const jsonwebtoken = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRY } = require('../config');

const router = express.Router();

const options = {
  session: false, 
  failWithError: true
};

const localAuth = passport.authenticate('local', options);

function createAuthToken (user) {
  return jsonwebtoken.sign({ user }, JWT_SECRET, {
    subject: user.username,
    expiresIn: JWT_EXPIRY
  });
}

router.post('/login', localAuth, function (req,res) {
  // console.log(req.user);
  const authToken = createAuthToken(req.user);
  res.json({ authToken });
  // return res.json(req.user);
});


module.exports = router;
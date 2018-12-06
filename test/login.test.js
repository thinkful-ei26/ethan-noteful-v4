'use strict';

const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const User = require('../models/user');

const { TEST_MONGODB_URI, JWT_SECRET } = require('../config');
const { users } = require('../db/data');

const expect = chai.expect;

chai.use(chaiHttp);

describe('Noteful API - Login', function () {
  // const username = 'exampleUser';
  // const password = 'examplePass';
  // const fullname = 'Example User';

  before(function () {
    return mongoose.connect(TEST_MONGODB_URI, { useNewUrlParser: true, useCreateIndex : true })
      .then(() => 
        User.deleteMany());
    // User.dropIndexes();
  });

  let token;
  let user; 

  beforeEach(function () {
    return Promise.all([
      User.insertMany(users),
      User.createIndexes(),
    ])
      .then(([users]) => {
        console.log(users);
        user = users[0];
        token = jwt.sign({ user }, JWT_SECRET, { subject: user.username });
      });
  });

  afterEach(function () {
    return User.deleteMany();
  });

  after(function () {
    return mongoose.disconnect();
  });
  
  
  describe('POST /api/login', function () {

    it.only('Should allow a user to login', function () {
      let res;
      return chai
        .request(app)
        .post('/api/login')
        .send( user.username, user.password )
        .then(_res => {
          res = _res;
          // console.log(res);
          expect(res).to.have.status(201);
          expect(res.body).to.be.an('object');
        });
    });
  });
});
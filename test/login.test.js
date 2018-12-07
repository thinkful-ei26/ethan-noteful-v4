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
        // console.log(users);
        user = users[0];
        user.password = 'password';
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

    // const username = user.username;
    // const password = 'password';
    // console.log(username, password);

    it.only('Should allow an existing user to login', function () {
      // console.log(user);
      const { username, password } = user;
      // console.log(username, password);
      let res;
      return chai
        .request(app)
        .post('/api/login')
        .send({ username, password })
        .then(_res => {
          res = _res;
          // console.log(res.body.authToken);
          expect(res).to.have.status(200);
          expect(res.body).to.be.an('object');
          expect(res.body.authToken).to.be.a('string');
        });
    });

    it.only('Should reject a user logging in with an incorrect password', function () {
      // console.log(user);
      const { username } = user;
      const password = crypto.randomBytes(8).toString('hex');

      let res;
      return chai
        .request(app)
        .post('/api/login')
        .send({ username, password })
        .then(_res => {
          res = _res;
          // console.log(res.body);
          expect(res).to.have.status(401);
          expect(res.body).to.be.an('object');
          expect(res.body.name).to.equal('AuthenticationError');
          expect(res.body.message).to.equal('Unauthorized');
        });
    });

    it.only('Should reject a user logging in with an incorrect username', function () {
      const { password } = user;
      const username = crypto.randomBytes(8).toString('hex');

      let res;
      return chai
        .request(app)
        .post('/api/login')
        .send({ username, password })
        .then(_res => {
          res = _res;
          // console.log(res.body);
          expect(res).to.have.status(401);
          expect(res.body).to.be.an('object');
          expect(res.body.name).to.equal('AuthenticationError');
          expect(res.body.message).to.equal('Unauthorized');
        });
    });

    it.only('Should reject a user logging in with no credentials', function () {
      let res;
      return chai
        .request(app)
        .post('/api/login')
        .send({})
        .then(_res => {
          res = _res;
          // console.log(res);
          expect(res).to.have.status(400);
          expect(res.body).to.be.an('object');
          expect(res.body.name).to.equal('AuthenticationError');
          expect(res.body.message).to.equal('Bad Request');
        });
    });

    it.only('Should return a valid auth token', function () {
      let res;
      const { username, password, fullname, id } = user;

      return chai
        .request(app)
        .post('/api/login')
        .send({ username, password })
        .then(_res => {
          res = _res;
          expect(res).to.have.status(200);
          expect(res.body).to.be.an('object');
          expect(res.body.authToken).to.be.a('string');
          const payload = jwt.verify(token, JWT_SECRET, {
            algorithm: ['HS256']
          });
          // console.log(payload.user);
          expect(payload.user).to.deep.equal({
            fullname,
            id,
            username
          });
        });
    });



  });
});
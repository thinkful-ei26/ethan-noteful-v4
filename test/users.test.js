'use strict';

const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const crypto = require('crypto');

const { TEST_MONGODB_URI } = require('../config');

const User = require('../models/user');

const expect = chai.expect;


chai.use(chaiHttp);

describe('Noteful API - Users', function () {
  const username = 'exampleUser';
  const password = 'examplePass';
  const fullname = 'Example User';

  before(function () {
    return mongoose.connect(TEST_MONGODB_URI, { useNewUrlParser: true, useCreateIndex : true })
      .then(() => User.deleteMany());
  });

  beforeEach(function () {
    return User.createIndexes();
  });

  afterEach(function () {
    return User.deleteMany();
  });

  after(function () {
    return mongoose.disconnect();
  });

  describe('POST /api/users', function () {

    it('Should create a new user', function () {
      let res;
      return chai
        .request(app)
        .post('/api/users')
        .send({ username, password, fullname })
        .then(_res => {
          res = _res;
          expect(res).to.have.status(201);
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('id', 'username', 'fullname');
          expect(res.body.id).to.exist;
          expect(res.body.username).to.equal(username);
          expect(res.body.fullname).to.equal(fullname);
          return User.findOne({ username });
        })
        .then(user => {
          expect(user).to.exist;
          expect(user.id).to.equal(res.body.id);
          expect(user.fullname).to.equal(fullname);
          return user.validatePassword(password);
        })
        .then(isValid => {
          expect(isValid).to.be.true;
        });
    });

    it('Should reject users with missing username', function (){
      let results;
      return chai
        .request(app)
        .post('/api/users')
        .send({ password, fullname })
        .then( response => {
          results = response;
          expect(results).to.have.status(422);
          // console.log(results.body);
          expect(results.body.message).to.equal('Missing username in request');
        });
    });


    it('Should reject users with missing password', function (){
      let results;
      return chai
        .request(app)
        .post('/api/users')
        .send({ username, fullname })
        .then(response => {
          results = response;
          expect(results).to.have.status(422);
          expect(results.body.message).to.equal('Missing password in request');
        });
    });

    it('Should reject users with non-string username', function (){
      let results;
      return chai
        .request(app)
        .post('/api/users')
        .send({ username: Math.random(), password, fullname })
        .then( response => {
          results = response;
          expect(results).to.have.status(422);
          expect(results.body.message).to.equal('username should be a string!');
        });
    });
    
    it('Should reject users with non-string password', function (){
      let results;
      return chai
        .request(app)
        .post('/api/users')
        .send({ username, password: Math.random(), fullname })
        .then( response => {
          results = response;
          expect(results).to.have.status(422);
          expect(results.body.message).to.equal('password should be a string!');
        });
    });
    
    it('Should reject users with non-trimmed username', function (){
      let results;
      return chai
        .request(app)
        .post('/api/users')
        .send({ username: ' bob', password, fullname })
        .then( response => {
          results = response;
          expect(results).to.have.status(422);
          expect(results.body.message).to.equal('username cannot contain leading or trailing spaces!');
        });
    });

    it('Should reject users with non-trimmed password', function (){
      let results;
      return chai
        .request(app)
        .post('/api/users')
        .send({ username, password: ' password', fullname })
        .then( response => {
          results = response;
          expect(results).to.have.status(422);
          expect(results.body.message).to.equal('password cannot contain leading or trailing spaces!');
        });
    });
    
    it('Should reject users with empty username', function (){
      let results;
      return chai
        .request(app)
        .post('/api/users')
        .send({ username: '', password, fullname })
        .then( response => {
          results = response;
          expect(results).to.have.status(422);
          expect(results.body.message).to.equal('Username can\'t be empty!');
        });
    });

    it('Should reject users with password less than 8 characters', function (){
      let results;
      const shortPw = crypto.randomBytes(2).toString('hex');
      // console.log(shortPw);
      return chai
        .request(app)
        .post('/api/users')
        .send({ username, password: shortPw, fullname })
        .then( response => {
          results = response;
          expect(results).to.have.status(422);
          expect(results.body.message).to.equal('Password must be between 8 and 72 characters!');
        });
    });

    it('Should reject users with password greater than 72 characters', function (){
      let results;
      const longPw = crypto.randomBytes(40).toString('hex');
      // console.log(longPw);
      return chai
        .request(app)
        .post('/api/users')
        .send({ username, password: longPw, fullname })
        .then( response => {
          results = response;
          expect(results).to.have.status(422);
          expect(results.body.message).to.equal('Password must be between 8 and 72 characters!');
        });
    });
    
    it('Should reject users with duplicate username', function () {
      let results;
      return chai
        .request(app)
        .post('/api/users')
        .send({ username, password, fullname })
        .then(() => {
          return chai
            .request(app)
            .post('/api/users')
            .send({ username, password, fullname });
        })
        .then(response => {
          results = response;
          // console.log(results.body);
          expect(results).to.have.status(400);
          expect(results.body.message).to.equal('username already exists');
        });
    });

    it('Should trim fullname', function () {
      let whitespaceFullname = '   bob';
      let res;
      return chai
        .request(app)
        .post('/api/users')
        .send({ username, password, fullname: `${whitespaceFullname}` })
        .then(_res => {
          res = _res;
          expect(res).to.have.status(201);
          expect(res.body).to.be.an('object');
          // console.log(res.body);
          expect(res.body).to.have.keys('id', 'username', 'fullname');
          expect(res.body.id).to.exist;
          expect(res.body.username).to.equal(username);
          expect(res.body.fullname).to.equal(whitespaceFullname.trim());
          return User.findOne({ username });
        })
        .then(user => {
          expect(user).to.exist;
          expect(user.id).to.equal(res.body.id);
          expect(user.fullname).to.equal(whitespaceFullname.trim());
        });
    });

  });

});
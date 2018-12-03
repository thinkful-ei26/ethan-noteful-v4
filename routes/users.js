'use strict';

const express = require('express');
// const mongoose = require('mongoose');

const User = require('../models/user');

const router = express.Router();

router.post('/', (req, res, next) => {
  const { fullName, username, password } = req.body;
  
  const requiredFields = ['username', 'password'];
  const missingField = requiredFields.find(
    field => !(field in req.body)
  );
  if (missingField) {
    const err = new Error(`Missing ${missingField} in request`);
    err.status = 422;
    return next(err);
  }

  if (username.length < 1) {
    const err = new Error('Username can\'t be empty!');
    err.status = 422;
    return next(err);
  }

  if (password.length < 8 || password.length > 72) {
    const err = new Error('Password must be between 8 and 72 characters!');
    err.status = 422;
    return next(err);
  }

  const stringFields = ['fullName', 'username', 'password'];
  const nonStringField = stringFields.find(
    field => field in req.body && typeof req.body[field] !== 'string'
  );
  if (nonStringField) {
    const err = new Error(`${nonStringField} should be a string!`);
    err.status = 422;
    return next(err);
  }

  const nonWhitespaceFields = ['username', 'password'];
  // console.log(nonWhitespaceFields);

  const whitespaceField = nonWhitespaceFields.find(
    field => field in req.body && (req.body[field].trim() !== req.body[field])
  );
  console.log(whitespaceField);
  if (whitespaceField) {
    const err = new Error(`${whitespaceField} cannot contain leading or trailing spaces!`);
    err.status = 422;
    return next(err);
  }


 
  // if (req.body)
  // const usernameMin = ['username'];
  // usernameMin.find(
  //   field => field in req.body && req.body[field].length < 1
  // )


  return User.hashPassword(password)
    .then(digest => {
      const newUser = {
        username,
        password: digest,
        fullName
      };
      return User.create(newUser);
    })
    .then(result => {
      res.location(`/api/users/${result.id}`).status(201).json(result);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('username already exists');
        err.status = 400;
      }
      next(err);
    });
  // User.create(newUser)
  //   .then(result => {
  //     res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
  //   })
  //   .catch(err => {
  //     console.error(`ERROR: ${err.message}`);
  //     next(err);
  //   });
});

module.exports = router;
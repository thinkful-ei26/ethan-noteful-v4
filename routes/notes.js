'use strict';

const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');

const Note = require('../models/note');
const Folder = require('../models/folder');
const Tag = require('../models/tag');


const router = express.Router();

router.use('/', passport.authenticate('jwt', { session: false, failWithError: true}));

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  const { searchTerm, folderId, tagId } = req.query;
  const userId = req.user.id;

  let filter = {};

  filter.userId = userId;

  if (searchTerm) {
    const re = new RegExp(searchTerm, 'i');
    filter.$or = [{ 'title': re }, { 'content': re }];
  }

  if (folderId) {
    filter.folderId = folderId;
  }

  if (tagId) {
    filter.tags = tagId;
  }

  Note.find(filter)
    .populate('tags')
    .sort({ updatedAt: 'desc' })
    .then(results => {
      res.json(results);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  // console.log(req.user);

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findOne({ _id: id, userId })
    .populate('tags')
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  const { title, content, folderId, tags } = req.body;
  const userId = req.user.id;
  // console.log(req.body);

  /***** Never trust users - validate input *****/
  if (!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  if (folderId && !mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return next(err);
  }

  if (tags) {
    if (!Array.isArray(tags)) {
      const err = new Error('The tags property must be an array');
      err.status = 400;
      return next(err);
    }
    const badIds = tags.filter(tag => !mongoose.Types.ObjectId.isValid(tag));
    if (badIds.length) {
      const err = new Error('The `tags` array contains an invalid `id`');
      err.status = 400;
      return next(err);
    }
  }

  const newNote = { title, content, folderId, tags, userId };
  if (newNote.folderId === '') {
    delete newNote.folderId;
  }

  // console.log(newNote);



  Tag.countDocuments({
    _id: { $in: newNote.tags },
    userId: newNote.userId
  })
    .then(results => {
      if (newNote.tags && results !== newNote.tags.length ) {
        const err = new Error('The tags array contains an invalid id!');
        err.status = 400;
        return next(err);
      } else if (!newNote.folderId) {
        return Promise.resolve(true);
      } else {
        return Folder.countDocuments({
          _id: newNote.folderId,
          userId: newNote.userId
        });
      }
    })
    .then(count => {
      // console.log(count);
      if (count) {
        return Note.create(newNote);
      } else {
        const err = new Error('The folderId is not valid!');
        err.status = 400;
        return next(err);
      }
    })
    .then(result => {
      // console.log(result);
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
    .catch(err => {
      next(err);
    });
});
  

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  const toUpdate = {};

  toUpdate.userId = userId;

  // if (userId)

  const updateableFields = ['title', 'content', 'folderId', 'tags'];

  updateableFields.forEach(field => {
    if (field in req.body) {
      toUpdate[field] = req.body[field];
    }
  });

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  if (toUpdate.title === '') {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  if (toUpdate.folderId && !mongoose.Types.ObjectId.isValid(toUpdate.folderId)) {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return next(err);
  }

  if (toUpdate.tags) {
    if (!Array.isArray(toUpdate.tags)) {
      const err = new Error('The tags property must be an array');
      err.status = 400;
      return next(err);
    }
    const badIds = toUpdate.tags.filter((tag) => !mongoose.Types.ObjectId.isValid(tag));
    if (badIds.length) {
      const err = new Error('The `tags` array contains an invalid `id`');
      err.status = 400;
      return next(err);
    }
  }

  if (toUpdate.folderId === '') {
    delete toUpdate.folderId;
    toUpdate.$unset = {folderId : 1};
  }
  
  Tag.countDocuments({
    _id: { $in: toUpdate.tags },
    userId: toUpdate.userId
  })
    .then(results => {
      if (toUpdate.tags && results !== toUpdate.tags.length) {
        const err = new Error('The tags array contains an invalid id!');
        err.status = 400;
        return next(err);
      } else if (!toUpdate.folderId) {
        return Promise.resolve(true);
      } else {
        return Folder.countDocuments({
          _id: toUpdate.folderId,
          userId: toUpdate.userId
        });
      }
    })
    .then(count => {
      if (count) {
        // console.log(toUpdate);
        return Note.findOneAndUpdate({ _id: id, userId}, toUpdate, { new: true });
        // .populate('tags');
      } else {
        const err = new Error('The folderId is not valid');
        err.status = 400;
        return next(err);
      }
    })
    .then(result => {
      // console.log(toUpdate);
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

//   Note.findByIdAndUpdate(id, toUpdate, { new: true })
//     .then(result => {
//       if (result) {
//         res.json(result);
//       } else {
//         next();
//       }
//     })
//     .catch(err => {
//       next(err);
//     });
// });

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findOneAndRemove({ _id: id, userId})
    .then(() => {
      res.sendStatus(204);
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;

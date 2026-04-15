'use strict';

const { validationResult } = require('express-validator');

const { buildIndex, getRagStatus, queryRagMemory } = require('../services/ragService');

function validationError(res, errors) {
  return res.status(400).json({
    errors: errors.array(),
  });
}

async function queryRag(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationError(res, errors);
  }

  try {
    const result = await queryRagMemory(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function buildRagIndex(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationError(res, errors);
  }

  try {
    const result = await buildIndex(req.body);
    return res.status(200).json({
      status: 'ok',
      ...result,
    });
  } catch (error) {
    return next(error);
  }
}

async function getRagIndexStatus(_req, res, next) {
  try {
    return res.status(200).json({
      index: getRagStatus(),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  buildRagIndex,
  getRagIndexStatus,
  queryRag,
};

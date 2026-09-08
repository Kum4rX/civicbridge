const express = require('express');
const petitionController = require('../controllers/petition.controller');
const {
  createPetitionValidator,
  updatePetitionValidator,
  petitionQueryValidator,
  petitionIdValidator
} = require('../validators/petition.validator');
const validate = require('../middleware/validate.middleware');
const authenticate = require('../middleware/auth.middleware');

const router = express.Router();

// Public routes
router.get('/', petitionQueryValidator, validate, petitionController.getPetitions);

// Protected routes (Specific routes before parameter routes)
router.get('/my', authenticate, petitionQueryValidator, validate, petitionController.getMyPetitions);
router.post('/', authenticate, createPetitionValidator, validate, petitionController.createPetition);

// Single petition routes
router.get('/:id', petitionIdValidator, validate, petitionController.getPetitionById);
router.put('/:id', authenticate, updatePetitionValidator, validate, petitionController.updatePetition);
router.delete('/:id', authenticate, petitionIdValidator, validate, petitionController.deletePetition);

module.exports = router;

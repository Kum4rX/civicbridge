const petitionService = require('../services/petition.service');
const { sendSuccess } = require('../utils/response');

class PetitionController {
  /**
   * Create a new petition
   */
  async createPetition(req, res, next) {
    try {
      const userId = req.user._id || req.user.id;
      const petition = await petitionService.create(userId, req.body);
      return sendSuccess(res, 201, 'Petition created successfully', { petition });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all petitions with search, filtering, and pagination
   */
  async getPetitions(req, res, next) {
    try {
      const userId = req.user ? (req.user._id || req.user.id) : null;
      const result = await petitionService.findAll(req.query, userId);
      return sendSuccess(res, 200, 'Petitions retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user's petitions
   */
  async getMyPetitions(req, res, next) {
    try {
      const userId = req.user._id || req.user.id;
      const result = await petitionService.findByUser(userId, req.query);
      return sendSuccess(res, 200, 'User petitions retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single petition by ID
   */
  async getPetitionById(req, res, next) {
    try {
      const userId = req.user ? (req.user._id || req.user.id) : null;
      const petition = await petitionService.findById(req.params.id, userId);
      return sendSuccess(res, 200, 'Petition retrieved successfully', { petition });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a petition
   */
  async updatePetition(req, res, next) {
    try {
      const userId = req.user._id || req.user.id;
      const petition = await petitionService.update(
        req.params.id,
        userId,
        req.body
      );
      return sendSuccess(res, 200, 'Petition updated successfully', { petition });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a petition
   */
  async deletePetition(req, res, next) {
    try {
      const userId = req.user._id || req.user.id;
      const result = await petitionService.delete(req.params.id, userId);
      return sendSuccess(res, 200, 'Petition deleted successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sign a petition
   */
  async signPetition(req, res, next) {
    try {
      const userId = req.user._id || req.user.id;
      const result = await petitionService.sign(req.params.id, userId);
      return sendSuccess(res, 200, 'Petition signed successfully', { petition: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get petitions signed by current user
   */
  async getSignedPetitions(req, res, next) {
    try {
      const userId = req.user._id || req.user.id;
      const result = await petitionService.findSignedByUser(userId, req.query);
      return sendSuccess(res, 200, 'Signed petitions retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add official response to petition
   */
  async addResponse(req, res, next) {
    try {
      const { message, status } = req.body;
      const result = await petitionService.addResponse(
        req.params.id,
        req.user,
        message,
        status
      );
      return sendSuccess(res, 201, 'Official response added successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update petition status by authorized official
   */
  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const result = await petitionService.updateStatus(
        req.params.id,
        req.user,
        status
      );
      return sendSuccess(res, 200, 'Petition status updated successfully', result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PetitionController();

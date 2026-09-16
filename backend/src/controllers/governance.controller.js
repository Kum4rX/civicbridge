const governanceService = require('../services/governance.service');
const petitionService = require('../services/petition.service');
const { sendSuccess } = require('../utils/response');

class GovernanceController {
  /**
   * Get petitions for the authenticated official's locality
   */
  async getLocalityPetitions(req, res, next) {
    try {
      const result = await governanceService.findLocalityPetitions(req.user, req.query);
      return sendSuccess(res, 200, 'Locality petitions retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add an official governance response to a petition
   */
  async addOfficialResponse(req, res, next) {
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
   * Update petition status by an authorized official
   */
  async updatePetitionStatus(req, res, next) {
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

module.exports = new GovernanceController();

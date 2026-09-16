const reportService = require('../services/report.service');
const { sendSuccess } = require('../utils/response');

class ReportController {
  /**
   * Get high-level summary metrics for reports dashboard
   */
  async getSummary(req, res, next) {
    try {
      const summary = await reportService.getSummary(req.query);
      return sendSuccess(res, 200, 'Report summary retrieved successfully', summary);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get petition statistics breakdown
   */
  async getPetitionStats(req, res, next) {
    try {
      const stats = await reportService.getPetitionStats(req.query);
      return sendSuccess(res, 200, 'Petition statistics retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get poll statistics breakdown (from real M3 data)
   */
  async getPollStats(req, res, next) {
    try {
      const stats = await reportService.getPollStats(req.query);
      return sendSuccess(res, 200, 'Poll statistics retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get sentiment & participation time-series
   */
  async getSentiment(req, res, next) {
    try {
      const series = await reportService.getSentiment(req.query);
      return sendSuccess(res, 200, 'Civic sentiment trend retrieved successfully', series);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export comprehensive civic engagement report
   */
  async exportReport(req, res, next) {
    try {
      const format = req.query.format || 'csv';
      const result = await reportService.exportReport(req.query, format, req.user);

      res.setHeader('Content-Type', result.contentType);
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="' + result.filename + '"'
      );
      return res.status(200).send(result.content);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportController();

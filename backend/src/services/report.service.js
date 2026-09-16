const Petition = require('../models/petition.model');
const Poll = require('../models/poll.model');
const Vote = require('../models/vote.model');
const Signature = require('../models/signature.model');
const AdminLog = require('../models/admin-log.model');

class ReportService {
  /**
   * Helper to parse date range and locality filters
   */
  parseFilters(queryParams = {}) {
    const { city, state, from, to, month, year } = queryParams;

    let startDate = null;
    let endDate = null;

    if (month && year) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      if (!isNaN(m) && !isNaN(y) && m >= 1 && m <= 12) {
        startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
      }
    } else if (from || to) {
      if (from) {
        startDate = new Date(from);
      }
      if (to) {
        endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    const petitionLoc = {};
    const pollLoc = {};

    if (city && city.trim()) {
      const cityRegex = new RegExp(city.trim(), 'i');
      petitionLoc['location.city'] = cityRegex;
      pollLoc['targetLocation.city'] = cityRegex;
    }

    if (state && state.trim()) {
      const stateRegex = new RegExp(state.trim(), 'i');
      petitionLoc['location.state'] = stateRegex;
      pollLoc['targetLocation.state'] = stateRegex;
    }

    return {
      startDate,
      endDate,
      city: city ? city.trim() : null,
      state: state ? state.trim() : null,
      petitionLoc,
      pollLoc
    };
  }

  /**
   * Generate high-level summary metrics
   */
  async getSummary(queryParams = {}) {
    const { startDate, endDate, city, state, petitionLoc, pollLoc } =
      this.parseFilters(queryParams);

    // Petition queries
    const [
      totalPetitions,
      activePetitions,
      underReviewPetitions,
      closedPetitions,
      sigAgg,
      newPetitionsCount
    ] = await Promise.all([
      Petition.countDocuments(petitionLoc),
      Petition.countDocuments({ ...petitionLoc, status: 'active' }),
      Petition.countDocuments({ ...petitionLoc, status: 'under_review' }),
      Petition.countDocuments({ ...petitionLoc, status: 'closed' }),
      Petition.aggregate([
        { $match: petitionLoc },
        { $group: { _id: null, total: { $sum: '$signaturesCount' } } }
      ]),
      startDate && endDate
        ? Petition.countDocuments({
            ...petitionLoc,
            createdAt: { $gte: startDate, $lte: endDate }
          })
        : Petition.countDocuments(petitionLoc)
    ]);

    const totalSignatures = sigAgg[0] ? sigAgg[0].total : 0;
    const avgSignatures =
      totalPetitions > 0 ? Math.round((totalSignatures / totalPetitions) * 10) / 10 : 0;

    // Poll queries (Milestone 3 real data)
    const [totalPolls, activePolls, closedPolls, voteAgg] = await Promise.all([
      Poll.countDocuments(pollLoc),
      Poll.countDocuments({ ...pollLoc, status: 'active' }),
      Poll.countDocuments({ ...pollLoc, status: 'closed' }),
      Poll.aggregate([
        { $match: pollLoc },
        { $group: { _id: null, total: { $sum: '$totalVotes' } } }
      ])
    ]);

    const totalVotes = voteAgg[0] ? voteAgg[0].total : 0;

    // Response and activity metrics
    const responsesAgg = await Petition.aggregate([
      { $match: petitionLoc },
      { $project: { respCount: { $size: { $ifNull: ['$responses', []] } } } },
      { $group: { _id: null, total: { $sum: '$respCount' } } }
    ]);
    const totalResponses = responsesAgg[0] ? responsesAgg[0].total : 0;

    // Status updates count from AdminLog
    const statusUpdatesCount = await AdminLog.countDocuments({
      action: 'PETITION_STATUS_UPDATED'
    });

    const totalParticipation = totalSignatures + totalVotes;

    return {
      totalPetitions,
      newPetitions: newPetitionsCount,
      activePetitions,
      underReviewPetitions,
      closedPetitions,
      totalSignatures,
      avgSignatures,
      totalPolls,
      activePolls,
      closedPolls,
      totalVotes,
      totalResponses,
      totalStatusUpdates: statusUpdatesCount,
      totalParticipation,
      participationRate: Math.min(100, Math.round((totalParticipation / (totalPetitions * 50 + 1)) * 100)),
      scope: {
        city: city || 'All',
        state: state || 'All',
        from: startDate ? startDate.toISOString() : null,
        to: endDate ? endDate.toISOString() : null
      }
    };
  }

  /**
   * Detailed petition reports (status, category, locality breakdown, monthly trend)
   */
  async getPetitionStats(queryParams = {}) {
    const { startDate, endDate, petitionLoc } = this.parseFilters(queryParams);

    const matchFilter = { ...petitionLoc };
    if (startDate && endDate) {
      matchFilter.createdAt = { $gte: startDate, $lte: endDate };
    }

    const [byStatusAgg, byCategoryAgg, byLocalityAgg, monthlyAgg] =
      await Promise.all([
        Petition.aggregate([
          { $match: matchFilter },
          { $group: { _id: '$status', value: { $sum: 1 } } },
          { $sort: { value: -1 } }
        ]),
        Petition.aggregate([
          { $match: matchFilter },
          { $group: { _id: '$category', value: { $sum: 1 } } },
          { $sort: { value: -1 } }
        ]),
        Petition.aggregate([
          { $match: matchFilter },
          {
            $group: {
              _id: '$location.city',
              value: { $sum: 1 },
              signatures: { $sum: '$signaturesCount' }
            }
          },
          { $sort: { value: -1 } },
          { $limit: 10 }
        ]),
        Petition.aggregate([
          { $match: petitionLoc },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m', date: '$createdAt' }
              },
              petitions: { $sum: 1 },
              signatures: { $sum: '$signaturesCount' }
            }
          },
          { $sort: { _id: 1 } },
          { $limit: 12 }
        ])
      ]);

    const byStatus = byStatusAgg.map((item) => ({
      label: item._id || 'unknown',
      value: item.value
    }));

    const byCategory = byCategoryAgg.map((item) => ({
      label: item._id || 'Other',
      value: item.value
    }));

    const byLocality = byLocalityAgg
      .filter((item) => item._id)
      .map((item) => ({
        label: item._id,
        value: item.value,
        signatures: item.signatures
      }));

    const monthly = monthlyAgg.map((item) => ({
      month: item._id,
      petitions: item.petitions,
      signatures: item.signatures
    }));

    return {
      byStatus,
      byCategory,
      byLocality,
      monthly
    };
  }

  /**
   * Detailed poll reports (status, category, top participation, monthly trend)
   */
  async getPollStats(queryParams = {}) {
    const { startDate, endDate, pollLoc } = this.parseFilters(queryParams);

    const matchFilter = { ...pollLoc };
    if (startDate && endDate) {
      matchFilter.createdAt = { $gte: startDate, $lte: endDate };
    }

    const [byStatusAgg, byCategoryAgg, participationPolls, monthlyVotesAgg] =
      await Promise.all([
        Poll.aggregate([
          { $match: matchFilter },
          { $group: { _id: '$status', value: { $sum: 1 } } },
          { $sort: { value: -1 } }
        ]),
        Poll.aggregate([
          { $match: matchFilter },
          { $group: { _id: '$category', value: { $sum: 1 } } },
          { $sort: { value: -1 } }
        ]),
        Poll.find(matchFilter)
          .sort({ totalVotes: -1 })
          .limit(8)
          .select('title category totalVotes status'),
        Vote.aggregate([
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m', date: '$createdAt' }
              },
              votes: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } },
          { $limit: 12 }
        ])
      ]);

    const byStatus = byStatusAgg.map((item) => ({
      label: item._id || 'unknown',
      value: item.value
    }));

    const byCategory = byCategoryAgg.map((item) => ({
      label: item._id || 'Other',
      value: item.value
    }));

    const participation = participationPolls.map((poll) => ({
      label: poll.title.length > 30 ? poll.title.substring(0, 30) + '...' : poll.title,
      value: poll.totalVotes || 0
    }));

    const monthly = monthlyVotesAgg.map((item) => ({
      month: item._id,
      votes: item.votes
    }));

    return {
      byStatus,
      byCategory,
      participation,
      monthly
    };
  }

  /**
   * Time-series sentiment trend based on real M3 Poll & Vote data
   */
  async getSentiment(queryParams = {}) {
    const { startDate, endDate } = this.parseFilters(queryParams);

    const voteMatch = {};
    if (startDate && endDate) {
      voteMatch.createdAt = { $gte: startDate, $lte: endDate };
    }

    const monthlyVotes = await Vote.aggregate([
      { $match: voteMatch },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$createdAt' }
          },
          votes: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 12 }
    ]);

    // If votes are fewer than 1 month, provide current month representation
    if (monthlyVotes.length === 0) {
      const currentMonth = new Date().toISOString().substring(0, 7);
      const currentCount = await Vote.countDocuments();
      return [
        {
          month: currentMonth,
          votes: currentCount
        }
      ];
    }

    return monthlyVotes.map((m) => ({
      month: m._id,
      votes: m.votes
    }));
  }

  /**
   * Export comprehensive civic engagement report as CSV
   */
  async exportReport(queryParams = {}, format = 'csv', user = null) {
    const summary = await this.getSummary(queryParams);
    const petitions = await this.getPetitionStats(queryParams);
    const polls = await this.getPollStats(queryParams);

    const period =
      queryParams.month && queryParams.year
        ? `${queryParams.year}-${String(queryParams.month).padStart(2, '0')}`
        : new Date().toISOString().substring(0, 7);

    const lines = [];
    lines.push('CIVICBRIDGE CIVIC ENGAGEMENT REPORT');
    lines.push(`Generated At,${new Date().toISOString()}`);
    lines.push(`Reporting Period,${period}`);
    lines.push(`City Scope,${summary.scope.city}`);
    lines.push(`State Scope,${summary.scope.state}`);
    lines.push('');

    lines.push('EXECUTIVE SUMMARY');
    lines.push('Metric,Value');
    lines.push(`Total Petitions,${summary.totalPetitions}`);
    lines.push(`New Petitions,${summary.newPetitions}`);
    lines.push(`Active Petitions,${summary.activePetitions}`);
    lines.push(`Under Review Petitions,${summary.underReviewPetitions}`);
    lines.push(`Closed Petitions,${summary.closedPetitions}`);
    lines.push(`Total Signatures,${summary.totalSignatures}`);
    lines.push(`Average Signatures per Petition,${summary.avgSignatures}`);
    lines.push(`Total Polls,${summary.totalPolls}`);
    lines.push(`Active Polls,${summary.activePolls}`);
    lines.push(`Closed Polls,${summary.closedPolls}`);
    lines.push(`Total Poll Votes,${summary.totalVotes}`);
    lines.push(`Official Governance Responses,${summary.totalResponses}`);
    lines.push(`Status Updates,${summary.totalStatusUpdates}`);
    lines.push(`Total Civic Engagements,${summary.totalParticipation}`);
    lines.push('');

    lines.push('PETITIONS BY STATUS');
    lines.push('Status,Count');
    petitions.byStatus.forEach((s) => {
      lines.push(`"${s.label}",${s.value}`);
    });
    lines.push('');

    lines.push('PETITIONS BY CATEGORY');
    lines.push('Category,Count');
    petitions.byCategory.forEach((c) => {
      lines.push(`"${c.label}",${c.value}`);
    });
    lines.push('');

    lines.push('POLLS BY STATUS');
    lines.push('Status,Count');
    polls.byStatus.forEach((s) => {
      lines.push(`"${s.label}",${s.value}`);
    });
    lines.push('');

    lines.push('POLL PARTICIPATION');
    lines.push('Poll Title,Votes');
    polls.participation.forEach((p) => {
      lines.push(`"${p.label.replace(/"/g, '""')}",${p.value}`);
    });
    lines.push('');

    lines.push('MONTHLY ENGAGEMENT TREND');
    lines.push('Month,Petitions,Signatures,Votes');
    const allMonths = new Set([
      ...petitions.monthly.map((m) => m.month),
      ...polls.monthly.map((m) => m.month)
    ]);
    Array.from(allMonths)
      .sort()
      .forEach((m) => {
        const pet = petitions.monthly.find((p) => p.month === m);
        const pol = polls.monthly.find((p) => p.month === m);
        lines.push(
          `${m},${pet ? pet.petitions : 0},${pet ? pet.signatures : 0},${pol ? pol.votes : 0}`
        );
      });

    const csvContent = lines.join('\n');

    // Audit log
    if (user) {
      await AdminLog.create({
        action: 'REPORT_EXPORTED',
        userId: user._id || user.id,
        targetType: 'Report',
        targetId: period,
        details: {
          city: summary.scope.city,
          state: summary.scope.state,
          format
        }
      });
    }

    return {
      filename: `civicbridge-report-${period}.csv`,
      contentType: 'text/csv; charset=utf-8',
      content: csvContent
    };
  }
}

module.exports = new ReportService();

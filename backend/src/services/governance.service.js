const Petition = require('../models/petition.model');

class GovernanceService {
  /**
   * Find petitions in an official's locality
   */
  async findLocalityPetitions(officialUser, queryParams = {}) {
    const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = {};

    // Locality restriction based on authenticated official
    const officialCity = (
      (officialUser.location && officialUser.location.city) ||
      queryParams.city ||
      ''
    ).trim();

    const officialState = (
      (officialUser.location && officialUser.location.state) ||
      queryParams.state ||
      ''
    ).trim();

    if (officialCity) {
      filter['location.city'] = new RegExp('^' + officialCity + '$', 'i');
    }
    if (officialState) {
      filter['location.state'] = new RegExp('^' + officialState + '$', 'i');
    }

    // Status filter
    if (queryParams.status) {
      filter.status = queryParams.status.toLowerCase();
    }

    // Category filter
    if (queryParams.category) {
      filter.category = queryParams.category;
    }

    // Keyword search
    if (queryParams.search && queryParams.search.trim()) {
      const searchRegex = new RegExp(queryParams.search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { tags: { $in: [searchRegex] } }
      ];
    }

    // Sorting
    const sortBy = queryParams.sortBy || 'createdAt';
    const order = queryParams.order === 'asc' ? 1 : -1;
    const sort = { [sortBy]: order };

    const [petitions, total] = await Promise.all([
      Petition.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('creator', 'name email role location'),
      Petition.countDocuments(filter)
    ]);

    const formatted = petitions.map((p) => {
      const doc = p.toJSON();
      doc.responsesCount = (p.responses || []).length;
      doc.latestResponse =
        p.responses && p.responses.length
          ? p.responses[p.responses.length - 1]
          : null;
      return doc;
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      petitions: formatted,
      locality: {
        city: officialCity || null,
        state: officialState || null
      },
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }
}

module.exports = new GovernanceService();

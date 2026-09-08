const Petition = require('../models/petition.model');

class PetitionService {
  /**
   * Create a new petition
   */
  async create(userId, petitionData) {
    const {
      title,
      description,
      category,
      tags,
      targetSignatures,
      location,
      status,
      mediaUrls
    } = petitionData;

    const petition = await Petition.create({
      title,
      description,
      category,
      tags: Array.isArray(tags) ? tags : [],
      targetSignatures: targetSignatures || 100,
      location,
      creator: userId,
      status: status || 'active',
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : []
    });

    return await petition.populate('creator', 'name email role location');
  }

  /**
   * Find petitions with search, filtering, and pagination
   */
  async findAll(queryParams = {}) {
    const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = {};

    // Default to active petitions unless specifically queried
    if (queryParams.status) {
      filter.status = queryParams.status;
    } else {
      filter.status = 'active';
    }

    // Category filter
    if (queryParams.category) {
      filter.category = queryParams.category;
    }

    // City & State filters
    if (queryParams.city) {
      filter['location.city'] = new RegExp(queryParams.city.trim(), 'i');
    }
    if (queryParams.state) {
      filter['location.state'] = new RegExp(queryParams.state.trim(), 'i');
    }

    // Tag filter
    if (queryParams.tag) {
      filter.tags = queryParams.tag.trim().toLowerCase();
    }

    // Keyword search (searches title, description, and tags)
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

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      petitions,
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

  /**
   * Find petitions created by a specific user
   */
  async findByUser(userId, queryParams = {}) {
    const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = { creator: userId };

    if (queryParams.status) {
      filter.status = queryParams.status;
    }

    if (queryParams.category) {
      filter.category = queryParams.category;
    }

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

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      petitions,
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

  /**
   * Find a petition by ID
   */
  async findById(petitionId) {
    const petition = await Petition.findById(petitionId).populate(
      'creator',
      'name email role location'
    );

    if (!petition) {
      const error = new Error('Petition not found');
      error.statusCode = 404;
      throw error;
    }

    return petition;
  }

  /**
   * Update a petition (restricted to creator and only before signatures)
   */
  async update(petitionId, userId, updateData) {
    const petition = await Petition.findById(petitionId);

    if (!petition) {
      const error = new Error('Petition not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify creator ownership
    if (petition.creator.toString() !== userId.toString()) {
      const error = new Error('You are not authorized to modify this petition');
      error.statusCode = 403;
      throw error;
    }

    // Verify edit restriction before signatures
    if (petition.signaturesCount > 0) {
      const error = new Error('Cannot edit a petition that has already received signatures');
      error.statusCode = 400;
      throw error;
    }

    // Allowable fields for update
    const allowedFields = [
      'title',
      'description',
      'category',
      'tags',
      'targetSignatures',
      'location',
      'status',
      'mediaUrls'
    ];

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        petition[field] = updateData[field];
      }
    });

    await petition.save();

    return await petition.populate('creator', 'name email role location');
  }

  /**
   * Delete a petition (restricted to creator and only before signatures)
   */
  async delete(petitionId, userId) {
    const petition = await Petition.findById(petitionId);

    if (!petition) {
      const error = new Error('Petition not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify creator ownership
    if (petition.creator.toString() !== userId.toString()) {
      const error = new Error('You are not authorized to delete this petition');
      error.statusCode = 403;
      throw error;
    }

    // Verify delete restriction before signatures
    if (petition.signaturesCount > 0) {
      const error = new Error('Cannot delete a petition that has already received signatures');
      error.statusCode = 400;
      throw error;
    }

    await Petition.findByIdAndDelete(petitionId);

    return {
      deleted: true,
      id: petitionId
    };
  }
}

module.exports = new PetitionService();

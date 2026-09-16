const Petition = require('../models/petition.model');
const Signature = require('../models/signature.model');
const AdminLog = require('../models/admin-log.model');

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
  async findAll(queryParams = {}, userId = null) {
    const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = {};

    // Default to active petitions unless specifically queried
    if (queryParams.status) {
      filter.status = queryParams.status.toLowerCase();
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

    let userSignatures = new Set();
    if (userId && petitions.length > 0) {
      const petitionIds = petitions.map((p) => p._id);
      const sigs = await Signature.find({
        user: userId,
        petition: { $in: petitionIds }
      }).select('petition');
      userSignatures = new Set(sigs.map((s) => s.petition.toString()));
    }

    const formattedPetitions = petitions.map((p) => {
      const doc = p.toJSON();
      if (userId) {
        doc.hasSigned = userSignatures.has(p._id.toString());
      }
      return doc;
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      petitions: formattedPetitions,
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
      filter.status = queryParams.status.toLowerCase();
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
  async findById(petitionId, userId = null) {
    const petition = await Petition.findById(petitionId).populate(
      'creator',
      'name email role location'
    );

    if (!petition) {
      const error = new Error('Petition not found');
      error.statusCode = 404;
      throw error;
    }

    const doc = petition.toJSON();
    if (userId) {
      const sig = await Signature.findOne({ petition: petitionId, user: userId });
      doc.hasSigned = !!sig;
      doc.signedAt = sig ? sig.createdAt : null;
    }

    return doc;
  }

  /**
   * Sign a petition
   */
  async sign(petitionId, userId) {
    const petition = await Petition.findById(petitionId);

    if (!petition) {
      const error = new Error('Petition not found');
      error.statusCode = 404;
      throw error;
    }

    if (petition.status !== 'active') {
      const error = new Error('Cannot sign a petition that is not active');
      error.statusCode = 400;
      throw error;
    }

    const existing = await Signature.findOne({ petition: petitionId, user: userId });
    if (existing) {
      const error = new Error('You have already signed this petition');
      error.statusCode = 400;
      throw error;
    }

    await Signature.create({ petition: petitionId, user: userId });

    const updated = await Petition.findByIdAndUpdate(
      petitionId,
      { $inc: { signaturesCount: 1 } },
      { new: true }
    ).populate('creator', 'name email role location');

    const result = updated.toJSON();
    result.hasSigned = true;
    result.signedAt = new Date().toISOString();
    return result;
  }

  /**
   * Find petitions signed by current user
   */
  async findSignedByUser(userId, queryParams = {}) {
    const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const total = await Signature.countDocuments({ user: userId });
    const signatures = await Signature.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const petitionIds = signatures.map((s) => s.petition);
    const petitions = await Petition.find({ _id: { $in: petitionIds } }).populate(
      'creator',
      'name email role location'
    );

    const sigMap = new Map(signatures.map((s) => [s.petition.toString(), s.createdAt]));
    const orderedPetitions = petitionIds
      .map((id) => petitions.find((p) => p._id.toString() === id.toString()))
      .filter(Boolean)
      .map((p) => {
        const doc = p.toJSON();
        doc.hasSigned = true;
        doc.signedAt = sigMap.get(p._id.toString());
        return doc;
      });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      petitions: orderedPetitions,
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
   * Add official response to petition
   */
  async addResponse(petitionId, officialUser, message, newStatus = null) {
    const petition = await Petition.findById(petitionId);

    if (!petition) {
      const error = new Error('Petition not found');
      error.statusCode = 404;
      throw error;
    }

    // Locality authorization check
    const officialCity = (
      (officialUser.location && officialUser.location.city) ||
      ''
    )
      .trim()
      .toLowerCase();
    const petitionCity = (
      (petition.location && petition.location.city) ||
      ''
    )
      .trim()
      .toLowerCase();

    if (officialCity && petitionCity && officialCity !== petitionCity) {
      const error = new Error('You are only authorized to respond to petitions in your locality');
      error.statusCode = 403;
      throw error;
    }

    const responseEntry = {
      official: officialUser._id || officialUser.id,
      officialName: officialUser.fullName || officialUser.name || 'Official',
      officialRole: officialUser.role || 'OFFICIAL',
      message: message.trim(),
      status: newStatus ? newStatus.toLowerCase() : null,
      createdAt: new Date()
    };

    petition.responses.push(responseEntry);

    if (newStatus) {
      petition.status = newStatus.toLowerCase();
    }

    await petition.save();
    await petition.populate('creator', 'name email role location');

    // Audit log
    await AdminLog.create({
      action: 'OFFICIAL_RESPONSE_ADDED',
      userId: officialUser._id || officialUser.id,
      targetType: 'Petition',
      targetId: petition._id,
      details: {
        messagePreview: message.substring(0, 100),
        status: newStatus || null,
        city: petition.location ? petition.location.city : null
      }
    });

    const savedResponse = petition.responses[petition.responses.length - 1];
    return {
      response: {
        id: savedResponse._id.toString(),
        message: savedResponse.message,
        status: savedResponse.status,
        respondedBy: {
          id: (officialUser.id || officialUser._id).toString(),
          fullName: officialUser.fullName || officialUser.name,
          role: officialUser.role
        },
        createdAt: savedResponse.createdAt
      },
      petition: petition.toJSON()
    };
  }

  /**
   * Update petition status by official
   */
  async updateStatus(petitionId, officialUser, newStatus) {
    const petition = await Petition.findById(petitionId);

    if (!petition) {
      const error = new Error('Petition not found');
      error.statusCode = 404;
      throw error;
    }

    // Locality authorization check
    const officialCity = (
      (officialUser.location && officialUser.location.city) ||
      ''
    )
      .trim()
      .toLowerCase();
    const petitionCity = (
      (petition.location && petition.location.city) ||
      ''
    )
      .trim()
      .toLowerCase();

    if (officialCity && petitionCity && officialCity !== petitionCity) {
      const error = new Error('You are only authorized to update status of petitions in your locality');
      error.statusCode = 403;
      throw error;
    }

    const previousStatus = petition.status;
    petition.status = newStatus.toLowerCase();
    await petition.save();
    await petition.populate('creator', 'name email role location');

    // Audit log
    await AdminLog.create({
      action: 'PETITION_STATUS_UPDATED',
      userId: officialUser._id || officialUser.id,
      targetType: 'Petition',
      targetId: petition._id,
      details: {
        previousStatus,
        newStatus: petition.status,
        city: petition.location ? petition.location.city : null
      }
    });

    return {
      petition: petition.toJSON(),
      previousStatus,
      newStatus: petition.status,
      updatedAt: petition.updatedAt,
      updatedBy: {
        id: (officialUser.id || officialUser._id).toString(),
        name: officialUser.fullName || officialUser.name,
        role: officialUser.role
      }
    };
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

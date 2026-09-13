const mongoose = require('mongoose');
const Poll = require('../models/poll.model');
const Vote = require('../models/vote.model');

class PollService {
  /**
   * Create a new poll
   */
  async create(userId, pollData) {
    const title = (pollData.title || pollData.question || '').trim();
    const description = (pollData.description || '').trim();
    const category = (pollData.category || 'Governance').trim();
    const rawOptions = pollData.options || [];
    const loc = pollData.targetLocation || pollData.location || {};
    const status = pollData.status || 'active';
    const endDate = pollData.endDate || pollData.closingDate || null;

    // Normalize options
    const formattedOptions = rawOptions.map((opt) => {
      const text = typeof opt === 'string' ? opt.trim() : (opt && opt.text ? String(opt.text).trim() : '');
      return {
        _id: new mongoose.Types.ObjectId(),
        text,
        votesCount: 0
      };
    });

    // Check uniqueness
    const texts = formattedOptions.map((o) => o.text.toLowerCase());
    if (new Set(texts).size !== texts.length) {
      const error = new Error('Poll options must be unique');
      error.statusCode = 400;
      throw error;
    }

    const targetLocation = {
      address: loc.address || '',
      city: (loc.city || '').trim(),
      state: (loc.state || '').trim(),
      pincode: loc.pincode || '',
      latitude: loc.latitude !== undefined ? loc.latitude : null,
      longitude: loc.longitude !== undefined ? loc.longitude : null
    };

    const poll = await Poll.create({
      title,
      description,
      category,
      options: formattedOptions,
      creator: userId,
      targetLocation,
      status,
      endDate: endDate ? new Date(endDate) : null,
      totalVotes: 0
    });

    return await poll.populate('creator', 'name fullName email role location');
  }

  /**
   * Find polls with search, filtering, and pagination
   */
  async findAll(queryParams = {}, currentUserId = null) {
    const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = {};

    // Status filter (if provided, otherwise show all)
    if (queryParams.status) {
      filter.status = queryParams.status;
    }

    // Category filter
    if (queryParams.category) {
      filter.category = queryParams.category;
    }

    // City & State filters
    if (queryParams.city) {
      filter['targetLocation.city'] = new RegExp(queryParams.city.trim(), 'i');
    }
    if (queryParams.state) {
      filter['targetLocation.state'] = new RegExp(queryParams.state.trim(), 'i');
    }

    // Keyword search (title and description)
    if (queryParams.search && queryParams.search.trim()) {
      const searchRegex = new RegExp(queryParams.search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex }
      ];
    }

    // Sorting
    const sortBy = queryParams.sortBy || 'createdAt';
    const order = queryParams.order === 'asc' ? 1 : -1;
    const sort = { [sortBy]: order };

    const [polls, total] = await Promise.all([
      Poll.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('creator', 'name fullName email role location'),
      Poll.countDocuments(filter)
    ]);

    // If current user is provided, annotate whether they have voted
    let userVotesMap = new Map();
    if (currentUserId && polls.length > 0) {
      const pollIds = polls.map((p) => p._id);
      const userVotes = await Vote.find({
        poll: { $in: pollIds },
        user: currentUserId
      });
      userVotes.forEach((v) => {
        userVotesMap.set(v.poll.toString(), v.selectedOption.toString());
      });
    }

    const mappedPolls = polls.map((poll) => {
      const pollObj = poll.toJSON();
      if (currentUserId) {
        const votedOpt = userVotesMap.get(poll._id.toString());
        pollObj.hasVoted = !!votedOpt;
        pollObj.votedOptionId = votedOpt || null;
      }
      return pollObj;
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      polls: mappedPolls,
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
   * Find a single poll by ID
   */
  async findById(pollId, currentUserId = null) {
    const poll = await Poll.findById(pollId).populate(
      'creator',
      'name fullName email role location'
    );

    if (!poll) {
      const error = new Error('Poll not found');
      error.statusCode = 404;
      throw error;
    }

    const pollObj = poll.toJSON();

    // Check if current user has voted on this poll
    if (currentUserId) {
      const userVote = await Vote.findOne({
        poll: poll._id,
        user: currentUserId
      });
      pollObj.hasVoted = !!userVote;
      pollObj.votedOptionId = userVote ? userVote.selectedOption.toString() : null;
    }

    return pollObj;
  }

  /**
   * Cast a vote on a poll
   */
  async vote(pollId, userId, optionIdentifier) {
    const poll = await Poll.findById(pollId);

    if (!poll) {
      const error = new Error('Poll not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify poll is active
    if (poll.status === 'closed') {
      const error = new Error('Poll is closed and no longer accepting votes');
      error.statusCode = 400;
      throw error;
    }

    // Verify poll has not expired
    if (poll.endDate && new Date() > new Date(poll.endDate)) {
      const error = new Error('Poll has expired and voting is closed');
      error.statusCode = 400;
      throw error;
    }

    // Check for existing vote
    const existingVote = await Vote.findOne({ poll: poll._id, user: userId });
    if (existingVote) {
      const error = new Error('You have already voted on this poll');
      error.statusCode = 400;
      throw error;
    }

    // Match selected option by ObjectId or string ID
    const optIdStr = optionIdentifier ? optionIdentifier.toString() : '';
    const matchedOption = poll.options.find(
      (opt) => opt._id.toString() === optIdStr || opt.id === optIdStr
    );

    if (!matchedOption) {
      const error = new Error('Invalid option. The selected option does not belong to this poll');
      error.statusCode = 400;
      throw error;
    }

    let voteRecord;
    try {
      voteRecord = await Vote.create({
        poll: poll._id,
        user: userId,
        selectedOption: matchedOption._id,
        optionText: matchedOption.text
      });
    } catch (err) {
      if (err.code === 11000) {
        const error = new Error('You have already voted on this poll');
        error.statusCode = 400;
        throw error;
      }
      throw err;
    }

    // Atomically increment vote counts on the poll
    await Poll.updateOne(
      { _id: poll._id, 'options._id': matchedOption._id },
      {
        $inc: {
          'options.$.votesCount': 1,
          totalVotes: 1
        }
      }
    );

    const updatedPoll = await Poll.findById(pollId).populate(
      'creator',
      'name fullName email role location'
    );

    const resultPoll = updatedPoll.toJSON();
    resultPoll.hasVoted = true;
    resultPoll.votedOptionId = matchedOption._id.toString();

    return {
      poll: resultPoll,
      vote: voteRecord.toJSON()
    };
  }

  /**
   * Get live results and sentiment analytics for a poll
   */
  async getResults(pollId) {
    const poll = await Poll.findById(pollId).populate(
      'creator',
      'name fullName email role location'
    );

    if (!poll) {
      const error = new Error('Poll not found');
      error.statusCode = 404;
      throw error;
    }

    // Aggregate actual votes from the database Vote collection
    const voteAggregations = await Vote.aggregate([
      { $match: { poll: poll._id } },
      {
        $group: {
          _id: '$selectedOption',
          count: { $sum: 1 }
        }
      }
    ]);

    const voteCountMap = new Map();
    let totalVotesCount = 0;
    voteAggregations.forEach((item) => {
      const count = Number(item.count) || 0;
      voteCountMap.set(item._id.toString(), count);
      totalVotesCount += count;
    });

    // Build real-time options breakdown with dynamically calculated percentages
    const optionsResults = poll.options.map((opt) => {
      const optId = opt._id.toString();
      const votes = voteCountMap.get(optId) || opt.votesCount || 0;
      const percentage =
        totalVotesCount > 0
          ? Math.round((votes / totalVotesCount) * 1000) / 10
          : 0;

      return {
        id: optId,
        text: opt.text,
        votes,
        percentage
      };
    });

    return {
      pollId: poll._id.toString(),
      title: poll.title,
      question: poll.title,
      description: poll.description,
      status: poll.status,
      category: poll.category,
      totalVotes: totalVotesCount,
      options: optionsResults,
      location: poll.targetLocation,
      city: poll.targetLocation ? poll.targetLocation.city : null,
      state: poll.targetLocation ? poll.targetLocation.state : null,
      startDate: poll.startDate,
      endDate: poll.endDate,
      creator: poll.creator
    };
  }

  /**
   * Update poll status (e.g. close poll)
   */
  async updateStatus(pollId, userId, userRole, newStatus) {
    const poll = await Poll.findById(pollId);

    if (!poll) {
      const error = new Error('Poll not found');
      error.statusCode = 404;
      throw error;
    }

    // Permission check: only creator or official can change poll status
    const isCreator = poll.creator.toString() === userId.toString();
    const isOfficial = userRole === 'OFFICIAL';

    if (!isCreator && !isOfficial) {
      const error = new Error('You are not authorized to update this poll status');
      error.statusCode = 403;
      throw error;
    }

    poll.status = newStatus;
    await poll.save();

    return await poll.populate('creator', 'name fullName email role location');
  }
}

module.exports = new PollService();

const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema(
  {
    poll: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Poll',
      required: [true, 'Poll ID is required']
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    selectedOption: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Selected option ID is required']
    },
    optionText: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        if (ret._id) {
          ret.id = ret._id.toString();
        }
        if (ret.poll) {
          ret.pollId = ret.poll.toString ? ret.poll.toString() : ret.poll;
        }
        if (ret.user) {
          ret.userId = ret.user.toString ? ret.user.toString() : ret.user;
        }
        if (ret.selectedOption) {
          ret.optionId = ret.selectedOption.toString ? ret.selectedOption.toString() : ret.selectedOption;
        }
        return ret;
      }
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// CRITICAL: Compound unique index to strictly enforce single vote per user per poll at the database level
voteSchema.index({ poll: 1, user: 1 }, { unique: true });
voteSchema.index({ poll: 1, selectedOption: 1 });
voteSchema.index({ user: 1 });

const Vote = mongoose.model('Vote', voteSchema);

module.exports = Vote;

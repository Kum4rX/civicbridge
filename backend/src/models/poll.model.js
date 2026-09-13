const mongoose = require('mongoose');

const pollOptionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Option text is required'],
      trim: true,
      minlength: [1, 'Option text cannot be empty'],
      maxlength: [200, 'Option text cannot exceed 200 characters']
    },
    votesCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    _id: true,
    toJSON: {
      transform: function (doc, ret) {
        if (ret._id) {
          ret.id = ret._id.toString();
        }
        return ret;
      }
    }
  }
);

const pollSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Poll title or question is required'],
      trim: true,
      minlength: [5, 'Poll title must be at least 5 characters long'],
      maxlength: [300, 'Poll title cannot exceed 300 characters']
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      enum: {
        values: [
          'Infrastructure',
          'Environment',
          'Public Safety',
          'Health',
          'Education',
          'Transportation',
          'Sanitation',
          'Governance',
          'Other'
        ],
        message: 'Invalid category. Must be one of the supported categories'
      },
      default: 'Governance'
    },
    options: {
      type: [pollOptionSchema],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length >= 2 && val.length <= 10;
        },
        message: 'A poll must contain between 2 and 10 options'
      }
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required']
    },
    targetLocation: {
      address: { type: String, default: '', trim: true },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true
      },
      state: {
        type: String,
        required: [true, 'State is required'],
        trim: true
      },
      pincode: { type: String, default: '', trim: true },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null }
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'closed'],
        message: 'Status must be either active or closed'
      },
      default: 'active'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: null
    },
    totalVotes: {
      type: Number,
      default: 0,
      min: 0
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
        // Aliases for seamless frontend and API compatibility
        ret.question = ret.title;
        if (ret.targetLocation) {
          ret.location = ret.targetLocation;
          ret.city = ret.targetLocation.city;
          ret.state = ret.targetLocation.state;
        }
        if (ret.endDate) {
          ret.closingDate = ret.endDate.toISOString();
        }
        if (ret.options && Array.isArray(ret.options)) {
          ret.options = ret.options.map((opt) => ({
            id: opt._id ? opt._id.toString() : opt.id,
            text: opt.text,
            votes: opt.votesCount !== undefined ? opt.votesCount : 0
          }));
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

// Pre-save validation to ensure unique option texts
pollSchema.pre('save', function (next) {
  if (this.options && Array.isArray(this.options)) {
    const texts = this.options.map((o) => (o.text || '').trim().toLowerCase());
    const unique = new Set(texts);
    if (unique.size !== texts.length) {
      const error = new Error('Poll options must be unique');
      error.statusCode = 400;
      return next(error);
    }
  }
  next();
});

// Indexes for high performance querying
pollSchema.index({ status: 1, createdAt: -1 });
pollSchema.index({ 'targetLocation.city': 1, 'targetLocation.state': 1 });
pollSchema.index({ category: 1, status: 1 });
pollSchema.index({ creator: 1 });
pollSchema.index({ createdAt: -1 });

const Poll = mongoose.model('Poll', pollSchema);

module.exports = Poll;

const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema(
  {
    official: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    officialName: {
      type: String,
      required: true,
      trim: true
    },
    officialRole: {
      type: String,
      default: 'OFFICIAL',
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Response message is required'],
      trim: true,
      minlength: [5, 'Response message must be at least 5 characters'],
      maxlength: [5000, 'Response message cannot exceed 5000 characters']
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'under_review', 'closed', 'flagged'],
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    toJSON: {
      transform: function (doc, ret) {
        if (ret._id) {
          ret.id = ret._id.toString();
        }
        delete ret.__v;
        return ret;
      }
    }
  }
);

const petitionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters long'],
      maxlength: [150, 'Title cannot exceed 150 characters']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [20, 'Description must be at least 20 characters long'],
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
      }
    },
    tags: {
      type: [String],
      default: []
    },
    targetSignatures: {
      type: Number,
      default: 100,
      min: [10, 'Target signatures must be at least 10'],
      max: [1000000, 'Target signatures cannot exceed 1,000,000']
    },
    signaturesCount: {
      type: Number,
      default: 0,
      min: 0
    },
    location: {
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
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required']
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'active', 'under_review', 'closed', 'flagged'],
        message: 'Invalid petition status'
      },
      default: 'active'
    },
    mediaUrls: {
      type: [String],
      default: []
    },
    responses: {
      type: [responseSchema],
      default: []
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        if (ret._id) {
          ret.id = ret._id.toString();
        }
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      transform: function (doc, ret) {
        if (ret._id) {
          ret.id = ret._id.toString();
        }
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Pre-save hook to normalize and sanitize tags
petitionSchema.pre('save', function (next) {
  if (this.tags && Array.isArray(this.tags)) {
    this.tags = [...new Set(
      this.tags
        .map((tag) => (typeof tag === 'string' ? tag.trim().toLowerCase() : ''))
        .filter((tag) => tag.length > 0)
    )];
  }
  next();
});

// Indexes for high performance searching and filtering
petitionSchema.index({ title: 'text', description: 'text', tags: 'text' });
petitionSchema.index({ category: 1, status: 1 });
petitionSchema.index({ 'location.city': 1, 'location.state': 1 });
petitionSchema.index({ creator: 1 });
petitionSchema.index({ createdAt: -1 });

const Petition = mongoose.model('Petition', petitionSchema);

module.exports = Petition;

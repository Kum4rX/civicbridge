const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    targetType: {
      type: String,
      trim: true,
      default: null
    },
    targetId: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ip: {
      type: String,
      trim: true,
      default: null
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

adminLogSchema.index({ timestamp: -1 });
adminLogSchema.index({ userId: 1, timestamp: -1 });
adminLogSchema.index({ action: 1, timestamp: -1 });

const AdminLog = mongoose.model('AdminLog', adminLogSchema);

module.exports = AdminLog;

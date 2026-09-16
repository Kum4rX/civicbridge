const mongoose = require('mongoose');

const signatureSchema = new mongoose.Schema(
  {
    petition: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Petition',
      required: [true, 'Petition is required'],
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true
    },
    createdAt: {
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

// One signature per user per petition
signatureSchema.index({ petition: 1, user: 1 }, { unique: true });
signatureSchema.index({ user: 1, createdAt: -1 });

const Signature = mongoose.model('Signature', signatureSchema);

module.exports = Signature;

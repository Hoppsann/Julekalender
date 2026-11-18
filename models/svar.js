const mongoose = require('mongoose');

const svarSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  luke: { type: mongoose.Schema.Types.ObjectId, ref: 'Luke', required: true },
  answer: { type: String, required: true, trim: true },
  correct: { type: Boolean, default: null }
}, { timestamps: true });

svarSchema.index({ user: 1, luke: 1 }, { unique: true });

module.exports = mongoose.model('Svar', svarSchema);
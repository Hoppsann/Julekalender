const mongoose = require('mongoose');

const lukeSchema = new mongoose.Schema({
  dag: { type: Number, required: true, unique: true, min: 1, max: 24 },
  type: { type: String, enum: ['multiple_choice', 'open', 'video'], required: true },
  question: { type: String, required: true },
  options: [String],
  video_url: String,
  correct_answer: { type: String, required: true },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
});

module.exports = mongoose.model('Luke', lukeSchema);
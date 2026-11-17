const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['elev', 'admin'],
    default: 'elev'
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
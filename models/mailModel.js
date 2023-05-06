const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
  from: {type: String,require: true},
  to: { type: [String], required: true },
  subject: { type: String},
  text: { type: String},
  stared: { type: Boolean, default: false},
  sentAt: { type: Date, default: Date.now },
  labels: [{ type: String }],
  attachments: [{
    fileName: { type: String},
    contentType: { type: String},
    content: { type: Buffer,},
  }],
});

const Email = mongoose.model('Email', emailSchema);

module.exports = Email;

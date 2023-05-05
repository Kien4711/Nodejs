const mongoose = require('mongoose');

const labelSchema = new mongoose.Schema({
  user: {type: String,require: true},
  nameLabel: {type: String,require: true}
});

const Label = mongoose.model('Label', labelSchema);

module.exports = Label;

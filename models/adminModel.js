const mongoose=require('mongoose')

// Thiết lập schema cho người dùng
const adminSchema = new mongoose.Schema({
      adminId:{type: String,require: true},
      email: { type: String, required: true, unique: true },
      username: { type: String, required: true,},
      fullname: { type: String, required: true},
      phone: { type: String, required: true },
      address: { type: String, required: true },
      birthday: { type: Date, required: true },
      password: { type: String, required: true },
      otp: { type: String },
      avatar: { type: String }
    // otpCreatedTime: { type: Date }
  });

// Tạo model cho người dùng
const Admin = mongoose.model('Admin', adminSchema);
module.exports=Admin;
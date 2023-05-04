const express = require('express')
require('dotenv').config()
const router = express.Router()
var bodyParser = require('body-parser');
let async = require('async');
const fs = require('fs');
const bcrypt = require('bcrypt')
const saltRounds = 10;
const moment = require('moment')
const multer = require('multer');
const path = require('path')
//validator form
const {check, validationResult} = require('express-validator')
const registerValidator = require('../routes/validators/registerValidator')
const loginValidator = require('../routes/validators/loginValidator')


// var cookieParser = require('cookie-parser')
// const multiparty = require('multiparty');
router.use(bodyParser.urlencoded({ extended:false }))
router.use(bodyParser.json())

//db Model
const User = require('../models/userModel')
const Email = require('../models/mailModel')

const mongoose = require("mongoose");
db = require("../libs/db")
const urlencodedParser = bodyParser.urlencoded({ extended: false })


//session
const session = require('express-session')

router.use(session({
    secret: 'buitrungkien',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 10 * 60 * 1000 } // Thời gian sống của cookie là 10 phút
}))

//function send OTP
const accountSid = process.env.twilio_ACCOUNT_SID
const authToken = process.env.twilio_AUTH_TOKEN
const twilioNumber = process.env.twilio_Phone
const client = require('twilio')(accountSid, authToken);

async function sendOTP(phoneNumber, otp) {
  try {
    const message = await client.messages.create({
      body: `Your OTP is ${otp}`,
      from: twilioNumber,
      to: phoneNumber
    });
    console.log(message.sid);
    return message.sid;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to send OTP via SMS');
  }
}

const { v4: uuidv4 } = require('uuid');

function generateUserId() {
    return uuidv4();
}
//resful API
router.get('/', function(req, res) {
    res.render('login')
})
// router.post('/', function(req, res) {
//     res.render('home')
// })

////////////////////login//////////////////////////////////////////////////////
router.get('/login',loginValidator, function(req, res) {
    res.render('login')
})

router.post('/login', loginValidator, async (req, res) => {
    const result = validationResult(req);
  
    if (!result.isEmpty()) {
      return res.status(422).json({ code: 4, message: result });
    }
  
    try {
      // If validation passed
      if (req.body.email == "admin@gmail.com" && req.body.password == "123456") {
        req.session.admin = true;
        return res.redirect('/admin');
      }
  
      const user = await User.findOne({ email: req.body.email });
      if (!user) {
        return res.status(401).json({ code: 1, message: 'No user found with this email' });
      }
  
      const match = await bcrypt.compare(req.body.password, user.password);
      if (!match) {
        return res.status(401).json({ code: 2, message: 'Incorrect password' });
      }
  
      // Login successful
      req.session.user = user;
      res.redirect('home');
    //   return res.status(200).json({ code: 0, message: 'Login successful' });
    } catch (err) {
      return res.status(500).json({ code: 3, message: 'Internal server error' });
    }
  });

///////////////////register/////////////////////////////////////////////////////////////

router.get('/register',registerValidator,(req, res) => {

    res.render('register')
})


router.post('/register', registerValidator, async (req, res) => {
    const result = validationResult(req);

    if (!result.isEmpty()) {
        return res.status(400).json({ errors: result.errors });
    }

    const { username, email, phone, password, address, fullname, birthday } = req.body;

    try {
        const user = await User.findOne({ email: email });
        if (user) {
            return res.status(400).json({ errors: [{ msg: 'User already exists' }] });
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);
        let userId = generateUserId()
        const newUser = new User({
            userId: userId,
            email: email,
            phone: phone,
            username: username,
            fullname: fullname,
            address: address,
            birthday: birthday,
            password: hashedPassword
        });

        await newUser.save();
        return res.redirect('/login');
    } catch (err) {
        console.error(err);
        return res.status(500).send('Server error');
    }
})
////////////////////otp///////////////////////
router.get('/register/verify-otp', (req, res) => {
    res.render('OTP')
})

router.post('/register/verify-otp', (req, res) => {
    res.render('OTP')
})
//////////////////////////////////////////////////////
router.get('/change-password', (req, res) => {
    res.render('change-password', { errors: null });
  });
  
  // Route to handle change password request
  router.post('/change-password', async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;
  
    // Validate inputs
    const errors = [];
  
    if (!oldPassword || !newPassword || !confirmPassword) {
      errors.push({ msg: 'Please fill in all fields' });
    }
  
    if (newPassword !== confirmPassword) {
      errors.push({ msg: 'New password and confirm password do not match' });
    }
  
    // Check if old password is correct
    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(oldPassword, user.password);
  
    if (!isMatch) {
      errors.push({ msg: 'Old password is incorrect' });
    }
  
    // If there are errors, render the form with errors
    if (errors.length > 0) {
      return res.render('change-password', { errors });
    }
  
    // Encrypt new password and save to database
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    user.password = hashedPassword;
    await user.save();
  
    req.flash('success_msg', 'Password changed successfully');
    res.redirect('/home');
  });
  

/////////////////////////////////////////////////////////////////////
router.get('/home', (req, res) => {
    res.render('home')
})

router.post('/home', (req, res) => {
    res.render('home')
})

////////////////////////////Sent//////////////////////////////////////////
router.get('/home/sent', (req, res) => {

    res.render('home')
})
router.post('/home/sent', (req, res) => {
    
    res.render('home')
})

////////////////////////////Draft//////////////////////////////////////////
router.get('/home/draft', (req, res) => {

    res.render('home')
})
router.post('/home/draft', (req, res) => {

    res.render('home')
})
////////////profile/////////////////////
router.get('/profile/:id', async (req, res) => {
    try {
      const user = await User.findOne({ userId: req.params.id });
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }
      res.render('profile', { user });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  });
  

// Thiết lập storage cho Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname)
    }
  });
  
  // Thiết lập upload cho Multer
  const upload = multer({ storage: storage })
  
  // Route để render form upload avatar
  router.get('/profile/:id/update-avatar', async (req, res) => {
    const user = await User.findById(req.params.id);
    res.render('update-avatar', { user: user });
  });
  
  // Route để xử lý request upload avatar
  router.post('/update-avatar', upload.single('avatar'), async (req, res) => {
    const user = await User.findById(req.user.id);
    user.avatar = '/uploads/' + req.file.filename; // Lưu đường dẫn của file ảnh vào trường 'avatar'
    await user.save();
    res.redirect('/profile/' + req.user.id); // Chuyển hướng người dùng về trang profile của họ
  });

//////////////////chang password//////////////
router.post('/change-password', (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.userId;
  
    // TODO: validate input
  
    // check if current password is correct
    User.findById(userId)
      .then(user => {
        return bcrypt.compare(currentPassword, user.password);
      })
      .then(isMatch => {
        if (!isMatch) {
          throw new Error('Current password is incorrect');
        }
  
        // hash new password
        return bcrypt.hash(newPassword, 10);
      })
      .then(hashedPassword => {
        // update user password in db
        return User.findByIdAndUpdate(userId, { password: hashedPassword });
      })
      .then(() => {
        // redirect to profile page
        res.redirect('/profile');
      })
      .catch(error => {
        res.render('change-password', { error });
      });
  });
///////////////////edit-profile////////


// Handle POST request to /edit-profile
router.post("/edit-profile", (req, res) => {
  // Get the current user from the session
  const user = req.session.user;

  // Get the new values for fullname, phone, address and birthday from the request body
  const { fullname, phone, address, birthday } = req.body;

  // Update the user in the database with the new values
  User.findByIdAndUpdate(
    user.userId,
    {
      fullname: fullname,
      phone: phone,
      address: address,
      birthday: birthday,
    },
    { new: true },
    (err, updatedUser) => {
    if (err) {
      console.log(err);
      res.status(500).send("Internal Server Error");
    } else {
      // Update the user in the session
      req.session.user = updatedUser;
      res.redirect("/profile");
    }
  });
});

// Render the edit profile page
router.get("/edit-profile", (req, res) => {
  // Get the current user from the session
  const user = req.session.user;

  // Render the edit profile page with the user object
  res.render("edit-profile", { user: user });
});


module.exports = router
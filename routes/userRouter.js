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
const session = require('express-session')
const flash = require('connect-flash');

//validator form
const { check, validationResult } = require('express-validator')
const registerValidator = require('../routes/validators/registerValidator')
const loginValidator = require('../routes/validators/loginValidator')


// var cookieParser = require('cookie-parser')
// const multiparty = require('multiparty');
router.use(bodyParser.urlencoded({ extended: false }))
router.use(bodyParser.json())

//db Model
const User = require('../models/userModel')
const Email = require('../models/mailModel')

const mongoose = require("mongoose");
db = require("../libs/db")
const urlencodedParser = bodyParser.urlencoded({ extended: false })


//session

router.use(session({
  secret: 'buitrungkien',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 10 * 60 * 1000 } // Thời gian sống của cookie là 10 phút
}))

router.use(flash())

//function send OTP
const accountSid = process.env.twilio_ACCOUNT_SID
const authToken = process.env.twilio_AUTH_TOKEN
const twilioNumber = process.env.twilio_Phone
const client = require('twilio')(accountSid, authToken);

function formatPhoneNumber(phoneNumber) {
    const regex = /^0(\d{9})$/; // match 10 digits after '0'
    const match = phoneNumber.match(regex);
  
    if (match) {
      return `+84${match[1]}`; // add country code and remove leading '0'
    }
  
    throw new Error('Invalid phone number');
  }
  
async function sendOTP(phoneNumber, otp) {
  try {
    const message = await client.messages.create({
      body: `Your OTP is ${otp}`,
      from: twilioNumber,
      to: formatPhoneNumber(phoneNumber)
    });
    console.log(message.sid);
    return message.sid;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to send OTP via SMS');
  }
}

const { v4: uuidv4 } = require('uuid');
const exp = require('constants');

function generateUserId() {
  return uuidv4();
}
//resful API
router.get('/', function (req, res) {
  const error = req.flash('error') || ''

  res.render('login', { error })
})


////////////////////login//////////////////////////////////////////////////////
router.get('/login', loginValidator, function (req, res) {
  const error = req.flash('error') || ''

  res.render('login', { error })
})

router.post('/login', loginValidator, async (req, res) => {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    const message = Object.values(result.mapped())[0].msg;
    req.flash('error', message);
    return res.redirect('/login');
  }

  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      req.flash('error', 'No user found with this email');
      return res.redirect('/login');
    }

    const match = await bcrypt.compare(req.body.password, user.password);
    if (!match) {
      req.flash('error', 'Incorrect password');
      return res.redirect('/login');
    }

    req.session.user = user;
    req.session.isLoggedIn = true;

    const emailsToUser = await Email.find({ to: { $in: [req.session.user.email] } });
    req.flash('emailsToUser', emailsToUser);
    res.render('home', { emailsToUser });
  } catch (err) {
    return res.status(500).json({ code: 3, message: 'Internal server error' });
  }
});


///////////////////register/////////////////////////////////////////////////////////////

router.get('/register', registerValidator, (req, res) => {
  const error = req.flash('error') || ''
  res.render('register', { error })
})


router.post('/register', registerValidator, async (req, res) => {
  const result = validationResult(req);

  if (!result.isEmpty()) {

    const mappedResult = result.mapped()

    let message;
    for (fields in mappedResult) {
      message = mappedResult[fields].msg
      console.log(message)
      break;
    }

    req.flash('error', message)

    return res.redirect('/register');
  }

  const { username, email, phone, password, address, fullname, birthday } = req.body;

  try {
    const user = await User.findOne({ email: email });
    if (user) {
      req.flash('error', 'User already exists')

      return res.redirect('/register');

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
  res.render('change-password', { error: null });
});
//////////////////chang password//////////////
router.post('/change-password', async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  try {
    // Find the user
    const user = await User.findOne(req.session.user)

    // Check if the old password is correct
    const isMatch = await bcrypt.compare(oldPassword, user.password)
    if (!isMatch) {
      throw new Error('Current password is incorrect' + user.email)
    }

    // Validate the new password
    if (newPassword !== confirmPassword) {
      throw new Error('Confirm password do not match')
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update the user's password in the database
    await User.findOneAndUpdate({ email: user.email }, { password: hashedPassword })

    // Delete the session and redirect to login page
    req.session.destroy(err => {
      if (err) {
        console.error(err);
        res.status(500).send('Server error')
      } else {
        res.redirect('/login');
      }
    });
  } catch (error) {
    res.render('change-password', { error: error });
  }
})


/////////////////////////////////////////////////////////////////////
router.get('/home', async(req, res) => {
  if (req.session.isLoggedIn) {
    const emailsToUser = await Email.find({ to: { $in: [req.session.user.email] } });
    res.render('home', { emailsToUser })
  }
  else {
    res.redirect('/login');
  }
})

router.post('/home', async(req, res) => {
  if (req.session.isLoggedIn) {
    const emailsToUser = await Email.find({ to: { $in: [req.session.user.email] } });
    res.render('home', { emailsToUser })
  }
  else {
    res.redirect('/login');
  }

})

////////////////////////////Sent//////////////////////////////////////////

router.post("/send-email", async (req, res) => {
  if (req.session.isLoggedIn) {

    const { email, subject, message } = req.body;
    const newEmail = new Email({
      from: req.session.user.email,
      to: email,
      subject: subject,
      text: message,
    });

    await newEmail.save();
    res.redirect('home',);

  } else {
    console.log('correct')
    res.redirect('/login');
  }
});

router.get('/sended',async (req, res) => {
  if (req.session.isLoggedIn) {
    const emailsToUser = await Email.find({ from: req.session.user.email });

    res.render('sended', { emailsToUser })
  }
  else {
    res.redirect('/login');
  }
})

////////////profile/////////////////////
router.get('/profile', async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.redirect('/login')
    }

    // Find the user
    const user = await User.findOne(req.session.user)
    console.log(user)
    // Render the profile view and pass in the user object
    res.render('profile', { user: user })
  } catch (error) {
    console.error(error)
    res.status(500).send('Server error')
  }
})



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
router.get('/profile/update-avatar', async (req, res) => {
  const user = await User.findById(req.session.id);
  res.render('update-avatar', { user: user });
});

router.post('/search', async (req, res) => {
  if (req.session.isLoggedIn) {
    console.log('demo');
    const { keyword } = req.body;

    const emailsToUser = await Email.find({
      $and: [
        { from: req.session.user.email },
        {
          $or: [
            { subject: { $regex: keyword, $options: "i" } },
            { text: { $regex: keyword, $options: "i" } },
            { to: { $elemMatch: { $regex: keyword, $options: "i" } } }
          ]
        }
      ]
    });

    console.log(emailsToUser);
    res.render('home', { emailsToUser });
  } else {
    res.redirect('/login');
  }
});


// Route để xử lý request upload avatar
router.post('/update-avatar', upload.single('avatar'), async (req, res) => {
  const user = await User.findById(req.user.userId);
  user.avatar = '/uploads/' + req.file.filename; // Lưu đường dẫn của file ảnh vào trường 'avatar'
  await user.save();
  res.redirect('/profile/' + req.user.userId); // Chuyển hướng người dùng về trang profile của họ
});


//////////////////////sent mail///////////////

router.get("/get-send-email", async (req, res) => {
  if (req.session.isLoggedIn) {
    const emailsFrom = await Email.find({ from: req.session.user.email });
    console.log(emailsFrom); // Output: an array of Email documents where the 'from' field is 'kien09@gmail.com'
    res.redirect('/home');
  }
  else {
    res.redirect('/login');
  }
});

router.get("/get-email", async (req, res) => {

  if (req.session.isLoggedIn) {
    const emailsToUser = await Email.find({ to: { $in: [req.session.user.email] } });
    console.log(emailsToUser);
    res.redirect('/home');
  }
  else {
    res.redirect('/login');
    console.log('error');
  }
})

///////////////////edit-profile////////
// Handle POST request to /edit-profile
router.post("/edit-profile", async (req, res) => {
  try {
    // Get the current user from the session
    const user = req.session.user;

    // Get the new values for fullname, phone, address and birthday from the request body
      const { fullname, phone, address, birthday } = req.body;

      // Create an object to store the new values for the user
      const newValues = {};

      if (fullname) {
        newValues.fullname = fullname;
      }
      if (phone) {
        newValues.phone = phone;
      }
      if (address) {
        newValues.address = address;
      }
      if (birthday) {
        newValues.birthday = birthday;
      }

      // Update the user in the database with the new values
      const updatedUser = await User.findOneAndUpdate(
        { email: user.email },
        newValues,
        { new: true }
      );

    if (!updatedUser) {
      return res.status(404).send("User not found");
    }
/////////////////
    // Update the user in the session
    req.session.user = updatedUser;
    res.redirect("/profile");
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
})

// Render the edit profile page
router.get("/edit-profile", (req, res) => {
  // Get the current user from the session
  const user = req.session.user;

  // Render the edit profile page with the user object
  res.render("edit-profile", { user: user });
});





module.exports = router
const express = require("express");
require("dotenv").config();
const router = express.Router();
var bodyParser = require("body-parser");
let async = require("async");
const fs = require("fs");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const moment = require("moment");
const multer = require("multer");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");

//validator form
const { check, validationResult } = require("express-validator");
const registerValidator = require("../routes/validators/registerValidator");
const loginValidator = require("../routes/validators/loginValidator");

// var cookieParser = require('cookie-parser')
// const multiparty = require('multiparty');
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

//db Model
const User = require("../models/userModel");
const Email = require("../models/mailModel");
const Label = require("../models/labelModel");
const mongoose = require("mongoose");
db = require("../libs/db");
const urlencodedParser = bodyParser.urlencoded({ extended: false });

//session

router.use(
  session({
    secret: "buitrungkien",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 10 * 60 * 1000 }, // Thời gian sống của cookie là 10 phút
  })
);

router.use(flash());

//function send OTP
const accountSid = process.env.twilio_ACCOUNT_SID;
const authToken = process.env.twilio_AUTH_TOKEN;
const twilioNumber = process.env.twilio_Phone;
const client = require("twilio")(accountSid, authToken);

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

const { v4: uuidv4 } = require("uuid");
const exp = require("constants");

async function getAllLabel(req) {
  const allLabels = await Label.find({
    user: { $in: req.session.user.email }
  });

  return allLabels;
}


function generateUserId() {
  return uuidv4();
}
//resful API////////////////////////////////////
router.get("/", function (req, res) {
  const error = req.flash("error") || "";

  res.render("login", { error });
});

////////////////////login//////////////////////////////////////////////////////
router.get("/login", loginValidator, function (req, res) {
  const error = req.flash("error") || "";

  res.render("login", { error });
});

router.post("/login", loginValidator, async (req, res) => {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    const mappedResult = result.mapped();

    let message;
    for (fields in mappedResult) {
      message = mappedResult[fields].msg;
      console.log(message);
      break;
    }
    req.flash("error", message);
    return res.redirect("/login");

  }

  try {
    // If validation passed
    if (req.body.email == "admin@gmail.com" && req.body.password == "123456") {
      req.session.admin = true;
      return res.redirect("/admin");
    }

    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      req.flash("error", "No user found with this email");
      return res.redirect("/login");
    }

    const match = await bcrypt.compare(req.body.password, user.password);
    if (!match) {
      req.flash("error", "Incorrect password");
      return res.redirect("/login");
    }

    // Login successful
    req.session.user = user;
    req.session.isLoggedIn = true;

    const emailsToUser = await Email.find({
      to: { $in: [req.session.user.email] },
    });

    const getLabels = await getAllLabel(req)

    res.render("home", { emailsToUser, getLabels });
  } catch (err) {
    return res.status(500).json({ code: 3, message: "Internal server error" });
  }
});

///////////////////register/////////////////////////////////////////////////////////////

router.get("/register", registerValidator, (req, res) => {
  const errors = req.flash("error") || "";
  res.render("register", { errors });
});

router.post("/register", registerValidator, async (req, res) => {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    const mappedResult = result.mapped();

    let message;
    for (fields in mappedResult) {
      message = mappedResult[fields].msg;
      console.log(message);
      break;
    }

    req.flash("error", message);

    return res.redirect("/register");
  }

  const { username, email, phone, password, address, fullname, birthday } = req.body;

  try {
    const user = await User.findOne({ email: email });
    if (user) {
      req.flash("error", "User already exists");

      return res.redirect("/register");
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    // Generate random OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Encrypt OTP before sending
    const encryptedOtp = await bcrypt.hash(otp.toString(), saltRounds);
    let userId = generateUserId();
    const newUser = new User({
      userId: userId,
      email: email,
      phone: phone,
      username: username,
      fullname: fullname,
      address: address,
      birthday: birthday,
      password: hashedPassword,
      otp: encryptedOtp
    });

    await newUser.save();
    console.log(otp)
    req.flash('success', `Your OTP is ${otp}. Please check your phone.`)
    // alert(`Your OTP is ${otp}. Please check your phone.`)
    // return res.redirect("/login");
    return res.redirect('/register/verify-otp')
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
});
////////////////////otp///////////////////////
router.get("/register/verify-otp", (req, res) => {
  res.render("OTP");
});

router.post("/register/verify-otp", async(req, res) => {
  try {
    const { otp} = req.body;

    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(400).json({ errors: [{ msg: 'Invalid OTP' }] });
    }

    // Verify OTP
    const isMatch = await bcrypt.compare(otp.toString(), user.otp);
    if (!isMatch) {
      return res.status(400).json({ errors: [{ msg: 'Invalid OTP' }] });
    }

    // Encrypt password before saving to database
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Save user to database with encrypted password and verified OTP
    user.otp = null;
    user.password = hashedPassword;
    await user.save();

    return res.redirect('/login');

  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error');
  }
});
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
router.get("/home", async (req, res) => {
  if (req.session.isLoggedIn) {
    const emailsToUser = await Email.find({
      to: { $in: [req.session.user.email] },
    });

    const getLabels = await getAllLabel(req)

    res.render("home", { emailsToUser, getLabels });
  } else {
    res.redirect("/login");
  }
});

router.post("/home", async (req, res) => {
  if (req.session.isLoggedIn) {
    const emailsToUser = await Email.find({
      to: { $in: [req.session.user.email] },
    });
    const getLabels = await getAllLabel(req)
    res.render("home", { emailsToUser, getLabels });

  } else {
    res.redirect("/login");
  }
});
/////////log out/////////////////////////////
router.post("/logout", (req, res) => {
  alert('Logout')
  // Xóa thông tin phiên đăng nhập
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Server error");
    }

    // Trả về mã thành công
    return res.status(200).json({ code: 0, message: "Logout successful" });
  });
});
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
    res.redirect("home");
  } else {
    console.log("correct");
    res.redirect("/login");
  }
});

router.get("/sended", async (req, res) => {
  if (req.session.isLoggedIn) {
    const emailsToUser = await Email.find({ from: req.session.user.email });

    res.render("sended", { emailsToUser });
  } else {
    res.redirect("/login");
  }
});
////////////////////////////Draft//////////////////////////////////////////
router.get("/home/draft", (req, res) => {
  res.render("home");
});
router.post("/home/draft", (req, res) => {
  res.render("home");
});
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

/////////////////////////////change-avatar//////////////////
// Thiết lập storage cho Multer

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '../public/uploads');
  },
  filename: function (req, file, cb) {
    cb(null, "avatar-" + Date.now());
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5 // giới hạn kích thước tệp 5MB
  },
  fileFilter: function (req, file, cb) {
    // kiểm tra định dạng tệp
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error("Only image files are allowed!"));
    }
    cb(null, true);
  }
}).single("avatar");

router.post("/update-avatar", (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      console.log(err);
      return res.status(400).send(err.message);
    }
    const user = req.session.user;
    user.avatar = req.file.filename;
    User.findOneAndUpdate({ email: user.email }, { avatar: user.avatar }, (err) => {
      if (err) {
        console.log(err);
        return res.status(500).send("Internal Server Error");
      }
      res.redirect("/profile");
    })
  })
})

router.get("/get-send-email", async (req, res) => {
  if (req.session.isLoggedIn) {
    const emailsFrom = await Email.find({ from: req.session.user.email });
    console.log(emailsFrom);
    res.redirect("/home");
  } else {
    res.redirect("/login");
  }
});

router.get("/get-email", async (req, res) => {
  if (req.session.isLoggedIn) {
    const emailsToUser = await Email.find({
      to: { $in: [req.session.user.email] },
    });
    console.log(emailsToUser);
    res.redirect("/home");
  } else {
    res.redirect("/login");
    console.log("error");
  }
});

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
/////////////////////// Label
router.post("/labels", async (req, res) => {
  const { name } = req.body;
  if (req.session.isLoggedIn) {
    if (name == '') {
      return res.redirect("home");
    }
    else {
      const label = new Label({
        user: req.session.user.email,
        nameLabel: name,
      });
      await label.save();
      const emailsToUser = await Email.find({
        to: { $in: [req.session.user.email] },
      });
      req.flash("emailsToUser", emailsToUser);
      const getLabels = await getAllLabel(req)
      res.redirect("home");
    }
  }
  else {
    res.redirect("/login");
  }
});
router.get("/label/:name", async (req, res) => {
  if (req.session.isLoggedIn) {
    const name = req.params.name;
    const emailsToUser = await Email.find({
      labels: { $in: [name] },
      $and: [
        { $or: [{ from: req.session.user.email }, { to: { $in: [req.session.user.email] } }] }
      ]
    });
    const getLabels = await getAllLabel(req);
    res.render("home", { emailsToUser, getLabels });
  } else {
    res.redirect("login");
  }
});


router.delete('/labels/:name', async (req, res) => {
  try {

    const labelName = req.params.name;
    const userEmail = req.session.user.email;
    console.log(labelName)
    console.log(userEmail)
    // Check if the label exists and belongs to the user
    const existingLabel = await Label.findOne({ user: userEmail, nameLabel: labelName });
    if (!existingLabel) {
      return res.status(404).json({ message: 'Label not found' });
    }

    // Delete the label
    const deletedLabel = await Label.deleteOne({ user: userEmail, nameLabel: labelName });
    if (deletedLabel.deletedCount === 0) {
      return res.status(404).json({ message: 'Label not found' });
    }

    res.status(200).json(deletedLabel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.post('/labels/update/:name/:newLabel', async (req, res) => {
  try {
    const oldLabel = req.params.name;
    const newLabel = req.params.newLabel;

    const updatedLabel = await Label.updateOne(
      { user: req.session.user.email, nameLabel: oldLabel },
      { $set: { nameLabel: newLabel } }
    );

    res.status(200).json(updatedLabel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


///// handle email 
router.get('/email/:id', async (req, res) => {

  if (req.session.isLoggedIn) {
    const emailID = req.params.id;
    const emailOld = await Email.findById(emailID);

    var replyUser = ''
    if (req.session.user.email != emailOld.from) {
      replyUser = emailOld.from
    }

    for (const recipient of emailOld.to) {
      if (req.session.user.email != recipient) {
        replyUser = recipient
        await newEmail.save();
      }
    }

    const emailOriginal = await Email.findById(emailID);
    const listEmailReply = await Email.find({ parentID: emailID })
    const emails = [emailOriginal].concat(listEmailReply);
    const userName = await User.findOne({ email: req.session.user.email })
    const getLabels = await getAllLabel(req)


    res.render('detailMail', { emails, userName, getLabels, replyUser });
  }
  else {
    res.redirect("/login");
  }
});

router.get('/email/label/:id/:labelName', async (req, res) => {
  try {
    const updateEmail = await Email.findById(req.params.id);
    const emailID = updateEmail._id

    const emailOriginal = await Email.findById(emailID);
    const listEmailReply = await Email.find({ parentID: emailID })
    const emails = [emailOriginal].concat(listEmailReply);
    const getLabels = await getAllLabel(req)
    const userName = await User.findOne({ email: req.session.user.email })
    const emailOld = await Email.findById(emailID);
    var replyUser = ''
    if (req.session.user.email != emailOld.from) {
      replyUser = emailOld.from
    }

    for (const recipient of emailOld.to) {
      if (req.session.user.email != recipient) {
        replyUser = recipient
        await newEmail.save();
      }
    }

    const emailsContainLabel = await Email.find({
      labels: { $in: [req.params.labelName] },
      _id: emailID
    });
        if (!emailsContainLabel.isEmpty) {
      const deletedLabel = await Label.deleteOne({ user: req.session.user.email, nameLabel: req.params.labelName });
      res.render('detailMail', { emails, userName, getLabels, replyUser });
    }

    // Delete the label
    updateEmail.labels.push(req.params.labelName);
    await updateEmail.save(); // Save the changes made to the email document

    res.render('detailMail', { emails, userName, getLabels, replyUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add label to email" });
  }
});


router.post('/emails/:id/delete-label/:label', async (req, res) => {
  try {
    const emailId = req.params.id;
    const label = req.params.label;

    const email = await Email.findOne({ _id: emailId });

    if (!email) {
      return res.status(404).json({ message: 'Email not found' });
    }

    const index = email.labels.indexOf(label);

    if (index === -1) {
      return res.status(400).json({ message: 'Label not found on email' });
    }
    email.labels.splice(index, 1);
    await email.save();

    return res.status(200).json({ message: 'Label deleted from em ail' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.post('/email/forward/:id', async (req, res) => {
  try {
    const emailID = req.params.id;
    const { email, message } = req.body;
    const emailOld = await Email.findById(emailID);

    const newEmail = new Email({
      from: req.session.user.email,
      to: email,
      subject: emailOld.subject,
      text: message,
      parentID: emailID
    });

    var replyUser = ''
    if (req.session.user.email != emailOld.from) {
      replyUser = emailOld.from
    }

    for (const recipient of emailOld.to) {
      if (req.session.user.email != recipient) {
        replyUser = recipient
        await newEmail.save();
      }
    }

    await newEmail.save();
    const emailOriginal = await Email.findById(emailID);
    const listEmailReply = await Email.find({ parentID: emailID })
    const emails = [emailOriginal].concat(listEmailReply);
    const getLabels = await getAllLabel(req)
    const userName = await User.findOne({ email: req.session.user.email });


    res.render('detailMail', { emails, userName, getLabels, replyUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/email/reply/:id', async (req, res) => {
  const emailID = req.params.id;
  const emailOld = await Email.findById(emailID);
  const userName = await User.findOne({ email: req.session.user.email });
  const { email, message } = req.body;

  if (req.session.user.email == emailOld.from) {
    newEmail = new Email({
      from: req.session.user.email,
      to: email,
      subject: emailOld.subject,
      text: message,
      parentID: emailID
    });
    await newEmail.save();
  }

  for (const recipient of emailOld.to) {
    if (req.session.user.email == recipient) {
      newEmail = new Email({
        from: req.session.user.email,
        to: email,
        subject: emailOld.subject,
        text: message,
        parentID: emailID
      });
      await newEmail.save();
    }
  }

  const emailOriginal = await Email.findById(emailID);
  const listEmailReply = await Email.find({ parentID: emailID })
  const emails = [emailOriginal].concat(listEmailReply);
  const getLabels = await getAllLabel(req)
  res.render('detailMail', { emails, userName, getLabels });
});

router.get('/star',async (req,res) => {
  if (req.session.isLoggedIn) {
    const emailsToUser = await Email.find({
      $or: [
        { to: { $in: [req.session.user.email] } },
        { from: req.session.user.email }
      ],
      stared: true
    });
    const getLabels = await getAllLabel(req)

    res.render("home", { emailsToUser, getLabels });
  } else {
    res.redirect("/login");
    console.log("error");
  }
})

router.post('/star/:id', async (req,res) => {
  if (req.session.isLoggedIn) {
    const email = await Email.findOne({ _id: req.params.id });
    email.stared = !email.stared;
    await email.save();
    res.send(email);
    console.log(email)
  }
  else {
    res.redirect("/login");
    console.log("error");
  }
})

router.post("/search", async (req, res) => {
  if (req.session.isLoggedIn) {
    console.log("demo");
    const { keyword } = req.body;

    const emailsToUser = await Email.find({
      $and: [
        {
          $or: [
            { from: { $regex: keyword, $options: "i" } },
            { to: { $regex: keyword, $options: "i" } },
          ],
        },
        {
          $or: [
            { subject: { $regex: keyword, $options: "i" } },
            { text: { $regex: keyword, $options: "i" } },
            { to: { $elemMatch: { $regex: keyword, $options: "i" } } },
          ],
        },
        ,
      ],
    });

    const getLabels = await getAllLabel(req);
    res.render("home", { emailsToUser, getLabels });
  } else {
    res.redirect("");
  }
});


router.post('/searchAdvanced',async(req,res) => {
  const {from,to,subject,text} = req.body
  {
    const emailsToUser = await Email.find({
      $and: [
        {
          $and: [
            { from: { $regex: from, $options: "i" } },
            { to: { $regex: to, $options: "i" } },
          ],
        },
        {
          $and: [
            { subject: { $regex: subject, $options: "i" } },
            { text: { $regex: text, $options: "i" } },
          ],
        },
      ],
    });
    const getLabels = await getAllLabel(req);
    res.render("home", { emailsToUser, getLabels});
  }
})


module.exports = router
//test branch
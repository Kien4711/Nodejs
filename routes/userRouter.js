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

async function sendOTP(phoneNumber, otp) {
  try {
    const message = await client.messages.create({
      body: `Your OTP is ${otp}`,
      from: twilioNumber,
      to: phoneNumber,
    });
    console.log(message.sid);
    return message.sid;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to send OTP via SMS");
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
//resful API
router.get("/", function (req, res) {
  const error = req.flash("error") || "";

  res.render("login", { error });
});

////////////////////login//////////////////////////////////////////////////////
router.get("/login", loginValidator, function (req, res) {

  const error = req.flash("error") || "";

  if (req.session.u)

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

    return res.render("/login");
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
    req.flash("emailsToUser", emailsToUser);
    res.render("home", { emailsToUser, getLabels });
  } catch (err) {
    return res.status(500).json({ code: 3, message: "Internal server error" });
  }
});

///////////////////register/////////////////////////////////////////////////////////////

router.get("/register", registerValidator, (req, res) => {
  const error = req.flash("error") || "";
  res.render("register", { error });
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

  const { username, email, phone, password, address, fullname, birthday } =
    req.body;

  try {
    const user = await User.findOne({ email: email });
    if (user) {
      req.flash("error", "User already exists");

      return res.redirect("/register");
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
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
    });

    await newUser.save();
    return res.redirect("/login");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
});
////////////////////otp///////////////////////
router.get("/register/verify-otp", (req, res) => {
  res.render("OTP");
});

router.post("/register/verify-otp", (req, res) => {
  res.render("OTP");
});
//////////////////////////////////////////////////////
router.get("/change-password", (req, res) => {
  res.render("change-password", { errors: null });
});

// Route to handle change password request
router.post("/change-password", async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  // Validate inputs
  const errors = [];

  if (!oldPassword || !newPassword || !confirmPassword) {
    errors.push({ msg: "Please fill in all fields" });
  }

  if (newPassword !== confirmPassword) {
    errors.push({ msg: "New password and confirm password do not match" });
  }

  // Check if old password is correct
  const user = await User.findById(req.user.id);
  const isMatch = await bcrypt.compare(oldPassword, user.password);

  if (!isMatch) {
    errors.push({ msg: "Old password is incorrect" });
  }

  // If there are errors, render the form with errors
  if (errors.length > 0) {
    return res.render("change-password", { errors });
  }

  // Encrypt new password and save to database
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
  user.password = hashedPassword;
  await user.save();

  req.flash("success_msg", "Password changed successfully");
  res.redirect("/home");
});

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
router.get("/profile/:id", async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.id });
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    res.render("profile", { user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Thiết lập storage cho Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// Thiết lập upload cho Multer
const upload = multer({ storage: storage });

// Route để render form upload avatar
router.get("/profile/:id/update-avatar", async (req, res) => {
  const user = await User.findById(req.params.id);
  res.render("update-avatar", { user: user });
});

router.post("/search", async (req, res) => {
  if (req.session.isLoggedIn) {
    console.log("demo");
    const { keyword } = req.body;

    const emailsToUser = await Email.find({
      $and: [
        { from: req.session.user.email },
        {
          $or: [
            { subject: { $regex: keyword, $options: "i" } },
            { text: { $regex: keyword, $options: "i" } },
            { to: { $elemMatch: { $regex: keyword, $options: "i" } } },
          ],
        },
      ],
    });

    console.log(emailsToUser);
    const getLabels = await getAllLabel(req)
    res.render("home", { emailsToUser, getLabels });


  } else {
    res.redirect("");
  }
});

// Route để xử lý request upload avatar
router.post("/update-avatar", upload.single("avatar"), async (req, res) => {
  const user = await User.findById(req.user.id);
  user.avatar = "/uploads/" + req.file.filename; // Lưu đường dẫn của file ảnh vào trường 'avatar'
  await user.save();
  res.redirect("/profile/" + req.user.id); // Chuyển hướng người dùng về trang profile của họ
});

//////////////////chang password//////////////
router.post("/change-password", (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.session.userId;

  // TODO: validate input

  // check if current password is correct
  User.findById(userId)
    .then((user) => {
      return bcrypt.compare(currentPassword, user.password);
    })
    .then((isMatch) => {
      if (!isMatch) {
        throw new Error("Current password is incorrect");
      }

      // hash new password
      return bcrypt.hash(newPassword, 10);
    })
    .then((hashedPassword) => {
      // update user password in db
      return User.findByIdAndUpdate(userId, { password: hashedPassword });
    })
    .then(() => {
      // redirect to profile page
      res.redirect("/profile");
    })
    .catch((error) => {
      res.render("change-password", { error });
    });
});
///////////////////edit-profile////////

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
    }
  );
});




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
      req.flash("emailsToUser", emailsToUser);
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
    console.log()
    const emailsToUser = await Email.find({
      labels: { $in: [name] },
      $or: [
        { from: req.session.user.email },
        { to: { $in: [req.session.user.email] } }
      ]
    });
    const getLabels = await getAllLabel(req)
    res.render("home", { emailsToUser, getLabels });
  }
  else {
    res.redirect("login");
  }
})

router.delete('/labels/:name', async (req, res) => {
  console.log('test delete label')
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
      { $set: { nameLabel: newLabel }}
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

    const userName = await User.findOne({ email: req.session.user.email })
    const emailOriginal = await Email.findById(emailID);
    const listEmailReply = await Email.find({ parentID: emailID })
    const emails = [emailOriginal].concat(listEmailReply);
    const getLabels = await getAllLabel(req)

    res.render('detailMail', { emails, userName, getLabels });
  }
  else {
    res.redirect("/login");
  }
});


router.put('/email/:id/label/:labelName', async (req, res) => {
  try {
    const email = await Email.findById(req.params.id);
    email.labels.push(req.params.labelName);
    await email.save();
    res.status(200).json(email);
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

// async function forwardEmail(emailId, forwardTo, forwardBody) {
//   console.log(test)
//     console.log(req.session.user.email)
//     console.log(forwardTo)
//     console.log(forwardBody)
//     console.log(email._id)
//   try {

//     // const email = await Email.findById(emailId);
    
//     newEmail = new Email({
//       from: req.session.user.email,
//       to: forwardTo,
//       subject: email.subject,
//       text: forwardBody,
//       parentID: emailId
//     });

//     // await newEmail.save();
//     return newEmail;
//   } catch (error) {
//     console.error(error);
//     throw new Error("Failed to forward email");
//   }
// }

router.post('/emails/:id/forward', async (req, res) => {
  try {
    const emailId = req.params.id;
    const forwardTo = req.body.forwardTo;
    const forwardBody = req.body.forwardBody;
    console.log('demo1')
    console.log(emailId)
    console.log(forwardTo)
    console.log(forwardBody)
    console.log(req.session.user.email)


    // const newEmail = await forwardEmail(emailId, forwardTo, forwardBody);
    const email = await Email.findById(emailId);
    console.log('demo2 '+email)
    

    const newEmail = new Email({
      from: req.session.user.email,
      to: forwardTo,
      subject: email.subject,
      text: forwardBody,
      parentID: emailId
    });
    await newEmail.save();
    return res.redirect('register')
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/email/reply/:id/:newText', async (req, res) => {
  const emailID = req.params.id;
  const emailOld = await Email.findById(emailID);
  const userName = await User.findOne({ email: req.session.user.email });

  if (req.session.user.email == emailOld.from) {
    newEmail = new Email({
      from: req.session.user.email,
      to: emailOld.to,
      subject: emailOld.subject,
      text: req.params.newText,
      parentID: emailID
    });
    await newEmail.save();
  }

  for (const recipient of emailOld.to) {
    if (req.session.user.email == recipient) {
      newEmail = new Email({
        from: req.session.user.email,
        to: emailOld.from,
        subject: emailOld.subject,
        text: req.params.newText,
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

module.exports = router;
//test branch
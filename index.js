require('dotenv').config()

const express = require('express')
const app = express()
//db
const mongodb = require('mongoose')
const path = require('path')

//router
const userRoute = require('./routes/userRouter')
const adminRoute = require('./routes/adminRouter')


const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')

//ejs viewer
app.set('view engine', 'ejs')


//Routing User
app.use('/', userRoute)
app.use('/admin',adminRoute)

//JSON encode

app.use(express.urlencoded({ extended:false }))
app.use(express.json())


// Static file
// app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'))
app.use('/stylesheets', express.static(__dirname + '/public/stylesheets'));
app.use('/images', express.static(__dirname + '/public/images'));
app.use('/javascripts', express.static(__dirname + '/public/javascripts'));

//Crearte Server
const port = process.env.PORT || 8080
app.listen(port, () =>{
    console.log('http://localhost:' + port)
})
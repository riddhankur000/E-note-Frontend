import express from 'express'
import bodyParser from 'body-parser'
import bcryptjs from "bcryptjs";
import jwt, { decode } from "jsonwebtoken";
import { jwtDecode } from "jwt-decode";
import cookieParser from 'cookie-parser';
import env from "dotenv";
import passport from "passport";
import session from "express-session";
import GoogleStrategy from "passport-google-oauth2";
import nodemailer from "nodemailer";
import cors from "cors";
import { MemoryStore } from 'express-session';



env.config();

const app = express()
app.use(cors(
  {
    origin: ["http://localhost:5173"],
    methods: ["POST","GET"],
    credentials: true,            //access-control-allow-credentials:true
    optionSuccessStatus:200
  }

));

const port = process.env.PORT||3000

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'wricksarkar000@gmail.com',
    pass: process.env.TRANSPORTER_PASSWORD,
  }
});

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cookieParser());
// app.use(
//   session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: true,
//   })
// );
app.use(session({
  cookie: { maxAge: 86400000 },
  store: new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  resave: false,
  secret: process.env.SESSION_SECRET,
}))

app.use(passport.initialize());
app.use(passport.session());


import mongoose from 'mongoose';

import userschema from "./models/note.js";

// mongoose.connect("mongodb+srv://wrick000:" + process.env.DB_PASSWORD + "@cluster0.tjiylu1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
// mongoose.connect(process.env.MONGO_URL);
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })
})


let User_email = "";
let google_auth_data = {};

app.get('/', async (req, res) => {
  // res.json({code:"hello"});

  let lists = (await userschema.find());

  console.log(lists);
  res.send("Server Running");
})

app.post("/register", async (req, res) => {
  // console.log(req.body);
  let loginuser = req.body.Username;
  let email = req.body.Email;
  let loginpassword = req.body.Password;
  try {

    // bcryptjs.genSalt(10,(err,salt)=>{
    bcryptjs.hash(loginpassword, 7, async (err, hash) => {
      // console.log("Hello");
      if (err) {
        console.log("Error in Hahing: ", err);
      }
      else {

        let data = {
          username: loginuser,
          email: email,
          password: hash,
        }
        console.log(data);
        let result = (await userschema.find({ email: email }));
        if (result.length) {
          // console.log("1");
          res.status(401).redirect("http://localhost:5173/login/ar");
        } else {
          // console.log("2");
          result = await userschema.insertMany([data]);
          let token = jwt.sign({ id: result[0]._id, email: result[0].email }, process.env.JWTSECRET, { expiresIn: "20s" });

          var mailOptions = {
            from: 'wricksarkar000@gmail.com',
            to: email,
            subject: 'Registration Confirmation Mail',
            text: "Hey! It's Riddhankur.. Thanks for registering into E-note.. Hope you will Enjoy our Online Note saving Website."
          };

          transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
              console.log(error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });
          User_email = email;
          res.cookie("user", token).redirect("http://localhost:5173/Notes");
          // res.cookie("user", token).redirect("http://localhost:5173/Notes");
          // res.render("secrets.ejs");
        }
      }

    })
    // })


  }
  catch (err) {
    res.send(err);
  }

});


app.post('/api/login', async (req, res) => {

  let token = req.cookies.user;
  // console.log(token);
  if (token) {
    // let email=db_data.email;
    let decoded = jwtDecode(token);
    let db_data = (await userschema.find({ _id: decoded.id }));
    if (db_data.length > 0) {
      // console.log(db_data);
      // res.header().render("secrets.ejs");
      
      res.redirect("http://localhost:5173/Notes");
    }
  }
  else {
    try {
      let RESULT = await userschema.find({ email: req.body.Email });

      console.log("LOGIN",req.body);
      console.log("LOGIN",RESULT);
      if (RESULT.length) {

        if (RESULT[0].password != null) {
          bcryptjs.compare(req.body.Password, RESULT[0].password, (err, result) => {
            if (err) {
              console.log("Error in Comparing Password: ", err);
            }
            else {
              if (result) {
                let token = jwt.sign({ id: RESULT[0]._id, email: RESULT[0].email }, process.env.JWTSECRET, { expiresIn: "20s" });
                User_email = RESULT[0].email;
                console.log("redirect");
                // res.redirect("http://localhost:5173/Notes");
                // const message={code:"redirect"};
                res.cookie("user", token).redirect("http://localhost:5173/Notes");
                // res.redirect("/secrets");
              }
              else {
                // const message={code:"incorrect_password"};
                // console.log(message);

                // res.send({code:"incorrect_password"});
                res.status(401).redirect("http://localhost:5173/login/ip");


              }
            }
          })
        }
        else {
          res.status(404).redirect("http://localhost:5173/login/nr");
        }
      }
      else {
        res.status(404).redirect("http://localhost:5173/login/nr");

      }
    }
    catch (err) {
      res.send(err);
    }
  }



})

app.get("/secrets", async (req, res) => {
  console.log(User_email)
  res.redirect("http://localhost:5173/Notes");
})


app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    successRedirect: "http://localhost:5173/Notes",
    failureRedirect: "http://localhost:5173",
  })
);

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        // const result = await db.query("SELECT * FROM users WHERE email = $1", [
        //   profile.email,
        // ]);
        // console.log(profile);
        const result = (await userschema.find({ email: profile.email }));
        if (result.length == 0) {
          // const newUser = await db.query(
          //   "INSERT INTO users (email, password) VALUES ($1, $2)",
          //   [profile.email, "google"]
          // );
          const newUser = await userschema.insertMany([{ email: profile.email, password: null }]);
          User_email = newUser[0].email;
          // console.log("Hello",newUser)
          console.log("useremail:",User_email);
          // google_auth_data={Email:newUser.email,}
          // let token = jwt.sign({ id: result[0]._id, username: new[0].username }, process.env.JWTSECRET, { expiresIn: "20s" });
          return cb(null, newUser[0]);
        } else {
          User_email = result[0].email;
          console.log("useremail:",User_email);
          return cb(null, result[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);

app.post('/api/add', async (req, res) => {
  console.log("api/add",req.body);
  let data = { heading: req.body.heading, text: req.body.text };
  // console.log(data);
  await userschema.updateOne({ email: User_email }, { $push: { notes: data } });
  let db_data = (await userschema.find({ email: User_email }))
  console.log(db_data);
  // let index=db_data[0].notes.length;
  // await userschema.updateOne({email:User_email},{'notes.-1.index':index});
  db_data = (await userschema.find({ email: User_email }))
  console.log("This is add post");
  console.log(db_data[0].notes);
  // console.log(data);
  // note.insertMany([{index:1,heading:"Heading 1",text:"Hello World"}]);
  // console.log(await student.aggregate([{$match:{name:"Hello"}},{$addFields:{"obj.roll":"69"}}]))
  // await student.updateMany({},{$pull:{"obj.arr":{id:1}}})
  // const myJSON = {"name":"John", "age":30, "car":null};

  res.send(db_data[0].notes);
})

app.post('/api/delete', async (req, res) => {
  console.log(req.body);
  // await userschema.deleteOne({ _id: req.body._id });
  await userschema.updateOne({ email: User_email }, { $pull: { notes: { _id: req.body._id } } })
  let db_data = (await userschema.find({ email: User_email }))
  console.log("db_data:", db_data);
  // for(let i=0;i<db_data[0].notes.length;i++){
  //   let str="notes."+toString(i);
  //   await userschema.updateOne({email:User_email},{str:(i+1)});
  // }
  // db_data = (await userschema.find({email:User_email}))
  res.send(db_data[0].notes);

})

app.post('/api/edit', async (req, res) => {
  console.log(req.body);
  // let _heading="notes."+(req.body._id)+".heading";
  // let _text="notes."+(req.body._id)+".text"; 
  // console.log(await userschema.aggregate([{$match:{email:User_email}},{notes:{$match:{_id:req.body._id}}},{$addFields:{"heading":req.body.heading,"text":req.body.text}}]));
  let db_data = (await userschema.findOne({ email: User_email }));
  let lists = db_data.notes;
  for (let i = 0; i < lists.length; i++) {
    if (lists[i]._id == req.body._id) {
      lists[i].heading = req.body.heading;
      lists[i].text = req.body.text;
      break;
    }
  }
  await userschema.updateOne({ email: User_email }, { notes: lists });
  // ,{$set:{"heading":req.body.heading,"text":req.body.text}}
  // await userschema.updateOne({ _id: req.body._id },{ _id: req.body._id ,heading: req.body.heading, text: req.body.text});
  db_data = (await userschema.find({ email: User_email }))
  console.log("this one", db_data[0].notes);
  res.send(db_data[0].notes);

})

app.post('/api/adduser', async (req, res) => {

  let token = req.body.token;
  console.log(req.body);
  if (token != null) {
    // let email=db_data.email;
    let decoded = jwtDecode(token);
    console.log(decoded);
    let db_data = (await userschema.find({ _id: decoded.id }));
    // console.log(db_data);
    // console.log(db_data);
    if (db_data.length > 0) {
      // console.log(db_data);
      // res.header().render("secrets.ejs");
      User_email = db_data[0].email;
      console.log(User_email);
      res.redirect("http://localhost:5173/Notes");
      // res.redirect
    }
  }
  console.log("1redirect");



})

app.get('/api/add', async (req, res) => {



  console.log(User_email);
  // console.log("hello");
  let user_data = (await userschema.find({ email: User_email }));

  console.log(user_data);
  // note.insertMany([{index:1,heading:"Heading 1",text:"Hello World"}]);
  // console.log(await student.aggregate([{$match:{name:"Hello"}},{$addFields:{"obj.roll":"69"}}]))
  // await student.updateMany({},{$pull:{"obj.arr":{id:1}}})
  // const myJSON = {"name":"John", "age":30, "car":null};
  // console
  // console.log(user_data);
  res.send(user_data[0]);
})

passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
});


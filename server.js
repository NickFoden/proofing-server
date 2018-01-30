require("dotenv").config();
const bodyParser = require("body-parser");
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const passport = require("passport");
const uuidv4 = require("uuid/v4");
const path = require("path");
const nodemailer = require("nodemailer");
const sgTransport = require("nodemailer-sendgrid-transport");
// const sendGridOptions = require("./config");
const sgMail = require("@sendgrid/mail");

const { router: usersRouter } = require("./users");
const { router: authRouter, basicStrategy, jwtStrategy } = require("./auth");

const {
  PORT,
  DATABASE_URL,
  CLOUDINARY_URL,
  CLIENT_ORIGIN,
  sendGridOptions
} = require("./config");

console.log(sendGridOptions);

let cloudinary = require("cloudinary");

mongoose.Promise = global.Promise;

const { Album, Photo } = require("./models.js");

app.use(bodyParser.json());
app.use(morgan("common"));

//Need urlencoded for nodemailer
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  cors({
    origin: CLIENT_ORIGIN
  })
);

app.use(passport.initialize());
passport.use(basicStrategy);
passport.use(jwtStrategy);

app.use("/users/", usersRouter);
app.use("/auth/", authRouter);

//Photos

app.get(
  "/photos/:username",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    let user = req.params.username;
    Photo.find({ userName: user })
      .exec()
      .then(photos => {
        res.status(200).json(photos);
      })
      .catch(err => {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
      });
  }
);

app.post(
  "/photos/:username",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    let user = req.params.username;
    Photo.create({
      image: [req.body.uploaded],
      approved: false,
      userName: [req.body.uploaded.userName.username]
    })
      .then(photo => {
        Photo.find({ userName: user })
          .exec()
          .then(photos => {
            res.status(200).json(photos);
          });
      })
      .catch(err => {
        console.error(err);
        res.status(500).json({ message: err });
      });
  }
);

app.get(
  "/photos/sort/:username",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    let user = req.params.username;
    Photo.find({ userName: user })
      .sort({ approved: +1 })
      .then(photos => {
        res.status(200).json(photos);
      })
      .catch(err => {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
      });
  }
);

app.put("/images/:id/approve", function(req, res) {
  Photo.findByIdAndUpdate(req.params.id, { approved: true })
    .then(photo => {
      res.status(200).json(photo);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    });
});

app.put("/images/:id/disprove", function(req, res) {
  Photo.findByIdAndUpdate(req.params.id, { approved: false })
    .then(photo => {
      res.status(200).json(photo);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    });
});

app.delete(
  "/images/remove/:username",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    let user = req.params.username;
    Photo.deleteMany({ approved: true })
      .exec()
      .find({ userName: user })
      .exec()
      .then(photos => {
        res.status(200).json(photos);
      })
      .catch(err => res.status(500).json({ message: "Internal server error" }));
  }
);

//Guests approving photos

app.put("/albums/guest/:id/approve", function(req, res) {
  // let email = req.body.username;
  let index = req.body.index;
  let _id = req.body.albumId;
  let name = req.body.realName;
  let route = "albumArray." + index + ".guestApproved";
  Album.findByIdAndUpdate(_id, { $push: { [route]: name } }, { new: true })
    .exec()
    .then(album => {
      res.status(200).json(album);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    });
});

//Albums

app.post(
  "/albums/:title/:username",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    let user = req.params.username;
    let title = req.params.title;
    let newImages = req.body.images;
    Album.create({
      owner: user,
      albumTitle: title,
      albumArray: newImages,
      albumId: uuidv4()
    })
      .then(album => {
        Album.find({ userName: user })
          .exec()
          .then(album => {
            res.status(200).json(album);
          });
      })
      .catch(err => {
        console.error(err);
        res.status(500).json({ message: err });
      });
  }
);

app.get(
  "/albums/:username",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    let user = req.params.username;
    Album.find({ owner: user })
      .exec()
      .then(albums => {
        res.status(200).json(albums);
      })
      .catch(err => {
        console.error(err);
        res.status(500).json({ message: err });
      });
  }
);

app.get(
  "/albums/guest/:username",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    let user = req.params.username;
    Album.find({ guests: user })
      .exec()
      .then(albums => {
        res.status(200).json(albums);
      })
      .catch(err => {
        console.error(err);
        res.status(500).json({ message: err });
      });
  }
);

app.put(
  "/albums/:username/:albumId/:guestEmail",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    let email = req.params.guestEmail;
    let _id = req.params.albumId;
    console.log("new guest is " + email);
    Album.findByIdAndUpdate(_id, { $push: { guests: email } }, { new: true })
      .then(album => {
        res.status(200).json(album);
      })
      .catch(err => {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
      });
  }
);

// CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

//NodeMailer for contact form
app.post("/send", (req, res) => {
  console.log(req.body);
  const msg = `
    <p>You have a new contact</p>
    <h3>Contact Details</h3>
    <ul>
        <li>Name: ${req.body.name}</li>
        <li>Email: ${req.body.email}</li>
        <li>Company: ${req.body.link}</li>
    </ul>
    <h3>Message</h3>
    <p>${req.body.message}</p>
    `;
  let transporter = nodemailer.createTransport(sgTransport(sendGridOptions));

  let mailOptions = {
    from: '"Nick Portfolio" <nick@madeupaddress.com>',
    to: "nickfoden@gmail.com",
    subject: "New Email from Nick Is Online",
    text: "Hello world?",
    html: msg // html body of email from just above
  };
  // sgMail.send(msg); - more up to date way that should be utilized
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

    //no view res. since this is server just for processing email
    // res.render("contact", { msg: "Email has been sent" });
    res.status(200).json({ message: "Email has been sent" });
  });
});

//End Nodemailer

app.use("*", (req, res) => {
  return res
    .status(404)
    .json({ message: "You have reached a server endpoint. " });
});

let server;

function runServer(databaseUrl = DATABASE_URL, port = PORT) {
  return new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, err => {
      if (err) {
        return reject(err);
      }
      server = app
        .listen(port, () => {
          console.log(`Your app is listening on port ${port}`);
          resolve();
        })
        .on("error", err => {
          mongoose.disconnect();
          reject(err);
        });
    });
  });
}

function stopServer() {
  return mongoose.disconnect().then(() => {
    return new Promise((resolve, reject) => {
      console.log("Closing server");
      server.close(err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
}

if (require.main === module) {
  runServer().catch(err => console.error(err));
}

module.exports = { app, runServer, stopServer };

import cors from "cors";
import mongoose from "mongoose";
import express from "express";
import dotenv from "dotenv";
import User from "./modals/user.js";
import Tweet from "./modals/tweet.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Twittter backend is running successfully");
});

const port = process.env.PORT || 5000;
const url = process.env.MONGODB_URL;

mongoose
  .connect(url)
  .then(() => {
    console.log("Connected to DB");
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((err) => {
    console.log("error : ", err.message);
  });

app.post("/register", async (req, res) => {
  try {
    const existinguser = await User.findOne({ email: req.body.email });
    if (existinguser) {
      return res.status(200).send(existinguser);
    }
    const newUser = new User(req.body);
    await newUser.save();
    return res.status(201).send(newUser);
  } catch (error) {
    console.error("REGISTER ERROR FULL:", error);
    return res.status(400).send({
      message: error.message,
      name: error.name,
      code: error.code,
      keyValue: error.keyValue,
    });
  }
});

app.get("/loggedinuser", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).send({ error: "Email required" });
    }
    const user = await User.findOne({ email: email });
    return res.status(200).send(user);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

app.patch("/userupdate/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const updated = await User.findOneAndUpdate(
      { email },
      { $set: req.body },
      { new: true, upsert: false }
    );
    I;
    return res.status(200).send(updated);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});


app.post("/tweet", async (req, res) => {
  try {
    const newTweet = new Tweet(req.body);
    await newTweet.save();
    return res.status(201).send(newTweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

app.get("/post", async (req, res) => {
  try {
    const tweet = await Tweet.find().sort({timestamp: -1}).populate("author");
    return res.status(200).send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
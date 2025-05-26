/** @format */

// connectdb.js
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "./env" });



async function connectdb() {
  try {
    await mongoose.connect(`${process.env.MONGO_URI}`);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error occurred while connecting to the database: " + error);
  }
}

export default connectdb;

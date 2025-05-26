/** @format */

import connectdb from "./db/index.js";
import { app } from "./app.js";
import dotenv from "dotenv";
dotenv.config({ path: "./env" });
connectdb()
  .then(() => {
    app.on("error", (error) => {
      console.error("App encountered an error:", error);
    });
    app.listen(process.env.PORT || 5000, () => {
      console.log(`App is listening on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("Mongo db connection error", err);
  });

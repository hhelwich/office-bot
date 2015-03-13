let express = require("express");
let mongoose = require("mongoose");

mongoose.connect("mongodb://localhost/office-bot");

import hello from "./shared.js";

let app = express();

app.use("/", express.static(__dirname + "/static"));

app.get("/hello", (req, res) => {
  res.send(hello());
});


app.listen("4000");

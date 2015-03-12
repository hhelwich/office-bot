let express = require("express");
let mongoose = require("mongoose");

mongoose.connect("mongodb://localhost/office-bot");


let app = express();

app.use("/", express.static(__dirname + "/static"));

app.get("/hello", function(req, res) {
  res.send("Hello!");
});


app.listen("4000");

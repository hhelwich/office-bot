let express = require("express");


import hello from "../shared.js";

let app = express();

app.use("/", express.static(__dirname + "/../public"));

app.get("/hello", (req, res) => {
  res.send(hello());
});


app.listen("4000");

const { config } = require("dotenv");
const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");
const axios = require('axios');
const path = require("path");
const MainRouter = require("./app/routers");
const errorHandlerMiddleware = require("./app/middlewares/error_middleware");
const whatsapp = require("wa-multi-session");

config();

var app = express();
app.use(express.static(__dirname + '/public'));
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.set("view engine", "ejs");
// Public Path
app.use("/p", express.static(path.resolve("public")));
app.use("/p/*", (req, res) => res.status(404).send("Media Not Found"));

app.use(MainRouter);

app.use(errorHandlerMiddleware);

const PORT = process.env.PORT || "5000";
app.set("port", PORT);
var server = http.createServer(app);
server.on("listening", () => console.log("APP IS RUNNING ON PORT " + PORT));

server.listen(PORT);

whatsapp.onConnected((session) => {
  console.log("connected => ", session);
});

whatsapp.onDisconnected((session) => {
  console.log("disconnected => ", session);
});

whatsapp.onConnecting((session) => {
  console.log("connecting => ", session);
});

whatsapp.onMessageReceived(async (msg) => {
  console.log(`New Message Received On Session: ${msg.sessionId} >>>`, msg);
  if (msg.key.fromMe || msg.key.remoteJid.includes("status") || msg.key.participant !== undefined) return;
  console.log('replying ...')
  const url = 'http://newpaklay.test/api/save-message';

  axios.post(url, {
    message_id: msg.key.id,
    message: msg.message.conversation,
    remote_jid: msg.key.remoteJid
  })
  .then(function (response) {
    console.log(response);
  })
  .catch(function (error) {
    console.log(error);
  });
  // await whatsapp.readMessage({
  //   sessionId: msg.sessionId,
  //   key: msg.key,
  // });
  // await whatsapp.sendTyping({
  //   sessionId: msg.sessionId,
  //   to: msg.key.remoteJid,
  //   duration: 3000,
  // });
  // await whatsapp.sendTextMessage({
  //   sessionId: msg.sessionId,
  //   to: msg.key.remoteJid,
  //   text: "Hello!",
  //   answering: msg, // for quoting message
  // });
});

whatsapp.loadSessionsFromStorage();

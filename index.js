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
  if (msg.key.remoteJid.includes("status") || msg.key.participant !== undefined) return;
  console.log('replying ...')
  const url = 'http://newpaklay.test/api/save-message';
  const token = 'kmzway87aa';
  const config = {
    headers: { Authorization: `Bearer ${token}` }
  };

  console.log('conversation: ', msg.message.conversation);
  console.log('------------------------------------');
  console.log('video: ', msg.message.videoMessage);
  console.log('------------------------------------');
  console.log('dokumen: ', msg.message.documentMessage);
  console.log('------------------------------------');
  if (msg.message.imageMessage !== null) {
    msg.saveImage("storage/images/" + Date.now().toString() + ".jpg");
    console.log('save image.. ');
  } else if (msg.message.videoMessage !== null) {
    msg.saveVideo("storage/videos/" + Date.now().toString() + ".mp4");
    console.log('save video.. ');
  } else if (msg.message.documentMessage !== null) {
    console.log('save dokumen.. ');
    msg.saveDocument("storage/documents/" + Date.now().toString());
  }

  if (msg.message.conversation !== '') {
    axios.post(url, {
      message_id: msg.key.id,
      message: msg.message.conversation,
      remote_jid: msg.key.remoteJid,
      from_me: msg.key.fromMe
    }, config)
      .then(function (response) {
        //console.log(response); ImageMessage
        console.log('-- ok --');
      })
      .catch(function (error) {
        console.log('-- error --');
        // console.log(error);
      });
  }
});

whatsapp.loadSessionsFromStorage();

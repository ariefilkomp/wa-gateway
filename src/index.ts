import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import moment from "moment";
import { globalErrorMiddleware } from "./middlewares/error.middleware";
import { notFoundMiddleware } from "./middlewares/notfound.middleware";
import { serve } from "@hono/node-server";
import { env } from "./env";
import { createSessionController } from "./controllers/session";
import * as whastapp from "wa-multi-session";
import { createMessageController } from "./controllers/message";
import axios from 'axios';

const app = new Hono();

app.use(
  logger((...params) => {
    params.map((e) => console.log(`${moment().toISOString()} | ${e}`));
  })
);
app.use(cors());

app.onError(globalErrorMiddleware);
app.notFound(notFoundMiddleware);

/**
 * session routes
 */
app.route("/session", createSessionController());
/**
 * message routes
 */
app.route("/message", createMessageController());

const port = env.PORT;

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);

whastapp.onConnected((session) => {
  console.log(`session: '${session}' connected`);
});

whastapp.onMessageReceived(async (msg) => {
  console.log(`New Message Received On Session: ${msg.sessionId} >>>`, msg);
  if (msg?.key?.remoteJid?.includes("status") || msg.key.participant !== undefined) return;
  console.log('replying ...')
  const TOKEN = process.env.TOKEN || "";
  const url = process.env.FW_URL || "";

  const config = {
    headers: { Authorization: `Bearer ${TOKEN}` }
  };

  console.log('conversation: ', msg.message?.conversation);
  console.log('------------------------------------');
  console.log('video: ', msg.message?.videoMessage);
  console.log('------------------------------------');
  console.log('dokumen: ', msg.message?.documentMessage);
  console.log('------------------------------------');

  if (msg.message?.imageMessage !== null) {
    msg.saveImage("storage/images/" + Date.now().toString() + ".jpg");
    console.log('save image.. ');
  } else if (msg.message.videoMessage !== null) {
    msg.saveVideo("storage/videos/" + Date.now().toString() + ".mp4");
    console.log('save video.. ');
  } else if (msg.message.documentMessage !== null) {
    console.log('save dokumen.. ');
    msg.saveDocument("storage/documents/" + Date.now().toString());
  }

  if (msg.message?.conversation !== '') {
    axios.post(url, {
      message_id: msg.key.id,
      message: msg.message?.conversation,
      remote_jid: msg.key.remoteJid,
      from_me: msg.key.fromMe
    }, config)
      .then(function (response) {
        console.log(response);
        console.log('-- ok --');
      })
      .catch(function (error) {
        console.log('-- error --');
        console.log(error);
      });
  }
});

whastapp.loadSessionsFromStorage();

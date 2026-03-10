import type { MessageReceived } from "wa-multi-session";
import { CreateWebhookProps, webhookClient } from ".";
import {
  handleWebhookAudioMessage,
  handleWebhookDocumentMessage,
  handleWebhookImageMessage,
  handleWebhookVideoMessage,
} from "./media";
import { pool } from "../db";
import { randomUUID } from "crypto";

type WebhookMessageBody = {
  session: string;
  from: string | null;
  to: string | null;
  message: string | null;

  media: {
    image: string | null;
    video: string | null;
    document: string | null;
    audio: string | null;
  };
};

export const createWebhookMessage =
  (props: CreateWebhookProps) => async (message: MessageReceived) => {
    const endpoint = props.baseUrl ? `${props.baseUrl}/message` : undefined;

    // Ignore broadcast and group messages
    if (
      message.key.remoteJid?.includes("broadcast") ||
      message.key.remoteJid?.includes("@g.us") ||
      message.key.remoteJid?.includes("@newsletter") 
    ) {
      console.log("Ignoring :",message.key.remoteJid);
      return;
    }

    const isOutgoing = message.key.fromMe;

    let strToParse = message.key.remoteJid ?? "";
    if(message.key.remoteJid?.includes("@lid")) {
      strToParse = message.key.remoteJidAlt ?? "";
    }
    
    const fromNumber = isOutgoing ? "SYSTEM" : (strToParse.split("@")[0] ?? null);
    const toNumber = isOutgoing ? (strToParse.split("@")[0] ?? null) : "SYSTEM";

    const image = await handleWebhookImageMessage(message);
    const video = await handleWebhookVideoMessage(message);
    const document = await handleWebhookDocumentMessage(message);
    const audio = await handleWebhookAudioMessage(message);
    console.log(JSON.stringify(message));
    const body = {
      session: message.sessionId,
      from: fromNumber,
      to: toNumber,
      message:
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        message.message?.imageMessage?.caption ||
        message.message?.videoMessage?.caption ||
        message.message?.documentMessage?.caption ||
        message.message?.contactMessage?.displayName ||
        message.message?.locationMessage?.comment ||
        message.message?.liveLocationMessage?.caption ||
        null,

      /**
       * media message
       */
      media: {
        image,
        video,
        document,
        audio,
      },
    } satisfies WebhookMessageBody;

    try {
      // Make sure to add the 'to_number' column to your 'messages' table
      if(isOutgoing) {
        const [result] = await pool.query(
          "INSERT INTO messages (id, from_number, to_number, message, image, video, audio, processed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            randomUUID(),
            body.from,
            body.to,
            body.message,
            body.media.image,
            body.media.video,
            body.media.audio,
            true, // Mark outgoing messages as processed
            new Date(),
            new Date(),
          ]
        );
        console.log("Message saved to database", result);
      } else {
        const [result] = await pool.query(
          "INSERT INTO messages (id, from_number, to_number, message, image, video, audio, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            randomUUID(),
            body.from,
            body.to,
            body.message,
            body.media.image,
            body.media.video,
            body.media.audio,
            new Date(),
            new Date(),
          ]
        );
        console.log("Message saved to database", result);
      }
    } catch (error) {
      console.error("Failed to save message to database", error);
    }

    if (endpoint) {
      webhookClient.post(endpoint, body).catch(console.error);
    }
  };

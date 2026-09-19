import type { MessageReceived } from "wa-multi-session";
import { CreateWebhookProps, webhookClient } from ".";
import {
  handleWebhookAudioMessage,
  handleWebhookDocumentMessage,
  handleWebhookImageMessage,
  handleWebhookVideoMessage,
} from "./media";
import { whatsapp } from "../whatsapp";

type WebhookMessageBody = {
  session: string;
  from: string | null;
  to?: string | null;
  from_me: boolean;
  remote_jid?: string | null;
  sender_number?: string | null;
  recipient_number?: string | null;
  push_name?: string | null;
  is_group?: boolean;
  participant?: string | null;
  lid?: string | null;
  message: string | null;

  media: {
    image: string | null;
    video: string | null;
    document: string | null;
    audio: string | null;
  };
};

function cleanJid(jid?: string | null): string | null {
  if (!jid) return null;
  const parts = jid.split("@");
  if (parts.length < 2 || !parts[0] || !parts[1]) return jid;
  const cleanUser = parts[0].split(":")[0];
  return `${cleanUser}@${parts[1]}`;
}

async function resolveSenderInfo(message: MessageReceived) {
  const key = message.key as any;
  const remoteJid = key?.remoteJid as string | undefined;
  const isGroup = Boolean(remoteJid?.endsWith("@g.us"));
  const fromMe = Boolean(key?.fromMe);

  let participantJid: string | null = null;
  let senderJid: string | null = null;
  let recipientJid: string | null = null;
  let originalLid: string | null = null;

  let session: any = null;
  let myJid: string | null = null;
  try {
    session = await whatsapp.getSessionById(message.sessionId);
    myJid = cleanJid(session?.sock?.user?.id) || null;
  } catch (err) {
    // ignore
  }

  if (isGroup) {
    const rawParticipant =
      key?.participantAlt ||
      key?.participant ||
      (message as any).participant ||
      null;
    participantJid = rawParticipant;

    if (rawParticipant?.endsWith("@lid")) {
      originalLid = rawParticipant;
      try {
        const sock = session?.sock as any;
        const mappedPn =
          await sock?.signalRepository?.lidMapping?.getPNForLID?.(rawParticipant);
        if (mappedPn) {
          participantJid = mappedPn;
        }
      } catch (err) {
        console.warn("Failed to resolve participant LID to PN:", err);
      }
    }

    if (fromMe) {
      senderJid = myJid;
      recipientJid = remoteJid || null;
    } else {
      senderJid = participantJid;
      recipientJid = myJid;
    }
  } else {
    let resolvedRemote = key?.remoteJidAlt || remoteJid || null;

    if (remoteJid?.endsWith("@lid")) {
      originalLid = remoteJid;

      if (key?.remoteJidAlt && !key.remoteJidAlt.endsWith("@lid")) {
        resolvedRemote = key.remoteJidAlt;
      } else {
        try {
          const sock = session?.sock as any;
          const mappedPn =
            await sock?.signalRepository?.lidMapping?.getPNForLID?.(remoteJid);
          if (mappedPn) {
            resolvedRemote = mappedPn;
          }
        } catch (err) {
          console.warn("Failed to resolve remoteJid LID to PN:", err);
        }
      }
    }

    if (fromMe) {
      senderJid = myJid;
      recipientJid = resolvedRemote;
    } else {
      senderJid = resolvedRemote;
      recipientJid = myJid;
    }
  }

  const cleanedRemoteJid = cleanJid(remoteJid);
  const cleanedSenderJid = cleanJid(senderJid);
  const cleanedRecipientJid = cleanJid(recipientJid);
  const cleanedParticipantJid = cleanJid(participantJid);

  let senderNumber: string | null = null;
  if (cleanedSenderJid?.endsWith("@s.whatsapp.net")) {
    senderNumber = cleanedSenderJid.split("@")[0] ?? null;
  }

  let recipientNumber: string | null = null;
  if (cleanedRecipientJid?.endsWith("@s.whatsapp.net")) {
    recipientNumber = cleanedRecipientJid.split("@")[0] ?? null;
  }

  return {
    fromMe,
    isGroup,
    from: (isGroup ? (fromMe ? cleanedSenderJid : cleanedRemoteJid) : (cleanedSenderJid || cleanedRemoteJid)) ?? null,
    to: cleanedRecipientJid ?? null,
    remoteJid: cleanedRemoteJid ?? null,
    senderNumber,
    recipientNumber,
    participant: cleanedParticipantJid,
    lid: originalLid ? cleanJid(originalLid) : null,
  };
}

export const createWebhookMessage =
  (props: CreateWebhookProps) => async (message: MessageReceived) => {
    if (!props.baseUrl) return;
    if (message.key.remoteJid?.includes("broadcast"))
      return;

    const endpoint = `${props.baseUrl}/message`;

    const senderInfo = await resolveSenderInfo(message);

    const image = await handleWebhookImageMessage(message);
    const video = await handleWebhookVideoMessage(message);
    const document = await handleWebhookDocumentMessage(message);
    const audio = await handleWebhookAudioMessage(message);

    const body = {
      session: message.sessionId,
      from: senderInfo.from,
      to: senderInfo.to,
      from_me: senderInfo.fromMe,
      remote_jid: senderInfo.remoteJid,
      sender_number: senderInfo.senderNumber,
      recipient_number: senderInfo.recipientNumber,
      push_name: message.pushName ?? null,
      is_group: senderInfo.isGroup,
      participant: senderInfo.participant,
      lid: senderInfo.lid,
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
    webhookClient.post(endpoint, body).catch(console.error);
  };

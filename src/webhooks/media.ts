import type { MessageReceived } from "wa-multi-session";

const baseMediaPath = "./media/";

export const handleWebhookImageMessage = async (message: MessageReceived) => {
  if (message.message?.imageMessage && message.message.imageMessage.mediaKey) {
    const baseMediaName = `${message.key.id}`;

    const fileName = `${baseMediaName}.jpg`;
    await message.saveImage(baseMediaPath + fileName);
    return fileName;
  }
  return null;
};

export const handleWebhookVideoMessage = async (message: MessageReceived) => {
  if (message.message?.videoMessage && message.message.videoMessage.mediaKey) {
    const baseMediaName = `${message.key.id}`;

    const fileName = `${baseMediaName}.mp4`;
    await message.saveVideo(baseMediaPath + fileName);
    return fileName;
  }
  return null;
};

export const handleWebhookDocumentMessage = async (
  message: MessageReceived
) => {
  if (
    message.message?.documentMessage &&
    message.message.documentMessage.mediaKey
  ) {
    const baseMediaName = `${message.key.id}`;

    const fileName = `${baseMediaName}`;
    await message.saveDocument(baseMediaPath + fileName);
    return fileName;
  }
  return null;
};

export const handleWebhookAudioMessage = async (message: MessageReceived) => {
  if (message.message?.audioMessage && message.message.audioMessage.mediaKey) {
    const baseMediaName = `${message.key.id}`;

    const fileName = `${baseMediaName}.mp3`;
    await message.saveAudio(baseMediaPath + fileName);
    return fileName;
  }
  return null;
};

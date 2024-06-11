const { Router } = require("express");
const {
  sendMessage,
  sendBulkMessage,
} = require("../controllers/message_controller");
const MessageRouter = Router();

MessageRouter.post("/send-message", sendMessage);
MessageRouter.post("/send-bulk-message", sendBulkMessage);

module.exports = MessageRouter;

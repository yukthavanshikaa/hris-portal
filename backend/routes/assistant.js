const express = require("express");
const authenticateToken = require("../middleware/auth");
const { processAssistantQuery } = require("../lib/assistantService");

const router = express.Router();

/**
 * POST /api/assistant/chat
 * Authenticated conversational query endpoint for the Company Assistant.
 */
router.post("/chat", authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        message: "A valid message string is required."
      });
    }

    // Process query using authenticated user context
    const response = await processAssistantQuery(message.trim(), req.user);

    return res.json(response);
  } catch (error) {
    console.error("Assistant Chat Error:", error);
    return res.status(500).json({
      message: "An error occurred while processing your query. Please try again later.",
      sources: ["Error Handler"]
    });
  }
});

module.exports = router;

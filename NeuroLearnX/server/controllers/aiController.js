/**
 * NeuroX AI chat — placeholder or proxy to Python / external LLM.
 */
const { forwardPythonChat } = require("../services/pythonAi");

async function chat(req, res) {
  try {
    const { message, context } = req.body || {};
    const text = String(message || "").trim();
    if (!text) {
      return res.status(400).json({ message: "message is required" });
    }

    const py = await forwardPythonChat(text, context);
    if (py) {
      return res.json({ reply: py.reply, source: py.source || "python-service" });
    }

    const lower = text.toLowerCase();
    let reply =
      "I'm NeuroX — your learning assistant. Ask about course topics, quizzes, or ML concepts.";
    if (lower.includes("gradient")) {
      reply =
        "Gradients measure how loss changes with respect to each weight; optimizers use them to update parameters during training.";
    } else if (lower.includes("overfit")) {
      reply =
        "Overfitting means the model memorizes training noise. Mitigate with more data, dropout, regularization, or simpler models.";
    } else if (lower.includes("cnn") || lower.includes("convolution")) {
      reply =
        "CNNs use convolutional layers to capture spatial structure in images via learnable filters and pooling.";
    }

    return res.json({ reply, source: "placeholder" });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "AI service error" });
  }
}

module.exports = { chat };

/**
 * Public API routes that your existing frontend JS already calls.
 * These are not part of auth, but they connect the current UI to a working backend.
 */
const express = require("express");

const router = express.Router();

// Dashboard charts/modules data
router.get("/dashboard", async (req, res) => {
  res.json({
    progress: [
      { week: "W1", score: 42 },
      { week: "W2", score: 55 },
      { week: "W3", score: 61 },
      { week: "W4", score: 70 },
      { week: "W5", score: 74 },
      { week: "W6", score: 83 },
      { week: "W7", score: 88 },
    ],
    skills: [
      { skill: "Math", val: 85 },
      { skill: "Coding", val: 78 },
      { skill: "Theory", val: 65 },
      { skill: "NLP", val: 45 },
      { skill: "CV", val: 72 },
      { skill: "MLOps", val: 30 },
    ],
    modules: [
      { title: "Python & Math Foundations", topics: 6, done: 6, color: "#00D4AA" },
      { title: "Classical ML Algorithms", topics: 8, done: 7, color: "#6C63FF" },
      { title: "Deep Learning & CNNs", topics: 10, done: 5, color: "#F59E0B" },
      { title: "NLP & Transformers", topics: 9, done: 2, color: "#EC4899" },
      { title: "MLOps & Deployment", topics: 7, done: 0, color: "#64748B" }
    ],
  });
});

// Quiz questions
router.get("/quiz", async (req, res) => {
  res.json([
    {
      q: "What does the ReLU activation function do?",
      opts: ["Normalizes the input", "Sets negative values to 0", "Converts values to probabilities", "Prevents overfitting"],
      ans: 1,
      exp: "ReLU(x) = max(0, x), so it zeroes out negative activations and keeps positive ones.",
    },
    {
      q: "Which technique is commonly used to reduce overfitting in neural networks?",
      opts: ["Dropout", "Batching", "Tokenization", "Pooling"],
      ans: 0,
      exp: "Dropout randomly disables neurons during training, reducing reliance on specific activations.",
    },
    {
      q: "What is the purpose of backpropagation?",
      opts: ["To initialize weights", "To compute gradients for weight updates", "To generate random noise", "To reduce the dataset size"],
      ans: 1,
      exp: "Backpropagation computes gradients of the loss w.r.t. parameters so optimizers can update weights.",
    },
  ]);
});

// Tutor endpoint (simple deterministic reply; swap with real LLM later)
router.post("/tutor", async (req, res) => {
  const { message } = req.body || {};
  const text = String(message || "").trim();

  if (!text) return res.status(400).json({ message: "message is required" });

  const reply =
    text.toLowerCase().includes("backprop")
      ? "Backpropagation computes gradients of the loss through the network using the chain rule, enabling weight updates via gradient descent."
      : text.toLowerCase().includes("attention")
      ? "Attention lets a model focus on the most relevant parts of the input by computing weighted combinations of values based on query–key similarity."
      : "Good question. Share what you already know and what specifically is confusing, and I’ll explain step-by-step with a small example.";

  return res.json({ reply });
});

// Lab experiment endpoint (mock training results)
router.post("/lab/run", async (req, res) => {
  const epochs = 6;
  const training_curve = Array.from({ length: epochs }, (_, i) => {
    const epoch = i + 1;
    const train = Math.min(0.98, 0.78 + i * 0.035);
    const val = Math.min(0.94, 0.74 + i * 0.03);
    return { epoch, train: Number(train.toFixed(3)), val: Number(val.toFixed(3)) };
  });

  res.json({
    dataset: req.body?.dataset || "demo",
    model: req.body?.model || "demo",
    epochs,
    accuracy: training_curve[training_curve.length - 1].val,
    f1_score: Number((0.72 + Math.random() * 0.2).toFixed(2)),
    parameters: 125000 + Math.floor(Math.random() * 75000),
    training_curve,
  });
});

module.exports = router;


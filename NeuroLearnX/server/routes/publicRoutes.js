/**
 * Public API routes that your existing frontend JS already calls.
 * These are not part of auth, but they connect the current UI to a working backend.
 */
const express = require("express");
const Course = require("../models/Course");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const authController = require("../controllers/authController");

const router = express.Router();

// ── Top-level auth aliases ────────────────────────────────────────────────
// POST /api/register  →  same as POST /api/auth/student/register
// POST /api/login     →  same as POST /api/auth/login
router.post("/register", authController.registerStudent);
router.post("/login",    authController.login);

// ── Public courses list (GET /api/courses) ────────────────────────────────
router.get("/courses", async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true })
      .select("title slug description modules quizIds createdAt")
      .lean();
    return res.json({ courses });
  } catch (err) {
    return res.status(500).json({ message: "Could not load courses." });
  }
});

// ── Enrolled courses for logged-in student (GET /api/courses/enrolled) ────
router.get("/courses/enrolled", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const User = require("../models/User");
    const Quiz = require("../models/Quiz");
    const user = await User.findById(req.user._id).select("enrolledCourses");
    const ids = user.enrolledCourses || [];
    const courses = await Course.find({ _id: { $in: ids }, isPublished: true })
      .select("title slug description modules quizIds createdAt")
      .lean();
    const withMeta = await Promise.all(
      courses.map(async (c) => {
        const quizCount = await Quiz.countDocuments({ courseId: c._id });
        return { ...c, quizCount };
      })
    );
    return res.json({ courses: withMeta });
  } catch (err) {
    return res.status(500).json({ message: "Could not load enrolled courses." });
  }
});

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

// Tutor endpoint — calls Groq API (llama-3.1-8b-instant) with full history + debug logging
router.post("/tutor", async (req, res) => {
  const { message, history } = req.body || {};
  const userMsg = String(message || "").trim();
  if (!userMsg) return res.status(400).json({ message: "message is required" });

  const groqKey = (process.env.GROQ_API_KEY || "").trim();

  // ── Debug: log key status ─────────────────────────────────────────────
  if (groqKey) {
    const masked = groqKey.slice(0, 5) + "****" + groqKey.slice(-4);
    console.log(`[NeuroBot] KEY: ${masked}`);
  } else {
    console.log("[NeuroBot] KEY: NOT SET — using fallback replies");
  }
  console.log(`[NeuroBot] User asked: ${userMsg}`);

  // ── Fallback replies (no API key or Groq fails) ───────────────────────
  function fallback(text) {
    const t = (text || "").toLowerCase();
    if (!t) return "Hi! I'm NeuroBot 🤖 — ask me anything about ML, deep learning, NLP, or MLOps!";
    if (t.includes("backprop") || t.includes("gradient"))
      return "Backpropagation computes gradients of the loss through the network using the chain rule, enabling weight updates via gradient descent. Each layer gets a signal proportional to how much it contributed to the error.";
    if (t.includes("attention") || t.includes("transformer"))
      return "Attention lets a model focus on the most relevant parts of the input by computing weighted combinations of values based on query–key similarity. Transformers stack self-attention + feed-forward blocks — that's why they scale so well.";
    if (t.includes("cnn") || t.includes("convolution"))
      return "CNNs use learnable filters that slide over an image to detect local patterns (edges, textures, shapes). Pooling reduces spatial size; stacked conv blocks build a hierarchy from simple strokes to full objects.";
    if (t.includes("overfit") || t.includes("dropout") || t.includes("regulariz"))
      return "Overfitting means the model memorizes training quirks. Fix it with: more data, dropout, weight decay, early stopping, and honest validation. If train accuracy rockets but val stalls — classic overfit signal.";
    if (t.includes("lstm") || t.includes("rnn"))
      return "LSTMs are RNNs with gating (input, forget, output gates) that control what to remember or discard across time steps — solving the vanishing gradient problem that plain RNNs suffer from on long sequences.";
    if (t.includes("neural") || t.includes("network"))
      return "A neural network maps inputs to outputs through layers of weighted connections + nonlinearities (ReLU, sigmoid). Training uses backprop + an optimizer (SGD, Adam) to minimize a loss function on labeled data.";
    if (t.includes("batch norm") || t.includes("normalization"))
      return "Batch normalization normalizes layer inputs to zero mean and unit variance per mini-batch, then scales/shifts with learned parameters. It stabilizes training, allows higher learning rates, and acts as mild regularization.";
    if (t.includes("gan") || t.includes("generative"))
      return "A GAN has two networks: a Generator that creates fake samples and a Discriminator that tries to tell real from fake. They train adversarially — the generator improves until the discriminator can't tell the difference.";
    if (t.includes("bert") || t.includes("gpt") || t.includes("llm"))
      return "BERT uses bidirectional Transformer encoders pre-trained with masked language modeling. GPT uses causal (left-to-right) decoders. Both are fine-tuned on downstream tasks — the foundation of modern NLP.";
    if (t.includes("diffusion"))
      return "Diffusion models learn to reverse a gradual noising process. Training adds noise step-by-step; inference denoises from pure noise to a clean sample. They power state-of-the-art image generation (Stable Diffusion, DALL-E 3).";
    if (t.includes("mlops") || t.includes("deploy") || t.includes("production"))
      return "MLOps bridges ML and DevOps: version your data + models, automate training pipelines, monitor for drift, and set up rollback triggers. Treat model serving with the same rigor as any production software system.";
    if (t.includes("reinforcement") || /\brl\b/.test(t))
      return "RL learns a policy by trial and error using rewards. The agent takes actions, observes outcomes, and updates its policy to maximize cumulative reward. Key algorithms: Q-Learning, DQN, PPO, SAC.";
    return "Great question! Could you give me a bit more context? I can explain any ML concept — CNNs, Transformers, loss functions, optimizers, MLOps, RL — just name the topic and I'll break it down with an example.";
  }

  // ── No API key → fallback ─────────────────────────────────────────────
  if (!groqKey) {
    const reply = fallback(userMsg);
    console.log(`[NeuroBot] Fallback reply: ${reply.slice(0, 80)}...`);
    return res.json({ reply });
  }

  // ── Build Groq messages ───────────────────────────────────────────────
  const SYSTEM_PROMPT =
    "You are NeuroBot, an expert AI tutor for NeuroLearnX — an advanced ML learning platform. " +
    "Help students understand ML concepts: neural networks, CNNs, NLP, Transformers, MLOps, RL, optimizers, loss functions, etc.\n\n" +
    "Rules:\n" +
    "- Be concise (under 150 words)\n" +
    "- Friendly, encouraging tone\n" +
    "- Give a short concrete example where helpful\n" +
    "- Stay focused on ML / AI / data science";

  const messages = [{ role: "system", content: SYSTEM_PROMPT }];

  for (const item of (history || [])) {
    const roleRaw = (item.role || "user").toLowerCase();
    const role = ["assistant", "ai", "model"].includes(roleRaw) ? "assistant" : "user";
    const content = (item.text || item.content || "").trim();
    if (content) messages.push({ role, content });
  }
  messages.push({ role: "user", content: userMsg });

  console.log(`[NeuroBot] Sending ${messages.length} message(s) to Groq model=llama-3.1-8b-instant`);

  // ── Call Groq ─────────────────────────────────────────────────────────
  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages,
        max_tokens: 300,
        temperature: 0.6,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text().catch(() => groqRes.status);
      console.error(`[NeuroBot] Groq HTTP ${groqRes.status}: ${String(errText).slice(0, 120)}`);
      const reply = fallback(userMsg);
      console.log(`[NeuroBot] Fallback reply: ${reply.slice(0, 80)}...`);
      return res.json({ reply });
    }

    const data = await groqRes.json();
    const reply = (data.choices?.[0]?.message?.content || "").trim();

    if (reply) {
      console.log(`[NeuroBot] AI Response: ${reply.slice(0, 120)}${reply.length > 120 ? "..." : ""}`);
      return res.json({ reply });
    }

    console.warn("[NeuroBot] Groq returned empty content — using fallback");
    return res.json({ reply: fallback(userMsg) });

  } catch (err) {
    console.error(`[NeuroBot] Groq fetch error: ${err.message}`);
    return res.json({ reply: fallback(userMsg) });
  }
});

// Lab experiment endpoint
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

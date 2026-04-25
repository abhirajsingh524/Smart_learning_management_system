import re
import logging

from flask import current_app

# ── Module-level logger ───────────────────────────────────────────────────
logger = logging.getLogger(__name__)

# ── Groq model ────────────────────────────────────────────────────────────
_GROQ_MODEL = "llama-3.1-8b-instant"

# ── System prompt ─────────────────────────────────────────────────────────
_SYSTEM_PROMPT = (
    "You are NeuroBot, an expert AI tutor for NeuroLearnX — an advanced ML learning platform. "
    "Help students understand ML concepts such as neural networks, CNNs, NLP, Transformers, "
    "MLOps, Reinforcement Learning, optimizers, loss functions, and more.\n\n"
    "Rules:\n"
    "- Be concise (under 150 words per reply)\n"
    "- Use a friendly, encouraging tone\n"
    "- Give a short, concrete example where helpful\n"
    "- Stay focused on ML / AI / data science topics"
)


def _fallback_reply(message: str) -> str:
    """High-quality offline replies when no API key is set or the model call fails."""
    text = (message or "").strip().lower()
    if not text:
        return (
            "Hi — I am NeuroBot. Pick a topic (e.g. neural nets, loss functions, CNNs, or how to study ML) "
            "and I will walk you through it with a short example."
        )
    if "neural" in text or "network" in text:
        return (
            "A neural network maps inputs to outputs through layers. Each layer applies weights and a "
            "nonlinearity (like ReLU) so the model can learn curved boundaries, not just straight lines. "
            "Training compares predictions to labels using a loss, then backpropagation computes "
            "how to tweak each weight. Picture classifying digits: early layers catch edges; deeper layers "
            "combine them into shapes and digits."
        )
    if "gradient" in text or "backprop" in text:
        return (
            "Gradients tell you how much the loss would change if you nudged each weight. Optimizers "
            "(SGD, Adam) use those signals to update weights step by step. Backpropagation applies the "
            "chain rule through the network so every layer gets a useful update signal—without it, deep "
            "models would not train reliably."
        )
    if "attention" in text or "transformer" in text:
        return (
            "Attention compares a query from one position to keys from other positions, then builds "
            "a weighted mix of values—so the model can focus on relevant words or pixels. Transformers "
            "stack self-attention and feed-forward blocks, which is why modern NLP and vision models scale "
            "so well with data and compute."
        )
    if "cnn" in text or "convolution" in text:
        return (
            "CNNs use convolution filters that slide over an image to detect local patterns (edges, "
            "textures, parts). Pooling reduces spatial size; stacked conv blocks learn a hierarchy from "
            "simple strokes to objects. They shine on image tasks because they encode spatial locality "
            "and translation awareness better than dense layers on raw pixels alone."
        )
    if "overfit" in text or "regulariz" in text or "dropout" in text or "generaliz" in text:
        return (
            "Overfitting means the model memorizes training quirks instead of general rules. Mitigations: "
            "more diverse data, simpler architecture, dropout, weight decay, early stopping, and honest "
            "validation (hold-out set or cross-validation). If train accuracy rockets but validation stalls, "
            "that is a classic overfitting signal."
        )
    if re.search(r"\b(loss|mse)\b", text) or "cross entropy" in text or "cross-entropy" in text:
        return (
            "A loss function scores how wrong predictions are. Cross-entropy is standard for classification "
            "(probabilities vs. true class). MSE fits regression (predicted vs. real numbers). Training is "
            "the loop: forward pass, compute loss, backward pass, update weights—repeat until validation "
            "performance looks good, not just training loss."
        )
    if "optim" in text or "adam" in text or "sgd" in text:
        return (
            "SGD updates weights using the loss gradient, often with momentum for smoother steps. Adam "
            "adapts learning rates per-parameter using moving averages of gradients and their squares—usually "
            "a strong default for deep nets. Pick learning rate and batch size carefully; if loss wobbles or "
            "explodes, try a smaller rate or gradient clipping."
        )
    if "epoch" in text or "batch" in text or "learning rate" in text:
        return (
            "An epoch is one full pass through the training data. Batches split that pass into chunks "
            "so gradients are noisy but affordable. Learning rate controls step size: too large can diverge; "
            "too small trains slowly. Schedules (decay, warmup) often help late in training."
        )
    if "nlp" in text or "token" in text or "embedding" in text:
        return (
            "In NLP, text is split into tokens, mapped to embeddings (dense vectors), then processed "
            "by models (RNNs, CNNs, or Transformers) for tasks like classification, translation, or Q&A. "
            "Good tokenization and enough context window matter as much as architecture for real-world quality."
        )
    if "mlops" in text or "deploy" in text or "production" in text:
        return (
            "MLOps is how you take a notebook model to something reliable in production: versioning data and "
            "models, automated tests, monitoring (drift, latency, errors), rollbacks, and retraining triggers. "
            "Treat serving, security, and SLAs as first-class—not an afterthought once accuracy looks good."
        )
    if "reinforcement" in text or re.search(r"\brl\b", text):
        return (
            "Reinforcement learning learns a policy by trial and error using rewards (and sometimes value "
            "functions). It fits games, robotics, and recommendation tuning—but needs careful reward design; "
            "a misspecified reward can produce clever yet useless behavior."
        )
    return (
        "Here is a compact way to think about it: clarify your goal (prediction type), your data "
        "(labels, imbalance, leakage), a baseline model, then iterate with validation and error "
        "analysis. Tell me your topic in one line—CNNs, transformers, evaluation metrics, study strategy—and "
        "I will tailor the next answer."
    )


def tutor_reply(history, message):
    """
    Return a NeuroBot reply for the given message + chat history.

    Uses Groq (llama-3.1-8b-instant) when GROQ_API_KEY is configured;
    falls back to _fallback_reply() when the key is absent or the API call fails.
    """
    # ── Read & debug API key ──────────────────────────────────────────────
    key = (current_app.config.get("GROQ_API_KEY") or "").strip()

    if key:
        masked = key[:5] + "****" + key[-4:]
        logger.debug("[NeuroBot] GROQ_API_KEY loaded: %s", masked)
        print(f"[NeuroBot] KEY: {masked}")
    else:
        logger.warning("[NeuroBot] GROQ_API_KEY is not set — using fallback replies.")
        print("[NeuroBot] KEY: NOT SET — falling back to offline replies")

    # ── Guard: no key ─────────────────────────────────────────────────────
    if not key:
        return _fallback_reply(message)

    # ── Guard: empty message ──────────────────────────────────────────────
    user_msg = (message or "").strip()
    if not user_msg:
        logger.debug("[NeuroBot] Empty message received — returning fallback greeting.")
        return _fallback_reply("")

    print(f"[NeuroBot] User asked: {user_msg}")
    logger.info("[NeuroBot] User asked: %s", user_msg)

    try:
        from groq import Groq  # lazy import — only needed when key is present

        client = Groq(api_key=key)

        # ── Build messages in Groq / OpenAI format ────────────────────────
        messages = [{"role": "system", "content": _SYSTEM_PROMPT}]

        for item in history or []:
            role_raw = (item.get("role") or "user").lower()
            role = "assistant" if role_raw in ("assistant", "ai", "model") else "user"
            content = (item.get("text") or item.get("content") or "").strip()
            if content:
                messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": user_msg})

        logger.debug(
            "[NeuroBot] Sending %d message(s) to Groq model=%s",
            len(messages),
            _GROQ_MODEL,
        )

        # ── Call Groq ─────────────────────────────────────────────────────
        completion = client.chat.completions.create(
            model=_GROQ_MODEL,
            messages=messages,
            max_tokens=300,
            temperature=0.6,
        )

        text_out = (completion.choices[0].message.content or "").strip()

        if text_out:
            print(f"[NeuroBot] AI Response: {text_out[:120]}{'...' if len(text_out) > 120 else ''}")
            logger.info("[NeuroBot] AI Response (%d chars): %s", len(text_out), text_out[:120])
            return text_out

        logger.warning("[NeuroBot] Groq returned empty content — using fallback.")
        return _fallback_reply(user_msg)

    except Exception as exc:
        logger.error("[NeuroBot] Groq API error: %s", exc, exc_info=True)
        print(f"[NeuroBot] ERROR: {exc} — falling back to offline reply")
        return _fallback_reply(message or "")

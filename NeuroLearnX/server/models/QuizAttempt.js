/**
 * Quiz attempts — score, timing, chosen answers (for analytics).
 */
const mongoose = require("mongoose");

const quizAttemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    /** Selected option index per question (same order as quiz) */
    answers: [{ type: Number }],
    durationMs: { type: Number, default: 0 },
    attemptNumber: { type: Number, default: 1 },
  },
  { timestamps: true }
);

quizAttemptSchema.index({ userId: 1, quizId: 1, createdAt: -1 });

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema);

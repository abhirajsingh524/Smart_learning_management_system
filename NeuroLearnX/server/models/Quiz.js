/**
 * Quizzes — weekly tests or chapter checks; questions store options + correct index.
 */
const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    options: [{ type: String, required: true }],
    /** Index of correct option in `options` */
    correctAnswer: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    title: { type: String, required: true, trim: true },
    weekNumber: { type: Number, default: 1 },
    kind: { type: String, enum: ["weekly", "chapter", "final"], default: "weekly" },
    questions: [questionSchema],
    timeLimitMinutes: { type: Number, default: 15 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quiz", quizSchema);

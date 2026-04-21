/**
 * Courses — modules outline + references to quizzes by id.
 */
const mongoose = require("mongoose");

const moduleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    summary: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, unique: true, sparse: true },
    description: { type: String, default: "" },
    modules: [moduleSchema],
    /** Quiz documents linked to this course */
    quizIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Quiz" }],
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);

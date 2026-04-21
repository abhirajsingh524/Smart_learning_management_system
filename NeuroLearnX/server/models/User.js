/**
 * Users collection — admin & student roles, optional enrollments.
 */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    email: { type: String, trim: true, lowercase: true, unique: true, required: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "student"], default: "student", index: true },
    phone: { type: String, trim: true },
    /** Legacy single "track" label; use enrolledCourses for LMS courses */
    course: { type: String, trim: true },
    enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course", index: true }],
    lastActiveAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model("User", userSchema);

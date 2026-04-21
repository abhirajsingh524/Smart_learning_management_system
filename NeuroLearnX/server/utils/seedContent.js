/**
 * Seed demo courses, weekly quizzes, and enroll all students (idempotent).
 */
const Course = require("../models/Course");
const Quiz = require("../models/Quiz");
const User = require("../models/User");

async function seedContent() {
  let courseA = await Course.findOne({ slug: "ml-foundations" });
  if (!courseA) {
    courseA = await Course.create({
      title: "Machine Learning Foundations",
      slug: "ml-foundations",
      description: "Core concepts: supervised learning, evaluation, linear models.",
      modules: [
        { title: "Introduction & setup", summary: "Environment, datasets", order: 1 },
        { title: "Linear & logistic regression", summary: "Loss, optimization", order: 2 },
        { title: "Model evaluation", summary: "CV, metrics", order: 3 },
      ],
      isPublished: true,
    });
  }

  let courseB = await Course.findOne({ slug: "deep-learning-intro" });
  if (!courseB) {
    courseB = await Course.create({
      title: "Deep Learning Intro",
      slug: "deep-learning-intro",
      description: "Neural networks, backpropagation, CNN basics.",
      modules: [
        { title: "Neurons & activations", summary: "ReLU, softmax", order: 1 },
        { title: "Training loops", summary: "SGD, batches", order: 2 },
      ],
      isPublished: true,
    });
  }

  const ensureQuiz = async (course, title, week, qs) => {
    const exists = await Quiz.findOne({ courseId: course._id, weekNumber: week });
    if (exists) return exists;
    return Quiz.create({
      courseId: course._id,
      title,
      weekNumber: week,
      kind: "weekly",
      questions: qs,
      timeLimitMinutes: 15,
    });
  };

  const q1 = await ensureQuiz(
    courseA,
    "Week 1 — ML basics",
    1,
    [
      {
        text: "What is supervised learning?",
        options: [
          "Learning without labels",
          "Learning from input–output pairs",
          "Only clustering",
          "Reinforcement only",
        ],
        correctAnswer: 1,
      },
      {
        text: "Which metric suits imbalanced binary classification?",
        options: ["Accuracy only", "F1-score", "Mean squared error", "RMSE"],
        correctAnswer: 1,
      },
    ]
  );

  const q2 = await ensureQuiz(
    courseA,
    "Week 2 — Regression",
    2,
    [
      {
        text: "Linear regression optimizes…",
        options: ["Cross-entropy", "Squared error", "Hamming distance", "KL divergence"],
        correctAnswer: 1,
      },
    ]
  );

  const q3 = await ensureQuiz(
    courseB,
    "Week 1 — Neural nets",
    1,
    [
      {
        text: "Backpropagation computes…",
        options: ["Random weights", "Gradients", "Dataset splits", "Learning rate schedules"],
        correctAnswer: 1,
      },
      {
        text: "ReLU is defined as…",
        options: ["max(0,x)", "1/(1+e^-x)", "tanh(x)", "softmax(x)"],
        correctAnswer: 0,
      },
    ]
  );

  await Course.findByIdAndUpdate(courseA._id, {
    $addToSet: { quizIds: { $each: [q1._id, q2._id] } },
  });
  await Course.findByIdAndUpdate(courseB._id, { $addToSet: { quizIds: { $each: [q3._id] } } });

  const students = await User.find({ role: "student" });
  for (const s of students) {
    await User.findByIdAndUpdate(s._id, {
      $addToSet: { enrolledCourses: { $each: [courseA._id, courseB._id] } },
    });
  }

  // eslint-disable-next-line no-console
  console.log("Seed content ready: courses + quizzes linked; students enrolled.");
}

module.exports = seedContent;

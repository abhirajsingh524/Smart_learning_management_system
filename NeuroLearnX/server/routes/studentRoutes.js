/**

 * Student routes — JWT + role `student` required.

 */

const express = require("express");

const { requireAuth } = require("../middleware/authMiddleware");

const { requireRole } = require("../middleware/roleMiddleware");

const {

  getDashboard,

  listCourses,

  getCourse,

  getQuizForAttempt,

  submitQuizAttempt,

  getProfile,

  updateProfile,

} = require("../controllers/studentController");



const router = express.Router();



router.use(requireAuth, requireRole("student"));



router.get("/dashboard", getDashboard);

router.get("/courses", listCourses);

router.get("/courses/:courseId", getCourse);

router.get("/quizzes/:quizId", getQuizForAttempt);

router.post("/quiz/attempt", submitQuizAttempt);

router.get("/profile", getProfile);

router.put("/profile", updateProfile);



module.exports = router;


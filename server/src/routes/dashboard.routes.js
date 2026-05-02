const express = require("express");

const Project = require("../models/Project");
const Task = require("../models/Task");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const now = new Date();
    const taskQuery = req.user.role === "Admin" ? {} : { assignee: req.user._id };
    const projectQuery = req.user.role === "Admin" ? {} : { members: req.user._id };

    const [projectCount, tasks, overdueTasks] = await Promise.all([
      Project.countDocuments(projectQuery),
      Task.find(taskQuery).populate("project", "name").populate("assignee", "name email role"),
      Task.find({ ...taskQuery, dueDate: { $lt: now }, status: { $ne: "Done" } })
        .populate("project", "name")
        .populate("assignee", "name email role")
        .sort({ dueDate: 1 })
    ]);

    const byStatus = tasks.reduce(
      (acc, task) => {
        acc[task.status] += 1;
        return acc;
      },
      { Todo: 0, "In Progress": 0, Done: 0 }
    );

    res.json({
      projectCount,
      taskCount: tasks.length,
      byStatus,
      overdueCount: overdueTasks.length,
      overdueTasks
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

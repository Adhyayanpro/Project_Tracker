const express = require("express");
const { body, param } = require("express-validator");

const Project = require("../models/Project");
const Task = require("../models/Task");
const { requireAuth } = require("../middleware/auth");
const handleValidation = require("../middleware/validate");

const router = express.Router();

router.use(requireAuth);

async function getVisibleProject(projectId, user) {
  const query = user.role === "Admin" ? { _id: projectId } : { _id: projectId, members: user._id };
  return Project.findOne(query);
}

function taskQueryFor(user) {
  if (user.role === "Admin") return {};
  return { assignee: user._id };
}

router.get("/", async (req, res, next) => {
  try {
    const query = taskQueryFor(req.user);

    if (req.query.project) {
      query.project = req.query.project;
    }

    const tasks = await Task.find(query)
      .populate("project", "name")
      .populate("assignee", "name email role")
      .populate("createdBy", "name email role")
      .sort({ dueDate: 1 });

    res.json({ tasks });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  [
    body("title").trim().isLength({ min: 2, max: 140 }).withMessage("Task title must be 2-140 characters"),
    body("description").optional().trim().isLength({ max: 1000 }).withMessage("Description is too long"),
    body("status").optional().isIn(["Todo", "In Progress", "Done"]).withMessage("Invalid status"),
    body("priority").optional().isIn(["Low", "Medium", "High"]).withMessage("Invalid priority"),
    body("dueDate").isISO8601().withMessage("A valid due date is required"),
    body("project").isMongoId().withMessage("Valid project id is required"),
    body("assignee").isMongoId().withMessage("Valid assignee id is required")
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      if (req.user.role !== "Admin") {
        return res.status(403).json({ message: "Only Admins can create tasks" });
      }

      const project = await getVisibleProject(req.body.project, req.user);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (!project.members.some((memberId) => memberId.toString() === req.body.assignee)) {
        return res.status(400).json({ message: "Assignee must belong to the project team" });
      }

      const task = await Task.create({
        title: req.body.title,
        description: req.body.description || "",
        status: req.body.status || "Todo",
        priority: req.body.priority || "Medium",
        dueDate: req.body.dueDate,
        project: req.body.project,
        assignee: req.body.assignee,
        createdBy: req.user._id
      });

      const populated = await task.populate([
        { path: "project", select: "name" },
        { path: "assignee", select: "name email role" },
        { path: "createdBy", select: "name email role" }
      ]);

      res.status(201).json({ task: populated });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id",
  [
    param("id").isMongoId().withMessage("Valid task id is required"),
    body("title").optional().trim().isLength({ min: 2, max: 140 }).withMessage("Task title must be 2-140 characters"),
    body("description").optional().trim().isLength({ max: 1000 }).withMessage("Description is too long"),
    body("status").optional().isIn(["Todo", "In Progress", "Done"]).withMessage("Invalid status"),
    body("priority").optional().isIn(["Low", "Medium", "High"]).withMessage("Invalid priority"),
    body("dueDate").optional().isISO8601().withMessage("A valid due date is required"),
    body("assignee").optional().isMongoId().withMessage("Valid assignee id is required")
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const task = await Task.findOne({ _id: req.params.id, ...taskQueryFor(req.user) });

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const updates = {};
      const adminFields = ["title", "description", "priority", "dueDate", "assignee"];

      if (req.body.status !== undefined) updates.status = req.body.status;

      if (req.user.role === "Admin") {
        adminFields.forEach((field) => {
          if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        if (updates.assignee) {
          const project = await Project.findById(task.project);
          if (!project.members.some((memberId) => memberId.toString() === updates.assignee)) {
            return res.status(400).json({ message: "Assignee must belong to the project team" });
          }
        }
      } else if (Object.keys(req.body).some((field) => field !== "status")) {
        return res.status(403).json({ message: "Members can only update task status" });
      }

      const updated = await Task.findByIdAndUpdate(req.params.id, updates, { new: true })
        .populate("project", "name")
        .populate("assignee", "name email role")
        .populate("createdBy", "name email role");

      res.json({ task: updated });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id",
  [
    param("id").isMongoId().withMessage("Valid task id is required")
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      if (req.user.role !== "Admin") {
        return res.status(403).json({ message: "Only Admins can delete tasks" });
      }

      const task = await Task.findByIdAndDelete(req.params.id);

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json({ message: "Task deleted" });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

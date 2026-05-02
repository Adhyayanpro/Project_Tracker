const express = require("express");
const { body, param } = require("express-validator");

const Project = require("../models/Project");
const Task = require("../models/Task");
const User = require("../models/User");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const handleValidation = require("../middleware/validate");

const router = express.Router();

router.use(requireAuth);

function projectQueryFor(user) {
  if (user.role === "Admin") return {};
  return { members: user._id };
}

router.get("/", async (req, res, next) => {
  try {
    const projects = await Project.find(projectQueryFor(req.user))
      .populate("owner", "name email role")
      .populate("members", "name email role")
      .sort({ updatedAt: -1 });

    res.json({ projects });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  requireAdmin,
  [
    body("name").trim().isLength({ min: 2, max: 120 }).withMessage("Project name must be 2-120 characters"),
    body("description").optional().trim().isLength({ max: 1000 }).withMessage("Description is too long"),
    body("members").optional().isArray().withMessage("Members must be an array"),
    body("members.*").optional().isMongoId().withMessage("Each member must be a valid user id")
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const requestedMembers = req.body.members || [];
      const memberIds = Array.from(new Set([req.user._id.toString(), ...requestedMembers]));
      const foundMembers = await User.find({ _id: { $in: memberIds } }).select("_id");

      if (foundMembers.length !== memberIds.length) {
        return res.status(400).json({ message: "One or more project members do not exist" });
      }

      const project = await Project.create({
        name: req.body.name,
        description: req.body.description || "",
        owner: req.user._id,
        members: memberIds
      });

      const populated = await project.populate([
        { path: "owner", select: "name email role" },
        { path: "members", select: "name email role" }
      ]);

      res.status(201).json({ project: populated });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id",
  requireAdmin,
  [
    param("id").isMongoId().withMessage("Valid project id is required"),
    body("name").optional().trim().isLength({ min: 2, max: 120 }).withMessage("Project name must be 2-120 characters"),
    body("description").optional().trim().isLength({ max: 1000 }).withMessage("Description is too long"),
    body("members").optional().isArray().withMessage("Members must be an array"),
    body("members.*").optional().isMongoId().withMessage("Each member must be a valid user id")
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const updates = {};

      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.members !== undefined) {
        const memberIds = Array.from(new Set([req.user._id.toString(), ...req.body.members]));
        const foundMembers = await User.find({ _id: { $in: memberIds } }).select("_id");

        if (foundMembers.length !== memberIds.length) {
          return res.status(400).json({ message: "One or more project members do not exist" });
        }

        updates.members = memberIds;
      }

      const project = await Project.findByIdAndUpdate(req.params.id, updates, { new: true })
        .populate("owner", "name email role")
        .populate("members", "name email role");

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json({ project });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id",
  requireAdmin,
  [param("id").isMongoId().withMessage("Valid project id is required")],
  handleValidation,
  async (req, res, next) => {
    try {
      const project = await Project.findByIdAndDelete(req.params.id);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      await Task.deleteMany({ project: req.params.id });
      res.json({ message: "Project and related tasks deleted" });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

// routes/AuthRoutes.js
import express from "express";
import { register, login, completeOnboarding } from "../controllers/authController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/complete-onboarding", auth, completeOnboarding);
router.get("/user", auth, (req, res) => {
    res.json({
        success: true,
        user: req.user,
    });
});

export default router;
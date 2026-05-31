// routes/AuthRoutes.js
import express from "express";
import { register, login } from "../controllers/AuthController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/user", auth, (req, res) => {
    res.json({
        success: true,
        user: req.user,
    });
});

export default router;
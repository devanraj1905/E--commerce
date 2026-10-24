import express from "express";
import { getMe, login, logout, register } from "../controllers/userController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const route=express.Router()

route.post("/register",register)
route.post("/login",login)
route.get("/me",verifyUser,getMe)
route.post("/logout",logout)
export default route
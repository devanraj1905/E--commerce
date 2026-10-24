import express from "express";
import { addToCart, deleteProductfromCart, getCart, updateCart } from "../controllers/cartController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const route = express.Router();

route.post("/add", verifyUser, addToCart);
route.get("/",verifyUser,getCart)
route.put("/update/:productId",verifyUser,updateCart)
route.delete("/remove/:productId",verifyUser,deleteProductfromCart)
export default route;
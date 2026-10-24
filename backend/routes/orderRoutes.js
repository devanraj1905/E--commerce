import express from "express";
import { cancelOrder, createOrder, getAllOrders, getMyOrders, getOrderDetails, updateOrderStatus, verifyRazorpayPayment } from "../controllers/orderController.js";
import { rolebased, verifyUser } from "../middleware/authMiddleware.js";
import {createRazorpayOrder} from "../controllers/orderController.js";
const route = express.Router();

route.post("/create", verifyUser, createOrder);
route.get("/",verifyUser,getMyOrders)
route.get("/:id",verifyUser,getOrderDetails)
route.put("/:id/cancel",verifyUser,cancelOrder)
route.get("/admin/all",verifyUser,rolebased("admin"),getAllOrders)
route.put("/admin/:id/status",verifyUser,rolebased("admin"),updateOrderStatus)
route.post("/razorpay/create",verifyUser,createRazorpayOrder)
route.post("/razorpay/verify",verifyUser,verifyRazorpayPayment);
export default route;
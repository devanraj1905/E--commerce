import express from "express";
import product from "./routes/productRoutes.js";
import user from "./routes/userRoutes.js"
import cart from "./routes/cartRoutes.js"
import order from "./routes/orderRoutes.js"
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";
import { razorpayWebhook } from "./controllers/razorpayWebhookController.js";
import cors from "cors"
const app=express()
const PORT = 8000
connectDB()
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));


app.post(
    "/api/webhooks/razorpay",
    express.raw({ type: "application/json" }),
    razorpayWebhook
);

app.use(express.json());
app.use(cookieParser());
app.use("/api",product)
app.use("/api/user",user)
app.use("/api/cart",cart)
app.use("/api/order",order)
app.listen(PORT,()=>{
    console.log("Server running on the port",PORT)}
    
)
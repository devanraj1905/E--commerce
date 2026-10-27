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
const PORT = process.env.PORT || 8000;
connectDB()
const normalizeOrigin = (value) =>
    typeof value === "string"
        ? value.trim().replace(/\/+$/, "")
        : "";

const allowedOrigins = new Set(
    [
        "http://localhost:5173",
        "https://frontend-ebon-seven-51.vercel.app",
        process.env.FRONTEND_URL
    ]
        .map(normalizeOrigin)
        .filter(Boolean)
);

app.use(cors({
    origin: (origin, callback) => {
        if (
            !origin ||
            allowedOrigins.has(normalizeOrigin(origin))
        ) {
            return callback(null, true);
        }

        console.error("CORS blocked origin:", origin);
        return callback(null, false);
    },
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
app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port", PORT);
});
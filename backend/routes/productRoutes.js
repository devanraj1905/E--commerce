import express from "express"
import { createProduct, deleteProduct, getProduct,updateProduct } from "../controllers/productController.js"
import { rolebased, verifyUser } from "../middleware/authMiddleware.js"
import upload from "../middleware/upload.js"


const route=express.Router()


route.get("/product",getProduct)
route.post("/productcreate",verifyUser,rolebased("admin"),upload.single("image"),createProduct)
route.put("/productupdate/:id",verifyUser,rolebased("admin"),upload.single("image"),updateProduct);
route.delete("/productdelete/:id",verifyUser,rolebased("admin"),deleteProduct)


export default route
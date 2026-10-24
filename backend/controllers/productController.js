import mongoose from "mongoose";
import { Readable } from "node:stream";
import Product from "../models/productModel.js";
import cloudinary from "../config/cloudinary.js";

export const getProduct =async(req,res)=>{

   try{
     const product= await Product.find()
    res.status(200).json(product)
   }
  catch(error){
    return res.status(500).json(error.message)
    
   }

}
export const createProduct=async(req,res)=>{
   try{
       if (!req.file) {
            return res.status(400).json({
                message: "Product image is required"
            });
        }
     const {productName,productPrice,description,stock,category}=req.body
       const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: "ecommerce/products" },
                (error, result) => {
                    if (error) {
                        return reject(error);
                    }

                    if (!result) {
                        return reject(new Error("Cloudinary returned no result"));
                    }

                    resolve(result);
                }
            );

            Readable.from([req.file.buffer]).pipe(uploadStream);
        });

    const product= await Product.create({productName,productPrice,description,stock,image:uploadResult.secure_url,category})
    
    return res.status(201).json(product)
    
   }
   catch (error) {
        console.error("Product creation error:", error.message);

        return res.status(500).json({
            message: "Failed to create product"
        });
    }

}

export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Validate product ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid product ID"
            });
        }

        // 2. Find the existing product
        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        // 3. Update only the permitted fields
        const allowedFields = [
            "productName",
            "productPrice",
            "description",
            "category",
            "stock"
        ];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                product[field] = req.body[field];
            }
        }

        // 4. Upload a replacement image only if provided
        if (req.file) {
            if (!req.file.mimetype.startsWith("image/")) {
                return res.status(400).json({
                    message: "Please upload a valid image file"
                });
            }

            const uploadResult = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: "ecommerce/products"
                    },
                    (error, result) => {
                        if (error) {
                            return reject(error);
                        }

                        if (!result) {
                            return reject(
                                new Error("Cloudinary returned no result")
                            );
                        }

                        resolve(result);
                    }
                );

                Readable.from([req.file.buffer]).pipe(uploadStream);
            });

            // Store the new Cloudinary URL
            product.image = uploadResult.secure_url;
        }

        // 5. Save and validate the updated document
        await product.save();

        return res.status(200).json({
            success: true,
            message: "Product updated successfully",
            product
        });

    } catch (error) {
        console.error("Update product error:", error);

        if (error.name === "ValidationError" || error.name === "CastError") {
            return res.status(400).json({
                message: error.message
            });
        }

        return res.status(500).json({
            message: "Unable to update product"
        });
    }
};

export const deleteProduct=async(req,res)=>{
    try{
        const {id}=req.params
       if(!id){
            return res.status(404).json("id not found")
        }
        const product=await Product.findByIdAndDelete(id,{new:true})
        if(!product){
            return res.status(404).json("Product not available")
        }
        return res.status(200).json(product)


    }
    catch(error){
    return res.status(500).json(error.message)
    
   }
}
import mongoose from "mongoose";
import Product from "../models/productModel.js";
import Cart from "../models/cartModel.js";

export const addToCart = async (req, res) => {
    try {
        const { productId } = req.body;
        const quantity = Number(req.body.quantity);

        
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                message: "Invalid product ID"
            });
        }

        
        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({
                message: "Quantity must be a positive integer"
            });
        }

        
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }


        if (quantity > product.stock) {
            return res.status(400).json({
                message: "Insufficient stock"
            });
        }


        const userId = req.user._id;
        let cart = await Cart.findOne({ user: userId });


        if (!cart) {
            cart = await Cart.create({
                user: userId,
                items: [{
                    product: product._id,
                    quantity
                }]
            });

            await cart.populate("items.product");

            return res.status(201).json({
                message: "Product added to cart",
                cart
            });
        }


        const existingItem = cart.items.find(
            item => item.product.toString() === product._id.toString()
        );

        if (existingItem) {

            const updatedQuantity = existingItem.quantity + quantity;

            if (updatedQuantity > product.stock) {
                return res.status(400).json({
                    message: "Requested quantity exceeds available stock"
                });
            }

            existingItem.quantity = updatedQuantity;
        } else {

            cart.items.push({
                product: product._id,
                quantity
            });
        }


        await cart.save();


        await cart.populate("items.product");

        return res.status(200).json({
            message: "Product added to cart",
            cart
        });

    } catch (error) {
        console.error("Add to cart error:", error);

        return res.status(500).json({
            message: "Unable to add product to cart"
        });
    }
};
export const getCart =async(req,res)=>{
    try{
               const cart = await Cart.findOne({
            user: req.user._id
        }).populate("items.product");

        if (!cart) {
            return res.status(404).json({
                message: "Cart not found"
            });
        }

        return res.status(200).json({
            message: "Cart retrieved successfully",
            cart
        })
    }
     catch (error) {
        
        return res.status(500).json({
            message: "Unable to get product"
        });
    }
}

export const updateCart = async (req, res) => {
    try {
        const { productId } = req.params;
        const quantity = Number(req.body.quantity);


        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                message: "Invalid product ID"
            });
        }

        
        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({
                message: "Quantity must be a positive integer"
            });
        }

        
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }


        if (quantity > product.stock) {
            return res.status(400).json({
                message: "Insufficient stock"
            });
        }

        
        const cart = await Cart.findOne({
            user: req.user._id
        });

        if (!cart) {
            return res.status(404).json({
                message: "Cart not found"
            });
        }

        
        const cartItem = cart.items.find(
            item => item.product.toString() === productId
        );

        if (!cartItem) {
            return res.status(404).json({
                message: "Product is not in your cart"
            });
        }


        cartItem.quantity = quantity;


        await cart.save();


        await cart.populate("items.product");

        return res.status(200).json({
            message: "Cart quantity updated successfully",
            cart
        });

    } catch (error) {
        console.error("Update cart error:", error);

        return res.status(500).json({
            message: "Unable to update cart"
        });
    }
};export const deleteProductfromCart = async (req, res) => {
    try {
        const { productId } = req.params;


        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                message: "Invalid product ID"
            });
        }


        const cart = await Cart.findOne({
            user: req.user._id
        });

        if (!cart) {
            return res.status(404).json({
                message: "Cart not found"
            });
        }

        
        const itemExists = cart.items.some(
            item => item.product.toString() === productId.toLowerCase()
        );

        if (!itemExists) {
            return res.status(404).json({
                message: "Product not found in cart"
            });
        }

        
        cart.items = cart.items.filter(
            item => item.product.toString() !== productId.toLowerCase()
        );

        
        await cart.save();

        
        await cart.populate("items.product");

        return res.status(200).json({
            message: "Product removed from cart successfully",
            cart
        });

    } catch (error) {
        console.error("Delete cart item error:", error);

        return res.status(500).json({
            message: "Unable to remove product from cart"
        });
    }
};
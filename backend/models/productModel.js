import mongoose from "mongoose";
import express from "express"

const productSchema=mongoose.Schema({
    productName:{
        required:true,
        type:String,
        minlength:3,
        maxlength:100
    },
    productPrice:{
        required:true,
        type:Number,
        min:19,
        max:299999
    },
    description:{
        required:true,
        type:String,
        minlength:20,
        maxlength:200
    },
    category:{
        required:true,
        type:String,
        enum:["electronics","food","cloth","books","others"]
    },
    stock:{
        required:true,
        type:Number,
        min:1
    },
    image:{
        required:true,
        type:String
    }

    
})

export default mongoose.model("Product",productSchema)
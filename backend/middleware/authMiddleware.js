import jwt from "jsonwebtoken"
import User from "../models/userModel.js"


export const  verifyUser=async(req,res,next)=>{
    const token =req.cookies.token
    if(!token){
        return res.status(401).json({message:"Access denied please login to access"})
    }
    try{
        const decodedData=jwt.verify(token,process.env.JWT_SECRET_KEY)
        req.user=await User.findById(decodedData.id)
        if(!req.user){
            return res.status(401).json("user not found")
        }
        next()
    }
    catch(error){
        return res.status(401).json(error.message)
    }
}

export const rolebased=(...roles)=>{
    return (req,res,next)=>{
        if(!roles.includes(req.user.role)){
            return res.status(403).json({ message: `Role ${req.user.role} is not allowed to access this resource` })
        }
        next()
    } 
}
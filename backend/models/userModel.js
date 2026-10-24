import bcrypt from "bcrypt"
import mongoose from "mongoose"
import jwt from "jsonwebtoken"



const userSchema=mongoose.Schema({
    
    userName:{
        required:true,
        type:String,
        minlength:3,
        maxlength:30
    },
    password:{
        required:true,
        type:String,
        minlength:8,
        
    },
    email:{
        required:true,
        type:String,
        unique:true
        
    },
    role:{
        required:true,
        type:String,
        enum:["admin","user"],
        default:"user"


    }
})

userSchema.pre("save",async function(){
        if(!this.isModified("password") ){
        return
        }
        const hashedPassword= await bcrypt.hash(this.password,10)
        this.password=hashedPassword
})

userSchema.methods.getJWTToken=function(){
    const token=jwt.sign({id:this._id},process.env.JWT_SECRET_KEY,{expiresIn:process.env.JWT_EXPIRE})
    return token
}
export default mongoose.model("User",userSchema)
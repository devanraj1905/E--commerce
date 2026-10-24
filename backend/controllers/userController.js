import User from "../models/userModel.js"
import bcrypt from "bcrypt"
export const register= async(req,res)=>{
   try{
     const {userName,password,email}=req.body
    const user=await User.create({userName,password,email})
    return res.status(201).json({
    success: true,
    message: "Account created successfully"
}); 
    
   }
   catch(error){
    return res.status(500).json(error.message)
   }
}

export const login=async(req,res)=>{
   try{
      const {email,password}=req.body

      const user=await User.findOne({email:email})
      if(!user){
         return res.status(401).json("user not found")
      }
      const isMatch=await bcrypt.compare(password,user.password)

      if(!isMatch){
         return res.status(401).json("User not Found")
      }
     const token=user.getJWTToken()
    res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production"
        ? "none"
        : "lax",
    maxAge: 24 * 60 * 60 * 1000
});
      return res.status(200).json("Login Success")
   }
     catch(error){
    return res.status(500).json(error.message)

   }
}

export const getMe=async(req,res)=>{
      try{
         const user = req.user
         const userData={
            _id:user._id,userName:user.userName,email:user.email,role:user.role
         }   
         res.set(
    "Cache-Control",
    "private, no-store, no-cache, must-revalidate"
);

return res.status(200).json(userData);
      }
      catch(error){
    return res.status(500).json(error.message)

   }

}
export const logout = async (req, res) => {
    try {
        res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production"
        ? "none"
        : "lax"
});

        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });

    } catch (error) {
        console.error("Logout error:", error.message);

        return res.status(500).json({
            message: "Unable to log out"
        });
    }
};
import validator from "validator";
import bcrypt from "bcrypt";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import jwt from "jsonwebtoken";
import appointmentModel from "../models/appointmentModel.js";
import userModel from "../models/userModel.js";


// API: Add Doctor


const addDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      speciality,
      degree,
      experience,
      about,
      fees,
      address,
    } = req.body;

    const imageFile = req.file;

    // Validate required fields
    if (
      !name ||
      !email ||
      !password ||
      !speciality ||
      !degree ||
      !experience ||
      !about ||
      !fees ||
      !address
    ) {
      return res.json({ success: false, message: "Missing Details" });
    }

    // Validate email
    if (!validator.isEmail(email)) {
      return res.json({
        success: false,
        message: "Please enter a valid email",
      });
    }

    // Validate password length
    if (password.length < 8) {
      return res.json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    //Check for image file
    if (!imageFile) {
      return res.json({
        success: false,
        message: "Image file missing",
      });
    }

    // Check if doctor already exists
    const existingDoctor = await doctorModel.findOne({ email });
    if (existingDoctor) {
      return res.json({
        success: false,
        message: "Doctor with this email already exists",
      });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Upload image to Cloudinary
    let imageUrl = "";
    try {
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: "image",
      });
      imageUrl = imageUpload.secure_url;
    } catch (err) {
      return res.json({
        success: false,
        message: "Image upload failed",
      });
    }

    let parsedAddress = address;
if (typeof address === "string") {
  parsedAddress = JSON.parse(address);
}

const doctorData = {
  name,
  email,
  password: hashedPassword,
  image: imageUrl,
  speciality,
  degree,
  experience, 
  about,
  fees, 
  address: parsedAddress,
  date: Date.now(),
};

    
    const newDoctor = new doctorModel(doctorData);
    await newDoctor.save();

    return res.json({
      success: true,
      message: "Doctor Added",
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};


// API: Admin Login


const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = jwt.sign({ email }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      return res.json({
        success: true,
        token,
      });
    } else {
      return res.json({
        success: false,
        message: "Invalid Credentials",
      });
    }
  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

// API to get all doctors list

const allDoctors = async(req,res)=>{
  try {

    const doctors = await doctorModel.find({}).select('-password')
    res.json({success:true,doctors})
    

  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      message: error.message,
    });
  }
}

// API to get all appointments list

const appointmentsAdmin =async(req,res)=>{
  try {

    const appointments = await appointmentModel.find({})
    res.json({success:true,appointments})
    
  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      message: error.message,
    });
  }
}


// API for appointment cancellation
const appointmentCancel = async (req, res) => {
  try {
    const appointmentId = req.body.appointmentId;

    const appointmentData = await appointmentModel.findById(appointmentId);

    if (!appointmentData) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, {
      cancelled: true,
    });

    // releasing doc slot
    const { docId, slotDate, slotTime } = appointmentData;

    const docData = await doctorModel.findById(docId);

    if (!docData) { 
      return res.json({ success: true, message: "Appointment Cancelled" });
    }

    let slot_booked = docData.slot_booked;

    if (slot_booked && slot_booked[slotDate]) {  
      slot_booked[slotDate] = slot_booked[slotDate].filter((e) => e !== slotTime);
      await doctorModel.findByIdAndUpdate(docId, { slot_booked });
    }

    return res.json({ success: true, message: "Appointment Cancelled" });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

// API to get dashboard data for admin panel

const adminDashboard = async (req, res) => {
  try {
    const doctors = await doctorModel.find({});
    const users = await userModel.find({});
    const appointments = await appointmentModel.find({})

    const dashData = {
      doctors: doctors.length,
      appointments: appointments.length,
      patients: users.length,
      latestAppointments: [...appointments].reverse().slice(0, 5)
    }

    return res.json({
      success: true,
      dashData
    });

  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};


export { addDoctor, loginAdmin, allDoctors, appointmentsAdmin, appointmentCancel, adminDashboard };
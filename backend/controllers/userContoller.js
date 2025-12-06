import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import Stripe from "stripe";

// initialize stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// API to register user

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.json({ success: false, message: "Missing Details" });
    }

    //    validating email format
    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "enter a valid email" });
    }

    //    validating strong password
    if (password.length < 8) {
      return res.json({ success: false, message: "enter a strong password" });
    }

    //    hashing user password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      name,
      email,
      password: hashedPassword,
    };

    const newUser = new userModel(userData);
    const user = await newUser.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    return res.json({ success: true, token });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

// API for user login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "User does not exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      return res.json({ success: true, token });
    } else {
      return res.json({ success: false, message: "Invalid Credentials" });
    }
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

// API to get profile data
const getProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const userData = await userModel.findById(userId).select("-password");

    res.json({ success: true, userData });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

// API to update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, phone, address, dob, gender } = req.body;
    const imageFile = req.file;

    if (!name || !phone || !address || !dob || !gender) {
      return res.json({ success: false, message: "Missing Data" });
    }

    let parsedAddress = address;
    if (typeof address === "string") {
      try {
        parsedAddress = JSON.parse(address);
      } catch (e) {
        return res.json({ success: false, message: "Invalid address format" });
      }
    }

    await userModel.findByIdAndUpdate(userId, {
      name,
      phone,
      address: parsedAddress,
      dob,
      gender,
    });

    if (imageFile) {
      // Upload image to cloudinary
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: "image",
      });
      const imageURL = imageUpload.secure_url;

      await userModel.findByIdAndUpdate(userId, { image: imageURL });
    }

    return res.json({ success: true, message: "Profile Updated" });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

// API to book appointment
const bookAppointment = async (req, res) => {
  try {
    const userId = req.userId;
    const { docId, slotDate, slotTime } = req.body;

    if (!docId || !slotDate || !slotTime) {
      return res.json({ success: false, message: "Missing required fields" });
    }

    const docData = await doctorModel.findById(docId).select("-password");

    if (!docData.available) {
      return res.json({ success: false, message: "Doctor is not available" });
    }

    let slot_booked = docData.slot_booked || {};

    // checking for slots booked
    if (slot_booked[slotDate]) {
      if (slot_booked[slotDate].includes(slotTime)) {
        return res.json({ success: false, message: "Slot not available" });
      } else {
        slot_booked[slotDate].push(slotTime);
      }
    } else {
      slot_booked[slotDate] = [];
      slot_booked[slotDate].push(slotTime);
    }

    const userData = await userModel.findById(userId).select("-password");

    const appointmentData = {
      userId,
      docId,
      slotDate,
      slotTime,
      userData: userData.toObject(),
      docData: docData.toObject(),
      amount: docData.fees,
      date: Date.now(),
    };

    // Remove slot_booked from docData copy
    delete appointmentData.docData.slot_booked;

    const newAppointment = new appointmentModel(appointmentData);
    await newAppointment.save();

    await doctorModel.findByIdAndUpdate(docId, { slot_booked });

    res.json({ success: true, message: "Appointment Booked" });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

// API to get user appointments

const listAppointment = async (req, res) => {
  try {
    const userId = req.userId;

    const appointments = await appointmentModel.find({ userId });

    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

// API to cancel appointment

const cancelAppointment = async (req, res) => {
  try {
    const userId = req.userId;
    const appointmentId = req.body.appointmentId;

    const appointmentData = await appointmentModel.findById(appointmentId);

    // verify appointment user
    if (appointmentData.userId.toString()!== userId) {
      return res.json({ success: false, message: "Unauthorized Action" });
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, {
      cancelled: true,
    });

    // releasing doc slot

    const { docId, slotDate, slotTime } = appointmentData;

    const docData = await doctorModel.findById(docId);

    let slot_booked = docData.slot_booked;

    slot_booked[slotDate] = slot_booked[slotDate].filter((e) => e !== slotTime);

    await doctorModel.findByIdAndUpdate(docId, { slot_booked });

    return res.json({ success: true, message: "Appointment Cancelled" });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

// API to make payment of appointment using Stripe

const createPaymentIntent = async (req, res) => {
  try {
    const userId = req.userId;
    const { appointmentId } = req.body;
    const appointmentData = await appointmentModel.findById(appointmentId);

    if (!appointmentData) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    // verify appointment belongs to user

    if (appointmentData.userId.toString() !== userId) {
      return res.json({ success: false, message: "Unauthorized Action" });
    }

    // check if appointment is already paid or cancelled
    if (appointmentData.payment || appointmentData.cancelled) {
      return res.json({
        success: false,
        message: appointmentData.cancelled
          ? "Appointment is cancelled"
          : "Payment already completed",
      });
    }

    // check if doctor is still available

    const docData = await doctorModel.findById(appointmentData.docId);

    if (!docData || !docData.available) {
      return res.json({
        success: false,
        message: "Doctor is no longer available",
      });
    }

    // create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: appointmentData.amount * 100, //convert to cents
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        appointmentId: appointmentId,
        userId: userId,
        doctorName: appointmentData.docData.name,
        appointmentDate: appointmentData.slotDate,
        appointmentTime: appointmentData.slotTime,
      },
    });
    return res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: appointmentData.amount,
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

// API to confirm payment and update appointment

const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, appointmentId } = req.body;
    const userId = req.userId;

    // verify appoinment belongs to user

    const appointmentData = await appointmentModel.findById(appointmentId);
    if (!appointmentData || appointmentData.userId.toString() !== userId) {
      return res.json({ success: false, message: "Unauthorized Action" });
    }

    // Check if doctor is still available**
    const doctorData = await doctorModel.findById(appointmentData.docId);
    if (!doctorData || !doctorData.available) {
      return res.json({
        success: false,
        message: "Doctor is no longer available",
      });
    }

    // Retrive and verify payment for stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // verify payment about matches appointment

    if (paymentIntent.amount !== appointmentData.amount * 100) {
      return res.json({ success: false, message: "Payment amount mismatch" });
    }

    if (paymentIntent.status === "succeeded") {
      // update appointment as paid
      await appointmentModel.findByIdAndUpdate(appointmentId, {
        payment: true,
        paymentIntentId: paymentIntentId,
        paymentStatus: "completed",
        paymentDate: new Date(),
      });

      return res.json({
        success: true,
        message: "Payment completed successfully",
        paymentStatus: "completed",
      });
    } else {
      return res.json({
        success: false,
        message: "Payment not completed",
        paymentStatus: paymentIntent.status,
      });
    }
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

// webhook to handle stripe events

const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.json({
      received: true,
      message: "Webhook secret not configured",
    });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // handle the event

  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object;

      //update appointment status

      if (paymentIntent.metadata.appointmentId) {
        await appointmentModel.findByIdAndUpdate(
          paymentIntent.metadata.appointmentId,
          {
            payment: true,
            paymentIntentId: paymentIntent.id,
            paymentStatus: "completed",
          }
        );
      }

      break;

    case "payment_intent.payment_failed":
      const failedPayment = event.data.object;
      console.log("Payment failed:", failedPayment.id);

      if (failedPayment.metadata.appointmentId) {
        await appointmentModel.findByIdAndUpdate(
          failedPayment.metadata.appointmentId,
          {
            paymentStatus: "failed",
          }
        );
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  res.json({ received: true });
};

export {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  bookAppointment,
  listAppointment,
  cancelAppointment,
  createPaymentIntent,
  confirmPayment,
  handleStripeWebhook,
};

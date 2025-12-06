import express from 'express'
import { registerUser,loginUser, getProfile,updateProfile,bookAppointment,listAppointment,cancelAppointment,createPaymentIntent,confirmPayment,handleStripeWebhook} from '../controllers/userContoller.js'
import authUser from '../middlewares/authUser.js'
import upload from '../middlewares/multer.js'


const userRouter = express.Router()

userRouter.post('/register',registerUser)
userRouter.post('/login',loginUser)
userRouter.get('/get-profile',authUser,getProfile)
userRouter.post('/update-profile',upload.single('image'),authUser,updateProfile)
userRouter.post('/book-appointment',authUser,bookAppointment)
userRouter.get('/appointments',authUser,listAppointment)
userRouter.post('/cancel-appointment',authUser,cancelAppointment)
userRouter.post('/create-payment-intent',authUser,createPaymentIntent)
userRouter.post('/create-payment-intent',authUser,confirmPayment)
userRouter.post('/confirm-payment',authUser,confirmPayment)
userRouter.post('/stripe-webhook',authUser,handleStripeWebhook)




export default userRouter
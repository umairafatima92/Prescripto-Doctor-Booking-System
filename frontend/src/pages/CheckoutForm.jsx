import React, { useState, useContext } from 'react'
import {
  useStripe,
  useElements,
  PaymentElement,
} from '@stripe/react-stripe-js'
import { AppContext } from '../context/AppContext'
import axios from 'axios'

const CheckoutForm = ({ onPaymentSuccess, onPaymentError, appointmentId }) => {
  const stripe = useStripe()
  const elements = useElements()
  const { backendUrl, token } = useContext(AppContext)

  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!stripe || !elements) {
      setMessage('Payment system is still loading. Please wait.')
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      console.log('Starting payment confirmation...')

      // Submit the payment elements to Stripe
      const { error: submitError } = await elements.submit()
      if (submitError) {
        console.error('Submit error:', submitError)
        setMessage(submitError.message)
        onPaymentError(submitError.message)
        setIsLoading(false)
        return
      }

      // Confirm the payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/my-appointments`,
        },
        redirect: 'if_required',
      })

      console.log('Payment confirmation result:', { error, paymentIntent })

      if (error) {
        
        console.error('Payment error:', error)
        const errorMessage = error.message || 'Payment failed. Please try again.'
        setMessage(errorMessage)
        onPaymentError(errorMessage)
        setIsLoading(false)
        return
      }

      if (paymentIntent) {
        console.log('Payment Intent Status:', paymentIntent.status)

        if (paymentIntent.status === 'succeeded') {
          
          setMessage('Payment processing... Please wait.')
          
          try {
            console.log('Confirming payment on backend...')
            const { data } = await axios.post(
              backendUrl + '/api/user/confirm-payment',
              {
                paymentIntentId: paymentIntent.id,
                appointmentId: appointmentId,
              },
              { headers: { token } }
            )

            console.log('Backend confirmation response:', data)

            if (data.success) {
              setMessage('Payment completed successfully!')
              setTimeout(() => {
                onPaymentSuccess()
              }, 1000)
            } else {
              const errorMsg = data.message || 'Payment confirmation failed on our server.'
              setMessage(errorMsg)
              onPaymentError(errorMsg)
            }
          } catch (confirmError) {
            console.error('Backend confirmation error:', confirmError)
            console.error('Error response:', confirmError.response?.data)
            
        
            setMessage('Payment successful! Updating your appointment...')
            setTimeout(() => {
              onPaymentSuccess()
            }, 1000)
          }
        } else if (paymentIntent.status === 'processing') {
          setMessage('Payment is processing. Please wait...')
          

          setTimeout(() => {
            setMessage('Payment is taking longer than expected. Please check your appointments.')
            onPaymentSuccess()
          }, 3000)
        } else if (paymentIntent.status === 'requires_payment_method') {
          setMessage('Payment failed. Please try a different payment method.')
          onPaymentError('Payment requires a different payment method.')
        } else {
          setMessage(`Payment status: ${paymentIntent.status}`)
          onPaymentError(`Unexpected payment status: ${paymentIntent.status}`)
        }
      }

    } catch (err) {
      console.error('Unexpected error during payment:', err)
      setMessage('An unexpected error occurred. Please try again.')
      onPaymentError('An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <PaymentElement 
        id="payment-element"
        options={{
          layout: "tabs"
        }}
      />
      
      <button
        disabled={isLoading || !stripe || !elements}
        type="submit"
        id="submit"
        className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Processing payment...
          </div>
        ) : (
          'Pay now'
        )}
      </button>
      
      {message && (
        <div 
          id="payment-message" 
          className={`mt-4 text-sm p-3 rounded-lg ${
            message.includes('success') || message.includes('completed')
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : message.includes('processing') || message.includes('wait')
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message}
        </div>
      )}
    </form>
  )
}

export default CheckoutForm
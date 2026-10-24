
import { useState } from "react";

export default function RazorpayPayButton({ shippingAddress }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handlePayment = async () => {
        setLoading(true);
        setMessage("");

        try {
            
            const createResponse = await fetch(
                "http://localhost:8000/api/order/razorpay/create",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({ shippingAddress })
                }
            );

            const orderData = await createResponse.json();

            if (!createResponse.ok) {
                throw new Error(
                    orderData.message || "Unable to create payment order"
                );
            }

            if (!window.Razorpay) {
                throw new Error("Razorpay Checkout did not load");
            }


            const options = {
                key: orderData.keyId,
                amount: orderData.razorpayOrder.amount,
                currency: orderData.razorpayOrder.currency,
                name: "My E-commerce Store",
                description: "Order payment",
                order_id: orderData.razorpayOrder.id,

                
                handler: async (paymentResponse) => {
                    try {
                        setMessage("Verifying payment...");

                        
                        const verifyResponse = await fetch(
                            "http://localhost:8000/api/order/razorpay/verify",
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                credentials: "include",
                                body: JSON.stringify(paymentResponse)
                            }
                        );

                        const verifyData = await verifyResponse.json();

                        if (!verifyResponse.ok) {
                            throw new Error(
                                verifyData.message ||
                                "Payment verification failed"
                            );
                        }

                        setMessage("Payment successful and verified!");
                    } catch (error) {
                        setMessage(error.message);
                    } finally {
                        setLoading(false);
                    }
                },

                theme: {
                    color: "#3399cc"
                }
            };

            const checkout = new window.Razorpay(options);

            checkout.on("payment.failed", (response) => {
                setMessage(
                    response.error?.description || "Payment failed"
                );
                setLoading(false);
            });

            checkout.open();

        } catch (error) {
            setMessage(error.message);
            setLoading(false);
        }
    };

    return (
        <div>
            <button
                type="button"
                onClick={handlePayment}
                disabled={loading}
            >
                {loading ? "Processing..." : "Pay with Razorpay"}
            </button>

            {message && <p role="status">{message}</p>}
        </div>
    );
}

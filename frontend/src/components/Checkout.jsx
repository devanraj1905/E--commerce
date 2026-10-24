
import { useState } from "react";
import api from "../api.js";

const initialAddress = {
    fullName: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India"
};

export default function Checkout({ onBackToCart, onViewOrders }) {
    const [shippingAddress, setShippingAddress] = useState(initialAddress);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [paid, setPaid] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setShippingAddress((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    const handleCheckout = async (e) => {
        e.preventDefault();

        if (loading || paid) return;

        
        if (!window.Razorpay) {
            setMessage(
                "Razorpay Checkout has not loaded. Refresh the page and try again."
            );
            return;
        }

        setLoading(true);
        setMessage("Preparing your payment...");

        try {
            
            const response = await api.post("/order/razorpay/create", {
                shippingAddress
            });

            const data = response.data;

            
            const options = {
                key: data.keyId,
                amount: data.razorpayOrder.amount,
                currency: data.razorpayOrder.currency,
                name: "My E-Commerce Store",
                description: "Product purchase",
                order_id: data.razorpayOrder.id,

                prefill: {
                    name: shippingAddress.fullName,
                    contact: shippingAddress.phone
                },

                theme: {
                    color: "#171717"
                },

                // 3. Receive the payment ID, order ID and signature.
                handler: async (paymentResponse) => {
                    setMessage("Verifying payment with the server...");

                    try {
                        // 4. Verify the payment on the backend.
                        const verifyResponse = await api.post(
                            "/order/razorpay/verify",
                            paymentResponse
                        );

                        setPaid(true);
                        setMessage(
                            verifyResponse.data.message ||
                            "Payment verified successfully!"
                        );
                    } catch (error) {
                        console.error("Payment verification failed:", error);

                        setMessage(
                            "Checkout returned a payment response, but server verification failed. " +
                            "Please check your order status before attempting another payment."
                        );
                    } finally {
                        setLoading(false);
                    }
                },

                modal: {
                    ondismiss: () => {
                        setLoading(false);
                        setMessage(
                            "Checkout closed. You can try again when ready."
                        );
                    }
                }
            };

            const checkout = new window.Razorpay(options);

            checkout.on("payment.failed", (paymentError) => {
                console.error("Razorpay payment failed:", paymentError);

                setLoading(false);
                setMessage(
                    paymentError.error?.description ||
                    "Payment failed. Please try again."
                );
            });

            // 5. Open the Razorpay payment window.
            setMessage("Opening Razorpay Checkout...");
            checkout.open();

        } catch (error) {
            console.error("Checkout error:", error);

            const data = error.response?.data;
            setMessage(
                typeof data === "string"
                    ? data
                    : data?.message || "Unable to start checkout."
            );

            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#F2F0F1] px-4 py-10 sm:px-8">
            <div className="mx-auto max-w-3xl">
                <button
                    type="button"
                    onClick={onBackToCart}
                    disabled={loading}
                    className="mb-6 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
                >
                    ← Back to Cart
                </button>

                <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-10">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Checkout
                    </h1>

                    <p className="mt-2 text-sm text-gray-500">
                        Enter your delivery details to continue to payment.
                    </p>

                   {paid ? (
    <div className="mt-8 rounded-xl bg-green-50 p-6 text-green-800">
        <h2 className="text-xl font-bold">
            Payment successful!
        </h2>
        <p className="mt-2">{message}</p>

        <button
            type="button"
            onClick={onBackToCart}
            className="mt-5 rounded-lg bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-gray-700"
        >
            Continue
        </button>
    </div>
) : (
                        <form
                            onSubmit={handleCheckout}
                            className="mt-8 space-y-5"
                        >
                            <div>
                                <label
                                    htmlFor="fullName"
                                    className="mb-2 block text-sm font-medium text-gray-700"
                                >
                                    Full name
                                </label>
                                <input
                                    id="fullName"
                                    name="fullName"
                                    value={shippingAddress.fullName}
                                    onChange={handleChange}
                                    required
                                    autoComplete="name"
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="phone"
                                    className="mb-2 block text-sm font-medium text-gray-700"
                                >
                                    Phone number
                                </label>
                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    value={shippingAddress.phone}
                                    onChange={handleChange}
                                    required
                                    autoComplete="tel"
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="address"
                                    className="mb-2 block text-sm font-medium text-gray-700"
                                >
                                    Street address
                                </label>
                                <textarea
                                    id="address"
                                    name="address"
                                    value={shippingAddress.address}
                                    onChange={handleChange}
                                    required
                                    autoComplete="street-address"
                                    rows={3}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                {[
                                    ["city", "City"],
                                    ["state", "State"],
                                    ["postalCode", "Postal code"],
                                    ["country", "Country"]
                                ].map(([name, label]) => (
                                    <div key={name}>
                                        <label
                                            htmlFor={name}
                                            className="mb-2 block text-sm font-medium text-gray-700"
                                        >
                                            {label}
                                        </label>
                                        <input
                                            id={name}
                                            name={name}
                                            value={shippingAddress[name]}
                                            onChange={handleChange}
                                            required
                                            autoComplete={
                                                name === "postalCode"
                                                    ? "postal-code"
                                                    : name
                                            }
                                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                                        />
                                    </div>
                                ))}
                            </div>

                            {message && (
                                <p
                                    role="status"
                                    className="break-words rounded-lg bg-gray-100 p-3 text-sm text-gray-700"
                                >
                                    {message}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-lg bg-gray-900 px-5 py-3 font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading
                                    ? "Processing..."
                                    : "Pay with Razorpay"}
                            </button>

                            <p className="text-center text-xs text-gray-500">
                                Test mode: use your Razorpay test credentials.
                            </p>
                        </form>
                    )}
                </section>
            </div>
        </main>
    );
}

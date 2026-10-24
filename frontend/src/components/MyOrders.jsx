
import { useCallback, useEffect, useState } from "react";
import api from "../api.js";

export default function MyOrders({ onContinueShopping }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cancelingOrderId, setCancelingOrderId] = useState(null);
    const [notice, setNotice] = useState({
        type: "",
        text: ""
    });

    const fetchOrders = useCallback(async () => {
        setLoading(true);

        try {
            const response = await api.get("/order/");
            setOrders(response.data.orders || []);
            setNotice({ type: "", text: "" });
        } catch (error) {
            setNotice({
                type: "error",
                text:
                    error.response?.data?.message ||
                    "Unable to load your orders"
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleCancelOrder = async (order) => {
        const isRazorpay = order.paymentMethod === "Razorpay";

        const confirmation = isRazorpay
            ? "Cancel this paid order? A refund will be requested through Razorpay."
            : "Are you sure you want to cancel this order?";

        if (!window.confirm(confirmation)) {
            return;
        }

        setCancelingOrderId(order._id);
        setNotice({ type: "", text: "" });

        try {
            const response = await api.put(
                `/order/${order._id}/cancel`
            );

            const updatedOrder = response.data.order;

            if (updatedOrder) {
                setOrders((currentOrders) =>
                    currentOrders.map((currentOrder) =>
                        currentOrder._id === updatedOrder._id
                            ? updatedOrder
                            : currentOrder
                    )
                );
            }

            setNotice({
                type: "success",
                text:
                    response.data.message ||
                    "Cancellation request submitted."
            });
        } catch (error) {
            setNotice({
                type: "error",
                text:
                    error.response?.data?.message ||
                    "Unable to cancel this order."
            });
        } finally {
            setCancelingOrderId(null);
        }
    };

    const formatPrice = (price) =>
        Number(price).toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        });

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#F2F0F1]">
                <p className="text-gray-600">
                    Loading your orders...
                </p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#F2F0F1] px-4 py-10 sm:px-8">
            <div className="mx-auto max-w-5xl">
                <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            My Orders
                        </h1>
                        <p className="mt-2 text-gray-600">
                            View your purchases and their status.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={fetchOrders}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-800 hover:bg-gray-100"
                        >
                            Refresh Orders
                        </button>

                        <button
                            onClick={onContinueShopping}
                            className="rounded-lg bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-gray-700"
                        >
                            Continue Shopping
                        </button>
                    </div>
                </header>

                {notice.text && (
                    <p
                        role="status"
                        className={`mb-5 rounded-lg p-4 ${
                            notice.type === "error"
                                ? "bg-red-50 text-red-700"
                                : "bg-green-50 text-green-700"
                        }`}
                    >
                        {notice.text}
                    </p>
                )}

                {orders.length === 0 ? (
                    <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                        <h2 className="text-xl font-semibold text-gray-900">
                            No orders yet
                        </h2>
                        <p className="mt-2 text-gray-500">
                            Your purchases will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map((order) => (
                            <article
                                key={order._id}
                                className="rounded-2xl bg-white p-5 shadow-sm sm:p-7"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-5">
                                    <div>
                                        <p className="text-sm text-gray-500">
                                            Order ID
                                        </p>

                                        <p className="mt-1 break-all font-semibold text-gray-900">
                                            {order._id}
                                        </p>

                                        <p className="mt-2 text-sm text-gray-500">
                                            {new Date(
                                                order.createdAt
                                            ).toLocaleString("en-IN")}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                                            {order.orderStatus}
                                        </span>

                                        <span
                                            className={`rounded-full px-3 py-1 text-sm font-medium ${
                                                order.paymentStatus === "Paid"
                                                    ? "bg-green-50 text-green-700"
                                                    : order.paymentStatus === "Refunded"
                                                    ? "bg-purple-50 text-purple-700"
                                                    : "bg-amber-50 text-amber-700"
                                            }`}
                                        >
                                            {order.paymentStatus}
                                        </span>
                                    </div>
                                </div>

                                <div className="divide-y divide-gray-100">
                                    {(order.orderItems || []).map(
                                        (item, index) => (
                                            <div
                                                key={
                                                    item._id ||
                                                    `${order._id}-${index}`
                                                }
                                                className="flex items-center gap-4 py-4"
                                            >
                                                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-100 p-2">
                                                    {item.image?.startsWith("http") ? (
                                                        <img
                                                            src={item.image}
                                                            alt={item.name}
                                                            className="h-full w-full object-contain"
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-gray-400">
                                                            No image
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-semibold text-gray-900">
                                                        {item.name}
                                                    </h3>

                                                    <p className="mt-1 text-sm text-gray-500">
                                                        Quantity: {item.quantity}
                                                    </p>

                                                    <p className="mt-1 text-sm text-gray-600">
                                                        {formatPrice(item.price)} each
                                                    </p>
                                                </div>

                                                <p className="text-right font-semibold text-gray-900">
                                                    {formatPrice(
                                                        item.price * item.quantity
                                                    )}
                                                </p>
                                            </div>
                                        )
                                    )}
                                </div>

                                <div className="flex flex-wrap items-end justify-between gap-4 border-t border-gray-200 pt-5">
                                    <div className="space-y-3">
                                        <p className="text-sm text-gray-500">
                                            Payment method: {order.paymentMethod}
                                        </p>

                                        {order.refundStatus &&
                                            order.refundStatus !== "NotRequested" && (
                                                <p className="text-sm text-gray-600">
                                                    Refund status:{" "}
                                                    <span className="font-semibold">
                                                        {order.refundStatus}
                                                    </span>
                                                </p>
                                            )}

                                        {order.orderStatus === "Processing" && (
                                            <button
                                                onClick={() =>
                                                    handleCancelOrder(order)
                                                }
                                                disabled={
                                                    cancelingOrderId === order._id
                                                }
                                                className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {cancelingOrderId === order._id
                                                    ? "Processing..."
                                                    : "Cancel Order"}
                                            </button>
                                        )}

                                        {order.orderStatus === "CancellationPending" && (
                                            <p className="text-sm font-medium text-amber-700">
                                                Refund pending. Please check again shortly.
                                            </p>
                                        )}
                                    </div>

                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">
                                            Order total
                                        </p>

                                        <p className="mt-1 text-xl font-bold text-gray-900">
                                            {formatPrice(order.totalPrice)}
                                        </p>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
            
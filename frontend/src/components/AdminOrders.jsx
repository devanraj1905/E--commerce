
import { useEffect, useState } from "react";
import api from "../api.js";

export default function AdminOrders({ onBackToDashboard }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await api.get("/order/admin/all");
                setOrders(response.data.orders || []);
            } catch (error) {
                setIsError(true);
                setMessage(
                    error.response?.data?.message ||
                    "Unable to load customer orders"
                );
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    const getNextStatus = (status) => {
        if (status === "Processing") return "Shipped";
        if (status === "Shipped") return "Delivered";
        return null;
    };

    const updateStatus = async (order) => {
        const nextStatus = getNextStatus(order.orderStatus);

        if (!nextStatus || updatingId) return;

        try {
            setUpdatingId(order._id);
            setMessage("");
            setIsError(false);

            const response = await api.put(
                `/order/admin/${order._id}/status`,
                { orderStatus: nextStatus }
            );

            setOrders((previous) =>
                previous.map((item) =>
                    item._id === order._id
                        ? response.data.order
                        : item
                )
            );

            setMessage(
                `Order status changed to ${nextStatus}.`
            );
        } catch (error) {
            setIsError(true);
            setMessage(
                error.response?.data?.message ||
                "Unable to update order status"
            );
        } finally {
            setUpdatingId(null);
        }
    };

    const formatPrice = (price) =>
        Number(price).toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        });

    const statusStyle = (status) => {
        switch (status) {
            case "Paid":
            case "Delivered":
                return "bg-green-100 text-green-800";
            case "Cancelled":
            case "Failed":
                return "bg-red-100 text-red-700";
            case "Shipped":
                return "bg-blue-100 text-blue-800";
            case "AwaitingPayment":
            case "Pending":
                return "bg-amber-100 text-amber-800";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    return (
        <main className="min-h-screen bg-[#F2F0F1] px-4 py-8 sm:px-8">
            <div className="mx-auto max-w-7xl">
                <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                            Administration
                        </p>
                        <h1 className="mt-1 text-3xl font-bold text-gray-900">
                            Order Management
                        </h1>
                        <p className="mt-2 text-gray-600">
                            {orders.length} customer orders
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onBackToDashboard}
                        className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-900 hover:bg-gray-100"
                    >
                        Back to Dashboard
                    </button>
                </header>

                {message && (
                    <p
                        role="status"
                        className={`mb-6 rounded-lg p-4 text-sm ${
                            isError
                                ? "bg-red-50 text-red-700"
                                : "bg-green-50 text-green-700"
                        }`}
                    >
                        {message}
                    </p>
                )}

                {loading ? (
                    <div className="rounded-xl bg-white p-10 text-center text-gray-600">
                        Loading orders...
                    </div>
                ) : orders.length === 0 ? (
                    <div className="rounded-xl bg-white p-10 text-center">
                        <h2 className="text-xl font-semibold text-gray-900">
                            No orders found
                        </h2>
                        <p className="mt-2 text-gray-500">
                            Customer orders will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map((order) => {
                            const nextStatus = getNextStatus(
                                order.orderStatus
                            );

                            return (
                                <article
                                    key={order._id}
                                    className="overflow-hidden rounded-2xl bg-white shadow-sm"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 p-5 sm:p-6">
                                        <div className="min-w-0">
                                            <p className="text-xs text-gray-500">
                                                Order ID
                                            </p>
                                            <p className="mt-1 break-all font-semibold text-gray-900">
                                                {order._id}
                                            </p>

                                            <p className="mt-2 text-sm text-gray-500">
                                                {order.createdAt
                                                    ? new Date(
                                                          order.createdAt
                                                      ).toLocaleString("en-IN")
                                                    : "Date unavailable"}
                                            </p>

                                            <p className="mt-3 font-medium text-gray-900">
                                                {order.user?.userName ||
                                                    "Customer unavailable"}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {order.user?.email || ""}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <span
                                                className={`rounded-full px-3 py-1 text-sm font-medium ${statusStyle(order.orderStatus)}`}
                                            >
                                                {order.orderStatus}
                                            </span>

                                            <span
                                                className={`rounded-full px-3 py-1 text-sm font-medium ${statusStyle(order.paymentStatus)}`}
                                            >
                                                {order.paymentStatus}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-5 sm:p-6">
                                        <h2 className="mb-4 font-semibold text-gray-900">
                                            Ordered Products
                                        </h2>

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
                                                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-100 p-2">
                                                            {item.image?.startsWith(
                                                                "http"
                                                            ) ? (
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
                                                            <p className="font-medium text-gray-900">
                                                                {item.name}
                                                            </p>
                                                            <p className="mt-1 text-sm text-gray-500">
                                                                Quantity:{" "}
                                                                {item.quantity}
                                                            </p>
                                                            <p className="text-sm text-gray-500">
                                                                {formatPrice(
                                                                    item.price
                                                                )}{" "}
                                                                each
                                                            </p>
                                                        </div>

                                                        <p className="text-right text-sm font-semibold text-gray-900">
                                                            {formatPrice(
                                                                item.price *
                                                                    item.quantity
                                                            )}
                                                        </p>
                                                    </div>
                                                )
                                            )}
                                        </div>

                                        <div className="mt-4 grid grid-cols-1 gap-5 border-t border-gray-200 pt-5 sm:grid-cols-2">
                                            <div>
                                                <h3 className="font-semibold text-gray-900">
                                                    Shipping Address
                                                </h3>
                                                <p className="mt-2 text-sm leading-6 text-gray-600">
                                                    {order.shippingAddress?.fullName}
                                                    <br />
                                                    {order.shippingAddress?.address}
                                                    <br />
                                                    {order.shippingAddress?.city},{" "}
                                                    {order.shippingAddress?.state}
                                                    {" "}
                                                    {order.shippingAddress?.postalCode}
                                                    <br />
                                                    {order.shippingAddress?.country}
                                                    <br />
                                                    Phone: {order.shippingAddress?.phone}
                                                </p>
                                            </div>

                                            <div className="sm:text-right">
                                                <p className="text-sm text-gray-500">
                                                    Payment method:{" "}
                                                    {order.paymentMethod}
                                                </p>
                                                <p className="mt-2 text-sm text-gray-500">
                                                    Shipping:{" "}
                                                    {formatPrice(
                                                        order.shippingPrice
                                                    )}
                                                </p>
                                                <p className="mt-1 text-sm text-gray-500">
                                                    Items:{" "}
                                                    {formatPrice(
                                                        order.itemsPrice
                                                    )}
                                                </p>
                                                <p className="mt-2 text-xl font-bold text-gray-900">
                                                    Total:{" "}
                                                    {formatPrice(
                                                        order.totalPrice
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        {nextStatus && (
                                            <div className="mt-5 flex justify-end border-t border-gray-200 pt-5">
                                                <button
                                                    type="button"
                                                    disabled={
                                                        updatingId !== null
                                                    }
                                                    onClick={() =>
                                                        updateStatus(order)
                                                    }
                                                    className="rounded-lg bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {updatingId === order._id
                                                        ? "Updating..."
                                                        : `Mark as ${nextStatus}`}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}

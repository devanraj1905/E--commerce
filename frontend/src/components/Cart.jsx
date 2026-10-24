
import { useEffect, useState } from "react";
import api from "../api.js";

export default function Cart({ onContinueShopping, onCheckout }) {
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    const fetchCart = async () => {
        try {
            setLoading(true);
            const response = await api.get("/cart");
            setCart(response.data.cart);
        } catch (error) {
            if (error.response?.status === 404) {
                setCart({ items: [] });
            } else {
                setIsError(true);
                setMessage(
                    error.response?.data?.message ||
                    "Unable to load your cart"
                );
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCart();
    }, []);

    const updateQuantity = async (productId, quantity) => {
        try {
            setBusyId(productId);
            setMessage("");
            setIsError(false);

            const response = await api.put(
                `/cart/update/${productId}`,
                { quantity }
            );

            setCart(response.data.cart);
            setMessage("Cart updated successfully");
        } catch (error) {
            setIsError(true);
            setMessage(
                error.response?.data?.message ||
                "Unable to update quantity"
            );
        } finally {
            setBusyId(null);
        }
    };

    const removeItem = async (productId) => {
        try {
            setBusyId(productId);
            setMessage("");
            setIsError(false);

            const response = await api.delete(
                `/cart/remove/${productId}`
            );

            setCart(response.data.cart);
            setMessage("Product removed from cart");
        } catch (error) {
            setIsError(true);
            setMessage(
                error.response?.data?.message ||
                "Unable to remove product"
            );
        } finally {
            setBusyId(null);
        }
    };

    const items = cart?.items || [];

    const total = items.reduce((sum, item) => {
        if (!item.product) return sum;

        return sum +
            Number(item.product.productPrice) * item.quantity;
    }, 0);

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#F2F0F1]">
                <p className="text-gray-600">Loading your cart...</p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#F2F0F1] px-4 py-10 sm:px-8">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Your Cart
                        </h1>
                        <p className="mt-2 text-gray-600">
                            Review your selected products
                        </p>
                    </div>

                    <button
                        onClick={onContinueShopping}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-800 hover:bg-gray-100"
                    >
                        Continue Shopping
                    </button>
                </div>

                {message && (
                    <p
                        role="status"
                        className={`mb-5 rounded-lg p-3 ${
                            isError
                                ? "bg-red-50 text-red-700"
                                : "bg-green-50 text-green-700"
                        }`}
                    >
                        {message}
                    </p>
                )}

                {items.length === 0 ? (
                    <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Your cart is empty
                        </h2>
                        <p className="mt-2 text-gray-500">
                            Add some products to get started.
                        </p>
                        <button
                            onClick={onContinueShopping}
                            className="mt-6 rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white hover:bg-gray-700"
                        >
                            Browse Products
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
                        <section className="space-y-4">
                            {items.map((item) => {
                                const product = item.product;

                                if (!product) return null;

                                const itemBusy = busyId === product._id;

                                return (
                                    <article
                                        key={item._id}
                                        className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center"
                                    >
                                        <div className="flex h-28 w-full shrink-0 items-center justify-center rounded-lg bg-gray-100 p-2 sm:w-28">
                                            {product.image?.startsWith("http") ? (
                                                <img
                                                    src={product.image}
                                                    alt={product.productName}
                                                    className="h-full w-full object-contain"
                                                />
                                            ) : (
                                                <span className="text-xs text-gray-400">
                                                    No image
                                                </span>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <h2 className="font-semibold text-gray-900">
                                                {product.productName}
                                            </h2>

                                            <p className="mt-1 text-lg font-bold text-gray-900">
                                                {Number(product.productPrice).toLocaleString(
                                                    "en-IN",
                                                    {
                                                        style: "currency",
                                                        currency: "INR",
                                                        maximumFractionDigits: 2
                                                    }
                                                )}
                                            </p>

                                            <p className="mt-1 text-sm text-gray-500">
                                                Available stock: {product.stock}
                                            </p>

                                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                                <div className="flex items-center rounded-lg border border-gray-300">
                                                    <button
                                                        disabled={
                                                            itemBusy ||
                                                            item.quantity <= 1
                                                        }
                                                        onClick={() =>
                                                            updateQuantity(
                                                                product._id,
                                                                item.quantity - 1
                                                            )
                                                        }
                                                        className="px-3 py-2 disabled:opacity-40"
                                                        aria-label="Decrease quantity"
                                                    >
                                                        −
                                                    </button>

                                                    <span className="min-w-9 text-center">
                                                        {item.quantity}
                                                    </span>

                                                    <button
                                                        disabled={
                                                            itemBusy ||
                                                            item.quantity >= product.stock
                                                        }
                                                        onClick={() =>
                                                            updateQuantity(
                                                                product._id,
                                                                item.quantity + 1
                                                            )
                                                        }
                                                        className="px-3 py-2 disabled:opacity-40"
                                                        aria-label="Increase quantity"
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                <button
                                                    disabled={itemBusy}
                                                    onClick={() =>
                                                        removeItem(product._id)
                                                    }
                                                    className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                                                >
                                                    {itemBusy
                                                        ? "Updating..."
                                                        : "Remove"}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="font-semibold text-gray-900 sm:text-right">
                                            {(Number(product.productPrice) *
                                                item.quantity
                                            ).toLocaleString("en-IN", {
                                                style: "currency",
                                                currency: "INR",
                                                maximumFractionDigits: 2
                                            })}
                                        </div>
                                    </article>
                                );
                            })}
                        </section>

                        <aside className="h-fit rounded-2xl bg-white p-6 shadow-sm">
                            <h2 className="text-xl font-bold text-gray-900">
                                Order Summary
                            </h2>

                            <div className="mt-5 flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span>
                                    {total.toLocaleString("en-IN", {
                                        style: "currency",
                                        currency: "INR",
                                        maximumFractionDigits: 2
                                    })}
                                </span>
                            </div>
                            

                            <div className="mt-3 flex justify-between text-gray-600">
                                <span>Shipping</span>
                                <span>Calculated at checkout</span>
                            </div>

                            <div className="my-5 border-t border-gray-200" />

                            <div className="flex justify-between text-lg font-bold text-gray-900">
                                <span>Subtotal</span>
                                <span>
                                    {total.toLocaleString("en-IN", {
                                        style: "currency",
                                        currency: "INR",
                                        maximumFractionDigits: 2
                                    })}
                                </span>
                            </div>
                            <button onClick={onCheckout} disabled={items.length === 0}
    className="mt-5 w-full rounded-lg bg-gray-900 px-4 py-3 font-semibold text-white hover:bg-gray-700 disabled:opacity-50">
    Proceed to Checkout
</button>

                            <p className="mt-4 text-xs text-gray-500">
                                Final shipping charges and payment will be
                                confirmed at checkout.
                            </p>
                        </aside>
                        
                    </div>
                )}
            </div>
        </main>
    );
}

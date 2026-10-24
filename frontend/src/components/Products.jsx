
import { useEffect, useState } from "react";
import api from "../api.js";

export default function Products({user,onOpenCart,onViewOrders,onLogout,onOpenAdmin}) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addingId, setAddingId] = useState(null);
    const [message, setMessage] = useState("");

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await api.get("/product");
                setProducts(response.data);
            } catch (error) {
                setMessage(
                    error.response?.data?.message ||
                    "Unable to load products"
                );
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    const handleAddToCart = async (productId) => {
        try {
            setAddingId(productId);
            setMessage("");

            const response = await api.post("/cart/add", {
                productId,
                quantity: 1
            });

            setMessage(
                response.data.message || "Product added to cart"
            );
        } catch (error) {
            const data = error.response?.data;
            setMessage(
                typeof data === "string"? data : data?.message || "Unable to add product to cart"
            );
        } finally {
            setAddingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-lg text-gray-600">
                    Loading products...
                </p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#F2F0F1] px-4 py-10 sm:px-8">
            <div className="mx-auto max-w-7xl">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Our Products
                    </h1>
                    <p className="mt-2 text-gray-600">
                        Explore our latest collection.
                    </p>
                    <button onClick={onOpenCart}
    className="rounded-lg bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-gray-700"
> View Cart
</button>
<button
    onClick={onViewOrders}
    className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-900 hover:bg-gray-100"
>
    My Orders
</button>
            <button
    type="button"
    onClick={onLogout}
    className="rounded-lg bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700"
>
    Logout
</button>
{user?.role === "admin" && (
    <button
        type="button"
        onClick={onOpenAdmin}
        className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
    >
        Admin Dashboard
    </button>
)}
                </header>
                

                {message && (
                    <p
                        role="status"
                        className="mb-6 rounded-lg bg-white p-4 text-sm text-gray-800"
                    >
                        {message}
                    </p>
                )}

                {products.length === 0 ? (
                    <p className="rounded-xl bg-white p-8 text-center text-gray-600">
                        No products available.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {products.map((product) => (
                            <article
                                key={product._id}
                                className="overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                            >
                                <div className="flex h-56 items-center justify-center bg-gray-100 p-4">
                                    {product.image?.startsWith("http") ? (
                                        <img
                                            src={product.image}
                                            alt={product.productName}
                                            className="h-full w-full object-contain"
                                        />
                                    ) : (
                                        <span className="text-sm text-gray-400">
                                            No image available
                                        </span>
                                    )}
                                </div>

                                <div className="p-5">
                                    <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">
                                        {product.category}
                                    </p>

                                    <h2 className="text-lg font-semibold text-gray-900">
                                        {product.productName}
                                    </h2>

                                    <p className="mt-2 text-xl font-bold text-gray-900">
                                        {new Intl.NumberFormat("en-IN", {
                                            style: "currency",
                                            currency: "INR",
                                            maximumFractionDigits: 2
                                        }).format(product.productPrice)}
                                    </p>

                                    <p className="mt-2 text-sm text-gray-500">
                                        Stock: {product.stock}
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleAddToCart(product._id)
                                        }
                                        disabled={
                                            product.stock < 1 ||
                                            addingId === product._id
                                        }
                                        className="mt-5 w-full rounded-lg bg-gray-900 px-4 py-3 font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                                    >
                                        {addingId === product._id
                                            ? "Adding..."
                                            : product.stock < 1
                                              ? "Out of Stock"
                                              : "Add to Cart"}
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

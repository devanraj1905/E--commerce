
import { useEffect, useState } from "react";
import api from "../api.js";

const initialForm = {
    productName: "",
    productPrice: "",
    description: "",
    category: "electronics",
    stock: "1"
};

export default function AdminDashboard({onBackToProducts,onOpenOrders
}) {
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState(initialForm);
    const [imageFile, setImageFile] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const response = await api.get("/product");
            setProducts(response.data);
        } catch (error) {
            setIsError(true);
            setMessage(
                error.response?.data?.message ||
                "Unable to load products"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProducts();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    const resetForm = () => {
        setForm(initialForm);
        setImageFile(null);
        setEditingId(null);

        const fileInput = document.getElementById("product-image");
        if (fileInput) fileInput.value = "";
    };

    const handleEdit = (product) => {
        setEditingId(product._id);

        setForm({
            productName: product.productName,
            productPrice: String(product.productPrice),
            description: product.description,
            category: product.category,
            stock: String(product.stock)
        });

        setImageFile(null);
        setMessage("");
        setIsError(false);

        window.scrollTo({ top: 0, behavior: "smooth" });
    };
const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setMessage("");
    setIsError(false);

    try {
        if (!editingId && !imageFile) {
            setIsError(true);
            setMessage("Please select a product image.");
            return;
        }

        const payload = {
            productName: form.productName.trim(),
            productPrice: Number(form.productPrice),
            description: form.description.trim(),
            category: form.category,
            stock: Number(form.stock)
        };

        // Send product fields and an optional image file.
        const formData = new FormData();    

        Object.entries(payload).forEach(([key, value]) => {
            formData.append(key, String(value));
        });

        if (imageFile) {
            formData.append("image", imageFile);
        }

        if (editingId) {
            await api.put(
                `/productupdate/${editingId}`,
                formData
            );

            setMessage("Product updated successfully.");
        } else {
            await api.post("/productcreate", formData);

            setMessage("Product created successfully.");
        }

        resetForm();
        await loadProducts();

    } catch (error) {
        setIsError(true);

        const data = error.response?.data;

        setMessage(
            typeof data === "string"
                ? data
                : data?.message || "Unable to save product."
        );
    } finally {
        setSaving(false);
    }
};


    const handleDelete = async (productId) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this product?"
        );

        if (!confirmed) return;

        try {
            setMessage("");
            setIsError(false);

            await api.delete(`/productdelete/${productId}`);

            setProducts((previous) =>
                previous.filter((product) => product._id !== productId)
            );

            if (editingId === productId) resetForm();

            setMessage("Product deleted successfully.");
        } catch (error) {
            setIsError(true);

            const data = error.response?.data;
            setMessage(
                typeof data === "string"
                    ? data
                    : data?.message || "Unable to delete product."
            );
        }
    };

    const formatPrice = (price) =>
        Number(price).toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        });

    return (
        <main className="min-h-screen bg-[#F2F0F1] px-4 py-8 sm:px-8">
            <div className="mx-auto max-w-7xl">
                <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <button
    type="button"
    onClick={onOpenOrders}
    className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
>
    Manage Orders
</button>
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                            Administration
                        </p>

                        <h1 className="mt-1 text-3xl font-bold text-gray-900">
                            Product Management
                        </h1>
                    </div>

                    <button
                        type="button"
                        onClick={onBackToProducts}
                        className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-medium text-gray-900 hover:bg-gray-100"
                    >
                        Back to Store
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

                <section className="mb-10 rounded-2xl bg-white p-6 shadow-sm sm:p-8">
                    <h2 className="mb-6 text-xl font-bold text-gray-900">
                        {editingId ? "Edit Product" : "Add New Product"}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div>
                                <label htmlFor="productName" className="mb-2 block text-sm font-medium text-gray-700">
                                    Product Name
                                </label>
                                <input
                                    id="productName"
                                    name="productName"
                                    value={form.productName}
                                    onChange={handleChange}
                                    minLength={3}
                                    maxLength={100}
                                    required
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                                    placeholder="Product Name"
                                />
                            </div>

                            <div>
                                <label htmlFor="productPrice" className="mb-2 block text-sm font-medium text-gray-700">
                                    Price (₹)
                                </label>
                                <input
                                    id="productPrice"
                                    name="productPrice"
                                    type="number"
                                    min="19"
                                    max="299999"
                                    step="0.01"
                                    value={form.productPrice}
                                    onChange={handleChange}
                                    placeholder="20-300000"
                                    required
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                                />
                            </div>

                            <div>
                                <label htmlFor="category" className="mb-2 block text-sm font-medium text-gray-700">
                                    Category
                                </label>
                                <select
                                    id="category"
                                    name="category"
                                    value={form.category}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-gray-900"
                                >
                                    <option value="electronics">Electronics</option>
                                    <option value="food">Food</option>
                                    <option value="cloth">Clothing</option>
                                    <option value="books">Books</option>
                                    <option value="others">Others</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="stock" className="mb-2 block text-sm font-medium text-gray-700">
                                    Stock
                                </label>
                                <input
                                    id="stock"
                                    name="stock"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={form.stock}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="description" className="mb-2 block text-sm font-medium text-gray-700">
                                Description
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                minLength={20}
                                maxLength={200}
                                rows={3}
                                required
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                                placeholder="Write a product description (20–200 characters)"
                            />
                        </div>

                      
<div>
    <label
        htmlFor="product-image"
        className="mb-2 block text-sm font-medium text-gray-700"
    >
        {editingId
            ? "Replace Product Image (Optional)"
            : "Product Image"}
    </label>

    <input
        id="product-image"
        type="file"
        accept="image/*"
        onChange={(e) =>
            setImageFile(e.target.files?.[0] || null)
        }
        required={!editingId}
        className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm"
    />

    {editingId && (
        <p className="mt-2 text-xs text-gray-500">
            Leave empty to keep the current image.
        </p>
    )}
</div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="submit"
                                disabled={saving}
                                className="rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
                            >
                                {saving
                                    ? "Saving..."
                                    : editingId
                                      ? "Save Changes"
                                      : "Create Product"}
                            </button>

                            {editingId && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-100"
                                >
                                    Cancel Edit
                                </button>
                            )}
                        </div>
                    </form>
                </section>

                <section>
                    <div className="mb-5 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">
                            Products
                        </h2>
                        <span className="text-sm text-gray-500">
                            {products.length} products
                        </span>
                    </div>

                    {loading ? (
                        <p className="py-10 text-center text-gray-600">
                            Loading products...
                        </p>
                    ) : products.length === 0 ? (
                        <div className="rounded-2xl bg-white p-10 text-center text-gray-500">
                            No products available yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                            {products.map((product) => (
                                <article
                                    key={product._id}
                                    className="overflow-hidden rounded-2xl bg-white shadow-sm"
                                >
                                    <div className="flex h-52 items-center justify-center bg-gray-100 p-4">
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
                                        <div className="flex items-start justify-between gap-3">
                                            <h3 className="font-semibold text-gray-900">
                                                {product.productName}
                                            </h3>
                                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                                                {product.category}
                                            </span>
                                        </div>

                                        <p className="mt-3 text-lg font-bold text-gray-900">
                                            {formatPrice(product.productPrice)}
                                        </p>

                                        <p className="mt-1 text-sm text-gray-500">
                                            Stock: {product.stock}
                                        </p>

                                        <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                                            {product.description}
                                        </p>

                                        <div className="mt-5 flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => handleEdit(product)}
                                                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-800 hover:bg-gray-100"
                                            >
                                                Edit
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleDelete(product._id)}
                                                className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

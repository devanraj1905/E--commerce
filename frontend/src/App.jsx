
import { useEffect, useState } from "react";

import api from "./api.js";

import Login from "./components/Login.jsx";
import Register from "./components/Register.jsx";
import Products from "./components/Products.jsx";
import Cart from "./components/Cart.jsx";
import Checkout from "./components/Checkout.jsx";
import MyOrders from "./components/MyOrders.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import AdminOrders from "./components/AdminOrders.jsx";

function App() {
    const [user, setUser] = useState(null);
    const [page, setPage] = useState("products");
    const [authPage, setAuthPage] = useState("login");
    const [checkingSession, setCheckingSession] = useState(true);

    // Restore the login session after opening or refreshing the app
    useEffect(() => {
        const checkSession = async () => {
            try {
                const response = await api.get("/user/me");
                setUser(response.data);
            } catch {
                setUser(null);
            } finally {
                setCheckingSession(false);
            }
        };

        checkSession();
    }, []);

    // Logout
    const handleLogout = async () => {
        try {
            await api.post("/user/logout");

            setUser(null);
            setPage("products");
            setAuthPage("login");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    // Session loading screen
    if (checkingSession) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#F2F0F1]">
                <p className="text-lg font-medium text-gray-700">
                    Checking your session...
                </p>
            </main>
        );
    }

    // Login and registration pages
    if (!user) {
        if (authPage === "register") {
            return (
                <Register
                    onSwitchToLogin={() => setAuthPage("login")}
                />
            );
        }

        return (
            <Login
                onLoginSuccess={(authenticatedUser) => {
                    setUser(authenticatedUser);
                    setPage("products");
                }}
                onSwitchToRegister={() => setAuthPage("register")}
            />
        );
    }

    // Shopping cart
    if (page === "cart") {
        return (
            <Cart
                onContinueShopping={() => setPage("products")}
                onCheckout={() => setPage("checkout")}
            />
        );
    }

    // Checkout and Razorpay payment
    if (page === "checkout") {
        return (
            <Checkout
                onBackToCart={() => setPage("cart")}
                onViewOrders={() => setPage("orders")}
            />
        );
    }

    // Customer order history
    if (page === "orders") {
        return (
            <MyOrders
                onContinueShopping={() => setPage("products")}
            />
        );
    }

    // Admin order management
    if (page === "admin-orders") {
        if (user.role !== "admin") {
            return (
                <main className="flex min-h-screen items-center justify-center bg-[#F2F0F1] p-8">
                    <div className="rounded-xl bg-white p-8 text-center shadow-sm">
                        <h1 className="text-xl font-bold text-gray-900">
                            Access Denied
                        </h1>
                        <p className="mt-2 text-gray-600">
                            You are not authorized to access admin orders.
                        </p>
                        <button
                            onClick={() => setPage("products")}
                            className="mt-5 rounded-lg bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-gray-700"
                        >
                            Back to Store
                        </button>
                    </div>
                </main>
            );
        }

        return (
            <AdminOrders
                onBackToDashboard={() => setPage("admin")}
            />
        );
    }

    // Admin product dashboard
    if (page === "admin") {
        if (user.role !== "admin") {
            return (
                <main className="p-8 text-center">
                    <h1 className="text-xl font-bold">
                        Access Denied
                    </h1>
                    <button
                        onClick={() => setPage("products")}
                        className="mt-4 rounded-lg bg-gray-900 px-5 py-3 text-white"
                    >
                        Back to Store
                    </button>
                </main>
            );
        }

        return (
            <AdminDashboard
                onBackToProducts={() => setPage("products")}
                onOpenOrders={() => setPage("admin-orders")}
            />
        );
    }

    // Default page: Product listing
    return (
        <Products
            user={user}
            onOpenCart={() => setPage("cart")}
            onViewOrders={() => setPage("orders")}
            onLogout={handleLogout}
            onOpenAdmin={() => setPage("admin")}
        />
    );
}

export default App;

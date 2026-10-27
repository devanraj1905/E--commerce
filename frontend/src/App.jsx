
import { useEffect, useState } from "react";
import {
    Routes,
    Route,
    Navigate,
    Link,
    useNavigate,
    useLocation
} from "react-router";

import api from "./api.js";

import Login from "./components/Login.jsx";
import Register from "./components/Register.jsx";
import Products from "./components/Products.jsx";
import Cart from "./components/Cart.jsx";
import Checkout from "./components/Checkout.jsx";
import MyOrders from "./components/MyOrders.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import AdminOrders from "./components/AdminOrders.jsx";

// Redirect users who are not logged in.
function RequireAuth({ user, children }) {
    const location = useLocation();

    if (!user) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location }}
            />
        );
    }

    return children;
}

// Protect administrator-only pages.
function RequireAdmin({ user, children }) {
    const location = useLocation();

    if (!user) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location }}
            />
        );
    }

    if (user.role !== "admin") {
        return <Navigate to="/" replace />;
    }

    return children;
}

// Loading screen while restoring the login session.
function LoadingScreen() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F2F0F1]">
            <p className="text-lg font-medium text-gray-700">
                Checking your session...
            </p>
        </main>
    );
}

// Fallback for unknown URLs.
function NotFound({ user }) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F2F0F1] px-4">
            <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
                <h1 className="text-5xl font-bold text-gray-900">
                    404
                </h1>

                <h2 className="mt-4 text-xl font-semibold text-gray-800">
                    Page not found
                </h2>

                <p className="mt-2 text-gray-600">
                    The page you are looking for does not exist.
                </p>

                <Link
                    to={user ? "/" : "/login"}
                    className="mt-6 inline-block rounded-lg bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-gray-700"
                >
                    {user ? "Back to Store" : "Go to Login"}
                </Link>
            </section>
        </main>
    );
}

export default function App() {
    const [user, setUser] = useState(null);
    const [checkingSession, setCheckingSession] = useState(true);

    const navigate = useNavigate();
    const location = useLocation();

    // Restore the authenticated session after refresh.
    useEffect(() => {
        let active = true;

        const checkSession = async () => {
            try {
                const response = await api.get("/user/me");

                if (active) {
                    setUser(response.data);
                }
            } catch {
                if (active) {
                    setUser(null);
                }
            } finally {
                if (active) {
                    setCheckingSession(false);
                }
            }
        };

        checkSession();

        return () => {
            active = false;
        };
    }, []);

    // Handle successful login.
    const handleLoginSuccess = (authenticatedUser) => {
        setUser(authenticatedUser);

        const destination = location.state?.from || "/";

        navigate(destination, { replace: true });
    };

    // Logout and clear the server-side session cookie.
    const handleLogout = async () => {
        try {
            await api.post("/user/logout");

            setUser(null);
            navigate("/login", { replace: true });
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    if (checkingSession) {
        return <LoadingScreen />;
    }

    return (
        <Routes>
            {/* Authentication routes */}
            <Route
                path="/login"
                element={
                    user ? (
                        <Navigate to="/" replace />
                    ) : (
                        <Login
                            onLoginSuccess={handleLoginSuccess}
                            onSwitchToRegister={() =>
                                navigate("/register")
                            }
                        />
                    )
                }
            />

            <Route
                path="/register"
                element={
                    user ? (
                        <Navigate to="/" replace />
                    ) : (
                        <Register
                            onSwitchToLogin={() =>
                                navigate("/login")
                            }
                        />
                    )
                }
            />

            {/* Store */}
            <Route
                path="/"
                element={
                    <RequireAuth user={user}>
                        <Products
                            user={user}
                            onOpenCart={() =>
                                navigate("/cart")
                            }
                            onViewOrders={() =>
                                navigate("/orders")
                            }
                            onLogout={handleLogout}
                            onOpenAdmin={() =>
                                navigate("/admin/products")
                            }
                        />
                    </RequireAuth>
                }
            />

            {/* Shopping cart */}
            <Route
                path="/cart"
                element={
                    <RequireAuth user={user}>
                        <Cart
                            onContinueShopping={() =>
                                navigate("/")
                            }
                            onCheckout={() =>
                                navigate("/checkout")
                            }
                        />
                    </RequireAuth>
                }
            />

            {/* Checkout and payment */}
            <Route
                path="/checkout"
                element={
                    <RequireAuth user={user}>
                        <Checkout
                            onBackToCart={() =>
                                navigate("/cart")
                            }
                            onViewOrders={() =>
                                navigate("/orders")
                            }
                        />
                    </RequireAuth>
                }
            />

            {/* Customer order history */}
            <Route
                path="/orders"
                element={
                    <RequireAuth user={user}>
                        <MyOrders
                            onContinueShopping={() =>
                                navigate("/")
                            }
                        />
                    </RequireAuth>
                }
            />

            {/* Administrator product management */}
            <Route
                path="/admin/products"
                element={
                    <RequireAdmin user={user}>
                        <AdminDashboard
                            onBackToProducts={() =>
                                navigate("/")
                            }
                            onOpenOrders={() =>
                                navigate("/admin/orders")
                            }
                        />
                    </RequireAdmin>
                }
            />

            {/* Administrator order management */}
            <Route
                path="/admin/orders"
                element={
                    <RequireAdmin user={user}>
                        <AdminOrders
                            onBackToDashboard={() =>
                                navigate("/admin/products")
                            }
                        />
                    </RequireAdmin>
                }
            />

            {/* Redirect the old admin URL */}
            <Route
                path="/admin"
                element={
                    <Navigate
                        to="/admin/products"
                        replace
                    />
                }
            />

            {/* Unknown URLs */}
            <Route
                path="*"
                element={<NotFound user={user} />}
            />
        </Routes>
    );
}

import { useState } from "react";
import api from "../api.js";

export default function Login({ onLoginSuccess, onSwitchToRegister }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [user, setUser] = useState(null);
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        setLoading(true);
        setMessage("");
        setUser(null);
        setIsError(false);

       try {
    const response = await api.post("/user/login", {
        email,
        password
    });

    setMessage(
        typeof response.data === "string"
            ? response.data
            : response.data.message || "Login successful"
    );

    const profileResponse = await api.get("/user/me");

    setUser(profileResponse.data);
    onLoginSuccess?.(profileResponse.data);

} catch (error) {
    setIsError(true);

    const data = error.response?.data;

    setMessage(
        typeof data === "string"
            ? data
            : data?.message || "Unable to log in. Please try again."
    );
} finally {
    setLoading(false);
}
}
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F2F0F1] px-4 py-10">
            <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-10">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Welcome Back
                    </h1>

                    <p className="mt-2 text-sm text-gray-500">
                        Sign in to your e-commerce account
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label
                            htmlFor="email"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Email Address
                        </label>

                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            autoComplete="email"
                            required
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Password
                        </label>

                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            required
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-gray-900 px-4 py-3 font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "Signing in..." : "Login"}
                    </button>
                </form>

                {message && (
                    <p
                        role="status"
                        className={`mt-5 rounded-lg p-3 text-center text-sm ${
                            isError
                                ? "bg-red-50 text-red-700"
                                : "bg-green-50 text-green-700"
                        }`}
                    >
                        {message}
                    </p>
                )}

                {user && (
                    <div className="mt-5 rounded-lg bg-gray-50 p-4">
                        <h2 className="font-semibold text-center text-gray-900">
                            Welcome, {user.userName}!
                        </h2>

                
                    </div>
                )}
                <p className="mt-6 text-center text-sm text-gray-600">
    Don't have an account?{" "}
    <button
        type="button"
        onClick={onSwitchToRegister}
        className="font-semibold text-gray-900 underline underline-offset-4"
    >
        Register
    </button>
</p>
            </section>
            
        </main>
    );
}

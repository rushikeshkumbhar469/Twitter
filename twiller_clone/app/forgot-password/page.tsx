"use client";

import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Image from "next/image";

const ForgotPasswordPage = () => {
    const [identifier, setIdentifier] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // OTP Flow state
    const [otpRequired, setOtpRequired] = useState(false);
    const [otpEmail, setOtpEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const router = useRouter();

    const handleRequestPasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");
        setError("");
        setOtpRequired(false);
        setNewPassword("");

        try {
            const response = await axios.post("http://localhost:5000/forgot-password", {
                identifier,
            });

            if (response.data.method === "otp_required") {
                setOtpRequired(true);
                setOtpEmail(response.data.email);
                setMessage("Email delivery failed. Please check your email for an OTP to display the password.");
            } else {
                setMessage(response.data.message || "A new password has been sent to your email.");
            }
        } catch (err: any) {
            setError(
                err.response?.data?.error || "Failed to process forgot password request."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");
        setError("");

        try {
            const response = await axios.post("http://localhost:5000/verify-forgot-password-otp", {
                email: otpEmail,
                otp
            });

            setMessage("OTP verified successfully!");
            setNewPassword(response.data.newPassword);
            setOtpRequired(false);
        } catch (err: any) {
            setError(
                err.response?.data?.error || "Failed to verify OTP."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

                <div className="flex justify-center mb-8">
                    <Image src="/favicon.png" alt="Twitter Logo" width={50} height={50} className="rounded-full" />
                </div>

                <h1 className="text-3xl font-bold mb-2 text-center text-white/90">Forgot Password</h1>
                <p className="text-gray-400 text-center mb-8">Enter your email to reset your password.</p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-6 text-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                {message && !newPassword && (
                    <div className="bg-blue-500/10 border border-blue-500/50 text-blue-400 p-3 rounded-lg mb-6 text-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span>{message}</span>
                    </div>
                )}

                {newPassword && (
                    <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-6 rounded-lg mb-6 text-center shadow-[0_0_15px_rgba(34,197,94,0.15)]">
                        <h3 className="font-bold text-lg mb-2 text-white">Your new password is:</h3>
                        <div className="text-2xl font-mono bg-black/50 p-3 rounded-md border border-green-500/30 tracking-wider">
                            {newPassword}
                        </div>
                        <p className="text-sm mt-4 text-green-500/80">Please copy this password and log in to change it.</p>
                    </div>
                )}

                {!otpRequired && !newPassword ? (
                    <form onSubmit={handleRequestPasswordReset} className="space-y-6">
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Email or Phone Number"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required
                                className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-transparent peer focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-300"
                                id="identifier"
                            />
                            <label
                                htmlFor="identifier"
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm transition-all duration-300 peer-placeholder-shown:text-base peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-500 peer-valid:top-2 peer-valid:text-xs"
                            >
                                Email or Phone Number
                            </label>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex justify-center items-center"
                        >
                            {loading ? (
                                <svg className="animate-spin h-5 w-5 mr-3 text-black" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : "Reset Password"}
                        </button>
                    </form>
                ) : otpRequired ? (
                    <form onSubmit={handleVerifyOtp} className="space-y-6 animate-fade-in">
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Enter 6-digit OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                maxLength={6}
                                className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-transparent peer focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono tracking-widest text-center text-lg transition-all duration-300"
                                id="otp"
                            />
                            <label
                                htmlFor="otp"
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm transition-all duration-300 peer-placeholder-shown:text-base peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-500 peer-valid:top-2 peer-valid:text-xs"
                            >
                                OTP Verification Code
                            </label>
                        </div>
                        <button
                            type="submit"
                            disabled={loading || otp.length < 6}
                            className="w-full bg-blue-500 text-white font-bold py-3 rounded-xl hover:bg-blue-600 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.23)]"
                        >
                            {loading ? "Verifying..." : "Verify OTP & Show Password"}
                        </button>
                    </form>
                ) : null}

                <div className="mt-8 text-center">
                    <button
                        onClick={() => router.push("/")}
                        className="text-gray-400 hover:text-white text-sm transition-colors decoration-gray-400 hover:underline underline-offset-4"
                    >
                        ← Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;

"use client";

export default function PasswordReset() {
  return (
    <div className="mt-8 pt-8 border-t border-white/10">
      <h3 className="font-semibold mb-2">Security</h3>
      <p className="text-sm text-white/60 mb-4">Forgot your password? We’ll send a reset link to your email.</p>
      <button 
        onClick={() => alert("Password reset flow will be connected in the next step.")}
        className="text-sm px-5 py-2.5 border border-white/30 rounded-2xl hover:bg-white/5 transition"
      >
        Send Password Reset Link
      </button>
    </div>
  );
}

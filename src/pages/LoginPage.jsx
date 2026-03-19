import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dumbbell, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // login | register | forgot
  const [form, setForm] = useState({ email: "", password: "", fullName: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(form.email, form.password);
        navigate("/");
      } else if (mode === "register") {
        if (!form.fullName.trim()) throw new Error("Please enter your full name.");
        await signUp(form.email, form.password, form.fullName);
        setSuccess("Account created! Check your email to confirm your account, then sign in.");
        setMode("login");
      } else if (mode === "forgot") {
        await resetPassword(form.email);
        setSuccess("Password reset email sent. Check your inbox.");
        setMode("login");
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-neutral-900 to-red-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-red-600/20 border border-red-600/40 rounded-2xl p-4 mb-4">
            <Dumbbell className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            <span className="text-red-600">AF</span>_APP
          </h1>
          <p className="text-neutral-400 text-sm mt-1">Workout Tracker for Trainers</p>
        </div>

        <Card className="card-style">
          <CardHeader className="pb-2">
            <CardTitle>
              {mode === "login" && "Sign In"}
              {mode === "register" && "Create Account"}
              {mode === "forgot" && "Reset Password"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <Label className="text-neutral-300">Full Name</Label>
                  <Input
                    type="text"
                    className="bg-neutral-800 border-neutral-700 mt-1"
                    placeholder="John Smith"
                    value={form.fullName}
                    onChange={(e) => update("fullName", e.target.value)}
                    required
                  />
                </div>
              )}

              <div>
                <Label className="text-neutral-300">Email</Label>
                <Input
                  type="email"
                  className="bg-neutral-800 border-neutral-700 mt-1"
                  placeholder="trainer@example.com"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  required
                />
              </div>

              {mode !== "forgot" && (
                <div>
                  <Label className="text-neutral-300">Password</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showPw ? "text" : "password"}
                      className="bg-neutral-800 border-neutral-700 pr-10"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute inset-y-0 right-3 text-neutral-400 hover:text-white"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-sm text-emerald-400 bg-emerald-900/20 border border-emerald-900/40 rounded-lg px-3 py-2">
                  {success}
                </p>
              )}

              <Button
                type="submit"
                className="glow-btn w-full"
                disabled={loading}
              >
                {loading ? "Please wait…" : (
                  mode === "login" ? "Sign In" :
                  mode === "register" ? "Create Account" :
                  "Send Reset Email"
                )}
              </Button>
            </form>

            {/* Mode switchers */}
            <div className="mt-4 flex flex-col items-center gap-2 text-sm text-neutral-400">
              {mode === "login" && (
                <>
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}
                    className="hover:text-red-400 transition-colors"
                  >
                    Forgot password?
                  </button>
                  <p>
                    No account?{" "}
                    <button
                      type="button"
                      onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
                      className="text-red-500 hover:text-red-400 font-medium"
                    >
                      Register
                    </button>
                  </p>
                </>
              )}
              {(mode === "register" || mode === "forgot") && (
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                  className="text-red-500 hover:text-red-400 font-medium"
                >
                  ← Back to Sign In
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

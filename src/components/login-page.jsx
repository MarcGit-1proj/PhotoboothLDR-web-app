import { useState } from "react";
import { supabase } from "../supabaseClient";
import "../style/login-page.css";

export default function LoginPage({ onLogin, onContinueAsGuest }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [formInfo, setFormInfo] = useState("");
  const [loading, setLoading] = useState(false);
  // True lang habang gumagawa ng account at ng unique ID
  const [generating, setGenerating] = useState(false);

  const isSignup = mode === "signup";

  const switchMode = () => {
    setMode(isSignup ? "login" : "signup");
    setErrors({});
    setFormError("");
    setFormInfo("");
  };

  const validate = () => {
    const next = {};
    if (isSignup && !name.trim()) next.name = "Enter your name.";
    if (!email.trim()) next.email = "Enter your email.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "That email doesn't look right.";
    if (!password) next.password = "Enter your password.";
    else if (isSignup && password.length < 6)
      next.password = "Use at least 6 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    setFormError("");
    setFormInfo("");
    if (!validate()) return;
    setLoading(true);
    if (isSignup) setGenerating(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() } },
        });
        if (error) throw error;
        if (data.session) {
          onLogin?.(data.user);
        } else {
          // Email confirmation is ON in Supabase
          setFormInfo("Account created. Check your email to confirm, then log in.");
          setMode("login");
          setPassword("");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        onLogin?.(data.user);
      }
    } catch (err) {
      setFormError(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  const handleForgot = async () => {
    setFormError("");
    setFormInfo("");
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setErrors({ email: "Enter your email first, then tap Forgot password." });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setFormError(error.message);
    else setFormInfo("Password reset link sent. Check your email.");
  };

  const handleGuest = async () => {
    setFormError("");
    setFormInfo("");
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      onContinueAsGuest?.(data.user);
    } catch {
      // Walang Supabase project pa o hindi gumana: local guest na lang
      onContinueAsGuest?.(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="ss-login-page">
      {generating && (
        <div className="ss-generating-overlay" role="status" aria-live="polite">
          <div className="ss-generating-box">
            <span className="ss-spinner" aria-hidden="true"></span>
            <p className="ss-generating-title">Creating your account...</p>
            <p className="ss-generating-text">Generating your unique ID</p>
          </div>
        </div>
      )}

      <div className="ss-login-card">
        <span className="ss-login-badge">Long-Distance Connection</span>

        <p className="ss-login-welcome">
          {isSignup ? "Create your account on" : "Welcome back to"}
        </p>
        <h1 className="ss-login-logo">
          Snap<span>Sync</span>
        </h1>

        <div className="ss-login-fields" onKeyDown={handleKeyDown}>
          {isSignup && (
            <div className="ss-field">
              <label htmlFor="ss-name">Name</label>
              <input
                id="ss-name"
                type="text"
                autoComplete="name"
                placeholder="What should your partner call you?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="ss-field-error">{errors.name}</p>}
            </div>
          )}

          <div className="ss-field">
            <label htmlFor="ss-email">Email</label>
            <input
              id="ss-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="ss-field-error">{errors.email}</p>}
          </div>

          <div className="ss-field">
            <div className="ss-field-row">
              <label htmlFor="ss-password">Password</label>
              {!isSignup && (
                <button type="button" className="ss-link" onClick={handleForgot}>
                  Forgot password?
                </button>
              )}
            </div>
            <div className="ss-password-wrap">
              <input
                id="ss-password"
                type={showPassword ? "text" : "password"}
                autoComplete={isSignup ? "new-password" : "current-password"}
                placeholder={isSignup ? "At least 6 characters" : "Enter your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors.password}
              />
              <button
                type="button"
                className="ss-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && <p className="ss-field-error">{errors.password}</p>}
          </div>

          {formError && (
            <p className="ss-form-error" role="alert">
              {formError}
            </p>
          )}
          {formInfo && (
            <p className="ss-form-success" role="status">
              {formInfo}
            </p>
          )}

          <button
            type="button"
            className="ss-primary-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Please wait..." : isSignup ? "Create account" : "Log in"}
          </button>

          <div className="ss-divider" role="separator">
            <span>or</span>
          </div>

          <button
            type="button"
            className="ss-secondary-btn"
            onClick={handleGuest}
            disabled={loading}
          >
            Continue without account
          </button>
        </div>

        <p className="ss-login-footer">
          {isSignup ? "Already have an account?" : "New to SnapSync?"}{" "}
          <button type="button" className="ss-link" onClick={switchMode}>
            {isSignup ? "Log in" : "Create an account"}
          </button>
        </p>
      </div>
    </div>
  );
}
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_URL from "../config";
import "../App.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_URL}/api/auth/login`,
        {
          email: email.trim(),
          password,
        },
        {
          withCredentials: true,
        }
      );

      sessionStorage.setItem("hrisLoggedIn", "true");
      sessionStorage.setItem("hrisUser", JSON.stringify(response.data.user));
      if (response.data.token) {
        sessionStorage.setItem("hrisToken", response.data.token);
      }

      if (
        response.data.user?.role === "HR" ||
        response.data.user?.role === "ADMIN"
      ) {
        navigate("/hr/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);

      setError(
        err.response?.data?.message ||
          "Login failed. Please check your email and password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="login-shape login-shape-one"></div>
        <div className="login-shape login-shape-two"></div>

        <div className="login-card">
          <div className="login-brand">
            <div className="login-logo">H</div>

            <div>
              <h1>HRIS</h1>
              <p>Human Resource Information System</p>
            </div>
          </div>

          <div className="login-heading">
            <h2>Welcome back</h2>
            <p>Sign in to access your employee portal.</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="email">Email address</label>

              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>

              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="login-demo">
            <p>Demo Employee</p>
            <span>employee@hris.com</span>
          </div>

          <div className="login-footer">
            <span>HRIS Portal</span>
            <span>Secure Employee Management</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
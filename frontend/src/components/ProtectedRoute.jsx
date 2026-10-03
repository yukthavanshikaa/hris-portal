import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import API_URL from "../config";

function getStoredUser() {
  try {
    const raw = sessionStorage.getItem("hrisUser");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.role ? parsed : null;
  } catch {
    return null;
  }
}

function ProtectedRoute({
  children,
  allowedRoles
}) {
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(() => !getStoredUser());

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
      setLoading(false);
    }

    const checkAuthentication = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/api/auth/me`,
          {
            withCredentials: true
          }
        );

        if (response.data?.user) {
          setUser(response.data.user);
          sessionStorage.setItem("hrisUser", JSON.stringify(response.data.user));
          sessionStorage.setItem("hrisLoggedIn", "true");
        }
      } catch (error) {
        console.error(
          "Background auth check failed:",
          error
        );

        const currentStored = getStoredUser();
        if (!currentStored) {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuthentication();
  }, []);

  const activeUser = user || getStoredUser();

  if (loading && !activeUser) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
          color: "#697386"
        }}
      >
        Checking access...
      </div>
    );
  }

  if (!activeUser) {
    return <Navigate to="/login" replace />;
  }

  if (
    allowedRoles &&
    !allowedRoles.includes(activeUser.role)
  ) {
    if (activeUser.role === "EMPLOYEE") {
      return (
        <Navigate
          to="/dashboard"
          replace
        />
      );
    }

    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
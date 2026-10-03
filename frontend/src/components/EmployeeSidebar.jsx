import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import API_URL from "../config";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: "⌂" },
  { path: "/attendance", label: "Attendance", icon: "◷" },
  { path: "/leave", label: "Leave", icon: "▣" },
  { path: "/payroll", label: "Payroll", icon: "₹" },
  { path: "/documents", label: "Documents", icon: "▤" },
  { path: "/organization", label: "Organization", icon: "👥" },
  { path: "/assistant", label: "Company Assistant", icon: "🤖" },
];

function EmployeeSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await axios.post(
        `${API_URL}/api/auth/logout`,
        {},
        { withCredentials: true }
      );
    } catch (e) {
      console.error("Logout error:", e);
    }

    sessionStorage.removeItem("hrisLoggedIn");
    sessionStorage.removeItem("hrisUser");
    sessionStorage.removeItem("hrisToken");
    navigate("/login");
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">H</div>
        <div>
          <h2>HRIS</h2>
          <span>Employee Portal</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <button
          type="button"
          onClick={handleLogout}
          className="logout-button"
        >
          <span>↪</span>
          Logout
        </button>
      </div>
    </aside>
  );
}

export default EmployeeSidebar;

import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

import "./HRSidebar.css";
import API_URL from "../config";

function getStoredUser() {
  try {
    const raw = sessionStorage.getItem("hrisUser");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function getAvatarText(firstName, lastName, emailPrefix, role) {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) {
    return firstName.slice(0, 2).toUpperCase();
  }
  if (emailPrefix) {
    return emailPrefix.slice(0, 2).toUpperCase();
  }
  return role === "ADMIN" ? "AD" : "HR";
}

function HRSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = getStoredUser();

  const emp = user?.employee;
  const firstName = emp?.firstName?.trim() || "";
  const lastName = emp?.lastName?.trim() || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const emailPrefix = user?.email ? user.email.split("@")[0] : "";

  const displayName =
    fullName ||
    emailPrefix ||
    (user?.role === "ADMIN" ? "Administrator" : "HR Administrator");

  const displayRole =
    user?.role === "ADMIN" ? "System Administrator" : "HR Administrator";

  const avatarText = getAvatarText(firstName, lastName, emailPrefix, user?.role);

  const dashboardActive =
    location.pathname === "/hr" ||
    location.pathname === "/hr/dashboard";

  const isActive = (path) =>
    location.pathname === path;

  const handleLogout = async () => {
    try {
      await axios.post(
        `${API_URL}/api/auth/logout`,
        {},
        {
          withCredentials: true
        }
      );
    } catch (error) {
      console.error("Logout error:", error);
    }

    sessionStorage.removeItem("hrisLoggedIn");
    sessionStorage.removeItem("hrisUser");
    sessionStorage.removeItem("hrisToken");
    navigate("/");
  };

  return (
    <aside className="hr-sidebar">

      {/* Logo */}
      <div className="hr-sidebar-logo">

        <div className="hr-logo-mark">
          H
        </div>

        <div className="hr-logo-text">
          <div className="hr-logo-title">
            HRIS Portal
          </div>

          <div className="hr-logo-subtitle">
            Human Resources
          </div>
        </div>

      </div>


      {/* Navigation */}
      <nav className="hr-sidebar-nav">

        <div className="hr-nav-section-title">
          MAIN
        </div>


        {/* Dashboard */}
        <button
          type="button"
          className={
            dashboardActive
              ? "hr-nav-item active"
              : "hr-nav-item"
          }
          onClick={() => navigate("/hr")}
        >
          <span className="hr-nav-icon">
            ▦
          </span>

          <span>
            Dashboard
          </span>
        </button>


        {/* Employees */}
        <button
          type="button"
          className={
            isActive("/hr/employees")
              ? "hr-nav-item active"
              : "hr-nav-item"
          }
          onClick={() =>
            navigate("/hr/employees")
          }
        >
          <span className="hr-nav-icon">
            👥
          </span>

          <span>
            Employees
          </span>
        </button>


        {/* Attendance */}
        <button
          type="button"
          className={
            isActive("/hr/attendance")
              ? "hr-nav-item active"
              : "hr-nav-item"
          }
          onClick={() =>
            navigate("/hr/attendance")
          }
        >
          <span className="hr-nav-icon">
            🕒
          </span>

          <span>
            Attendance
          </span>
        </button>


        {/* Leave */}
        <button
          type="button"
          className={
            isActive("/hr/leave")
              ? "hr-nav-item active"
              : "hr-nav-item"
          }
          onClick={() =>
            navigate("/hr/leave")
          }
        >
          <span className="hr-nav-icon">
            📅
          </span>

          <span>
            Leave Approval
          </span>
        </button>


        {/* Payroll */}
        <button
          type="button"
          className={
            isActive("/hr/payroll")
              ? "hr-nav-item active"
              : "hr-nav-item"
          }
          onClick={() =>
            navigate("/hr/payroll")
          }
        >
          <span className="hr-nav-icon">
            💳
          </span>

          <span>
            Payroll
          </span>
        </button>


        {/* Documents */}
        <button
          type="button"
          className={
            isActive("/hr/documents")
              ? "hr-nav-item active"
              : "hr-nav-item"
          }
          onClick={() =>
            navigate("/hr/documents")
          }
        >
          <span className="hr-nav-icon">
            📄
          </span>

          <span>
            Documents
          </span>
        </button>


        {/* Organization */}
        <button
          type="button"
          className={
            isActive("/hr/organization")
              ? "hr-nav-item active"
              : "hr-nav-item"
          }
          onClick={() =>
            navigate("/hr/organization")
          }
        >
          <span className="hr-nav-icon">
            👥
          </span>

          <span>
            Organization
          </span>
        </button>


        {/* Company Assistant */}
        <button
          type="button"
          className={
            isActive("/hr/assistant")
              ? "hr-nav-item active"
              : "hr-nav-item"
          }
          onClick={() =>
            navigate("/hr/assistant")
          }
        >
          <span className="hr-nav-icon">
            🤖
          </span>

          <span>
            Company Assistant
          </span>
        </button>

      </nav>


      {/* Bottom */}
      <div className="hr-sidebar-bottom">

        <div className="hr-user-card" title={`${displayName} (${displayRole})`}>

          <div className="hr-user-avatar">
            {avatarText}
          </div>

          <div className="hr-user-info">

            <strong>
              {displayName}
            </strong>

            <span>
              {displayRole}
            </span>

          </div>

        </div>


        <button
          type="button"
          className="hr-logout-button"
          onClick={handleLogout}
        >
          <span className="hr-logout-icon">
            ↪
          </span>

          <span>
            Logout
          </span>
        </button>

      </div>

    </aside>
  );
}

export default HRSidebar;
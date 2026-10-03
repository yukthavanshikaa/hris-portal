import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import API_URL from "../config";
import "../App.css";

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
  if (role) {
    return role.slice(0, 2).toUpperCase();
  }
  return "EM";
}

function Dashboard() {
  const [user, setUser] = useState(() => getStoredUser());

  useEffect(() => {
    let ignore = false;

    async function syncUser() {
      try {
        const response = await axios.get(`${API_URL}/api/auth/me`, {
          withCredentials: true,
        });

        if (!ignore && response.data?.user) {
          setUser(response.data.user);
          sessionStorage.setItem("hrisUser", JSON.stringify(response.data.user));
          sessionStorage.setItem("hrisLoggedIn", "true");
        }
      } catch (err) {
        console.error("Failed to sync employee profile:", err);
      }
    }

    syncUser();

    return () => {
      ignore = true;
    };
  }, []);

  const emp = user?.employee;
  const firstName = emp?.firstName?.trim() || "";
  const lastName = emp?.lastName?.trim() || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const emailPrefix = user?.email ? user.email.split("@")[0] : "";

  const displayName = fullName || emailPrefix || "Employee";
  const displayRole =
    emp?.designation ||
    (user?.role === "ADMIN"
      ? "System Administrator"
      : user?.role === "HR"
      ? "HR Administrator"
      : "Employee Portal");

  const avatarText = getAvatarText(firstName, lastName, emailPrefix, user?.role);

  const portalAccessTitle =
    user?.role === "ADMIN"
      ? "System Administrator"
      : user?.role === "HR"
      ? "HR Administrator"
      : "Employee";

  const portalAccessDesc = emp?.department
    ? `${emp.department} Department`
    : "Standard employee access";

  return (
    <div className="dashboard-page">
      <header className="topbar">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back to your employee portal.</p>
        </div>

        <div className="profile" title={`${displayName} (${displayRole})`}>
          <div className="profile-avatar">{avatarText}</div>
          <div>
            <strong>{displayName}</strong>
            <span>{displayRole}</span>
          </div>
        </div>
      </header>

      <section className="dashboard-content">
        <div className="welcome-card">
          <div>
            <span className="welcome-label">WELCOME BACK</span>
            <h2>Manage your work life in one place.</h2>
            <p>
              Access attendance, leave, payroll and employee documents
              from your HRIS portal.
            </p>
          </div>

          <div className="welcome-icon">H</div>
        </div>

        <div className="section-heading">
          <div>
            <h2>Employee Services</h2>
            <p>Quick access to your HR information.</p>
          </div>
        </div>

        <div className="service-grid">
          <Link to="/attendance" className="service-card">
            <div className="service-icon attendance-icon">◷</div>
            <h3>Attendance</h3>
            <p>View your attendance and daily work records.</p>
            <span className="service-link">View Attendance →</span>
          </Link>

          <Link to="/leave" className="service-card">
            <div className="service-icon leave-icon">▣</div>
            <h3>Leave Management</h3>
            <p>Check your balance and submit leave requests.</p>
            <span className="service-link">Manage Leave →</span>
          </Link>

          <Link to="/payroll" className="service-card">
            <div className="service-icon payroll-icon">₹</div>
            <h3>Payroll</h3>
            <p>View salary details and payroll information.</p>
            <span className="service-link">View Payroll →</span>
          </Link>

          <Link to="/documents" className="service-card">
            <div className="service-icon documents-icon">▤</div>
            <h3>Documents</h3>
            <p>Submit documents and check verification status.</p>
            <span className="service-link">View Documents →</span>
          </Link>

          <Link to="/organization" className="service-card">
            <div
              className="service-icon"
              style={{ background: "#e0e7ff", color: "#3730a3" }}
            >
              👥
            </div>
            <h3>Organization</h3>
            <p>Explore reporting structure and employee directory.</p>
            <span className="service-link">View Hierarchy →</span>
          </Link>

          <Link to="/assistant" className="service-card">
            <div
              className="service-icon"
              style={{ background: "#e0f2fe", color: "#0369a1" }}
            >
              🤖
            </div>
            <h3>Company Assistant</h3>
            <p>Instant answers to policy, leave, and company questions.</p>
            <span className="service-link">Chat with Assistant →</span>
          </Link>
        </div>

        <div className="dashboard-info">
          <div className="info-card">
            <span className="info-label">EMPLOYEE STATUS</span>
            <div className="status-row">
              <span className="status-dot"></span>
              Active
            </div>
          </div>

          <div className="info-card">
            <span className="info-label">PORTAL ACCESS</span>
            <strong>{portalAccessTitle}</strong>
            <p>{portalAccessDesc}</p>
          </div>

          <div className="info-card">
            <span className="info-label">SYSTEM</span>
            <strong>HRIS Portal</strong>
            <p>All services available</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
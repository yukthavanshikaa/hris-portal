import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_URL from "../config";
import "./HRDashboard.css";

function formatDate(dateValue) {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return "₹0";
  }
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

function HRDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [employees, setEmployees] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState({
    totalRecords: 0,
    presentCount: 0,
    lateCount: 0,
    halfDayCount: 0,
    absentCount: 0,
    leaveCount: 0,
  });
  const [payrollSummary, setPayrollSummary] = useState({
    totalNet: 0,
    totalEmployeesPaid: 0,
    hasData: false
  });

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const currentMonth = String(new Date().getMonth() + 1);
      const currentYear = String(new Date().getFullYear());

      const [empRes, leaveRes, docRes, attRes, payRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/employees`, { withCredentials: true }),
        axios.get(`${API_URL}/api/admin/leave`, { withCredentials: true }),
        axios.get(`${API_URL}/api/admin/documents`, { withCredentials: true }),
        axios
          .get(`${API_URL}/api/admin/attendance`, { withCredentials: true })
          .catch((attErr) => {
            console.error("LOAD ATTENDANCE ERROR:", attErr);
            return { data: null };
          }),
        axios
          .get(`${API_URL}/api/admin/payroll`, {
            params: { month: currentMonth, year: currentYear },
            withCredentials: true
          })
          .catch((payErr) => {
            console.error("LOAD PAYROLL SUMMARY ERROR:", payErr);
            return { data: null };
          }),
      ]);

      setEmployees(
        Array.isArray(empRes.data)
          ? empRes.data
          : empRes.data?.employees || []
      );
      setLeaveRequests(Array.isArray(leaveRes.data) ? leaveRes.data : []);
      setDocuments(Array.isArray(docRes.data) ? docRes.data : []);

      if (attRes?.data) {
        const summary = attRes.data.summary || attRes.data;
        setTodayAttendance({
          totalRecords: Number(summary.totalRecords) || 0,
          presentCount: Number(summary.presentCount) || 0,
          lateCount: Number(summary.lateCount) || 0,
          halfDayCount: Number(summary.halfDayCount) || 0,
          absentCount: Number(summary.absentCount) || 0,
          leaveCount: Number(summary.leaveCount) || 0,
        });
      } else {
        setTodayAttendance({
          totalRecords: 0,
          presentCount: 0,
          lateCount: 0,
          halfDayCount: 0,
          absentCount: 0,
          leaveCount: 0,
        });
      }

      if (payRes?.data?.summary) {
        const paySummary = payRes.data.summary;
        setPayrollSummary({
          totalNet: Number(paySummary.totalNet) || 0,
          totalEmployeesPaid: Number(paySummary.totalEmployeesPaid) || 0,
          hasData: true
        });
      } else {
        setPayrollSummary({
          totalNet: 0,
          totalEmployeesPaid: 0,
          hasData: false
        });
      }
    } catch (err) {
      console.error("LOAD DASHBOARD ERROR:", err);
      if (err.response?.status === 401) {
        navigate("/login");
        return;
      }
      setError(
        err.response?.data?.message || "Failed to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function fetchInitialData() {
      try {
        const currentMonth = String(new Date().getMonth() + 1);
        const currentYear = String(new Date().getFullYear());

        const [empRes, leaveRes, docRes, attRes, payRes] = await Promise.all([
          axios.get(`${API_URL}/api/admin/employees`, { withCredentials: true }),
          axios.get(`${API_URL}/api/admin/leave`, { withCredentials: true }),
          axios.get(`${API_URL}/api/admin/documents`, { withCredentials: true }),
          axios
            .get(`${API_URL}/api/admin/attendance`, { withCredentials: true })
            .catch((attErr) => {
              console.error("LOAD ATTENDANCE ERROR:", attErr);
              return { data: null };
            }),
          axios
            .get(`${API_URL}/api/admin/payroll`, {
              params: { month: currentMonth, year: currentYear },
              withCredentials: true
            })
            .catch((payErr) => {
              console.error("LOAD PAYROLL SUMMARY ERROR:", payErr);
              return { data: null };
            }),
        ]);

        if (!ignore) {
          setEmployees(
            Array.isArray(empRes.data)
              ? empRes.data
              : empRes.data?.employees || []
          );
          setLeaveRequests(Array.isArray(leaveRes.data) ? leaveRes.data : []);
          setDocuments(Array.isArray(docRes.data) ? docRes.data : []);

          if (attRes?.data) {
            const summary = attRes.data.summary || attRes.data;
            setTodayAttendance({
              totalRecords: Number(summary.totalRecords) || 0,
              presentCount: Number(summary.presentCount) || 0,
              lateCount: Number(summary.lateCount) || 0,
              halfDayCount: Number(summary.halfDayCount) || 0,
              absentCount: Number(summary.absentCount) || 0,
              leaveCount: Number(summary.leaveCount) || 0,
            });
          } else {
            setTodayAttendance({
              totalRecords: 0,
              presentCount: 0,
              lateCount: 0,
              halfDayCount: 0,
              absentCount: 0,
              leaveCount: 0,
            });
          }

          if (payRes?.data?.summary) {
            const paySummary = payRes.data.summary;
            setPayrollSummary({
              totalNet: Number(paySummary.totalNet) || 0,
              totalEmployeesPaid: Number(paySummary.totalEmployeesPaid) || 0,
              hasData: true
            });
          } else {
            setPayrollSummary({
              totalNet: 0,
              totalEmployeesPaid: 0,
              hasData: false
            });
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error("LOAD DASHBOARD ERROR:", err);
          if (err.response?.status === 401) {
            navigate("/login");
            return;
          }
          setError(
            err.response?.data?.message || "Failed to load dashboard data."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchInitialData();

    return () => {
      ignore = true;
    };
  }, [navigate]);

  const totalEmployees = employees.length;
  const pendingLeaves = leaveRequests.filter((l) => l.status === "PENDING");
  const approvedLeaves = leaveRequests.filter((l) => l.status === "APPROVED");
  const pendingDocs = documents.filter((d) => d.status === "PENDING");
  const verifiedDocs = documents.filter((d) => d.status === "VERIFIED");

  return (
    <div className="hr-dashboard-page">
      {/* HEADER */}
      <div className="hr-dashboard-header">
        <div>
          <h1>HR Dashboard</h1>
          <p>Welcome to the Human Resources Overview & Operations Portal.</p>
        </div>

        <button
          className="primary-button"
          onClick={loadDashboardData}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div className="hr-dashboard-error">{error}</div>}

      {/* ACTION REQUIRED BANNER (if any pending) */}
      {(pendingLeaves.length > 0 || pendingDocs.length > 0) && (
        <div className="hr-action-alert">
          <div className="alert-icon">⚠️</div>
          <div className="alert-body">
            <strong>Action Required</strong>
            <span>
              You have {pendingLeaves.length} pending leave{" "}
              {pendingLeaves.length === 1 ? "request" : "requests"} and{" "}
              {pendingDocs.length} pending document{" "}
              {pendingDocs.length === 1 ? "submission" : "submissions"} awaiting
              review.
            </span>
          </div>
        </div>
      )}

      {/* METRIC / STAT CARDS */}
      <div className="hr-dashboard-stats">
        <div
          className="hr-stat-card clickable"
          onClick={() => navigate("/hr/employees")}
        >
          <div className="stat-header">
            <span className="stat-label">Total Employees</span>
            <span className="stat-icon">👥</span>
          </div>
          <strong className="stat-value">{totalEmployees}</strong>
          <span className="stat-meta">Active workforce records</span>
        </div>

        <div
          className="hr-stat-card clickable"
          onClick={() => navigate("/hr/leave")}
        >
          <div className="stat-header">
            <span className="stat-label">Pending Leaves</span>
            <span className="stat-icon">📅</span>
          </div>
          <strong className="stat-value pending-value">
            {pendingLeaves.length}
          </strong>
          <span className="stat-meta">
            {approvedLeaves.length} approved to date
          </span>
        </div>

        <div
          className="hr-stat-card clickable"
          onClick={() => navigate("/hr/documents")}
        >
          <div className="stat-header">
            <span className="stat-label">Pending Documents</span>
            <span className="stat-icon">📄</span>
          </div>
          <strong className="stat-value pending-value">
            {pendingDocs.length}
          </strong>
          <span className="stat-meta">
            {verifiedDocs.length} verified to date
          </span>
        </div>

        <div
          className="hr-stat-card clickable"
          onClick={() => navigate("/hr/attendance")}
        >
          <div className="stat-header">
            <span className="stat-label">Today's Attendance</span>
            <span className="stat-icon">🕒</span>
          </div>
          <strong className="stat-value attendance-value">
            {todayAttendance.totalRecords === 0
              ? "0 Present"
              : `${todayAttendance.presentCount} Present`}
          </strong>
          <span className="stat-meta">
            {todayAttendance.totalRecords === 0
              ? "No check-ins recorded yet"
              : `${todayAttendance.lateCount} late · ${todayAttendance.absentCount} absent`}
          </span>
        </div>

        <div
          className="hr-stat-card clickable"
          onClick={() => navigate("/hr/payroll")}
        >
          <div className="stat-header">
            <span className="stat-label">Payroll (Net)</span>
            <span className="stat-icon">💳</span>
          </div>
          <strong className="stat-value payroll-value">
            {formatCurrency(payrollSummary.totalNet)}
          </strong>
          <span className="stat-meta">
            {payrollSummary.totalEmployeesPaid} employees paid
          </span>
        </div>
      </div>

      {/* MODULE SERVICES GRID */}
      <div className="hr-section-title">
        <h2>HR Management Modules</h2>
        <p>Quick access to operational tools.</p>
      </div>

      <div className="hr-modules-grid">
        <div
          className="hr-module-card"
          onClick={() => navigate("/hr/employees")}
        >
          <div className="module-icon employee-icon">👥</div>
          <h3>Employee Directory</h3>
          <p>
            Browse full staff directory, add new team members, and update personal & employment details.
          </p>
          <span className="module-link">Open Directory →</span>
        </div>

        <div
          className="hr-module-card"
          onClick={() => navigate("/hr/attendance")}
        >
          <div className="module-icon attendance-icon">🕒</div>
          <h3>Attendance Management</h3>
          <p>
            Inspect daily clock-ins, review late check-ins, and regularize attendance records.
          </p>
          <span className="module-link">Manage Attendance →</span>
        </div>

        <div
          className="hr-module-card"
          onClick={() => navigate("/hr/leave")}
        >
          <div className="module-icon leave-icon">📅</div>
          <h3>Leave Approvals</h3>
          <p>
            Review employee leave requests, inspect time spans and reasons, and approve or reject submissions.
          </p>
          <span className="module-link">Manage Leaves →</span>
        </div>

        <div
          className="hr-module-card"
          onClick={() => navigate("/hr/documents")}
        >
          <div className="module-icon doc-icon">📄</div>
          <h3>Document Verification</h3>
          <p>
            Inspect uploaded identification (PAN, Aadhaar) and academic credentials with verification controls.
          </p>
          <span className="module-link">Verify Documents →</span>
        </div>

        <div
          className="hr-module-card"
          onClick={() => navigate("/hr/payroll")}
        >
          <div className="module-icon payroll-icon">💳</div>
          <h3>Payroll Management</h3>
          <p>
            Review company payroll disbursements, track salary components, and inspect itemized payslips.
          </p>
          <span className="module-link">Manage Payroll →</span>
        </div>

        <div
          className="hr-module-card"
          onClick={() => navigate("/hr/organization")}
        >
          <div className="module-icon org-icon">🏛️</div>
          <h3>Organization Hierarchy</h3>
          <p>
            Explore interactive reporting structures, department breakdowns, and organizational leadership.
          </p>
          <span className="module-link">View Hierarchy →</span>
        </div>
      </div>

      {/* RECENT EMPLOYEES PREVIEW */}
      <div className="hr-recent-section">
        <div className="section-header-row">
          <div>
            <h2>Staff Directory Snapshot</h2>
            <p>Recent employee accounts registered in the portal.</p>
          </div>
          <button
            className="secondary-button"
            onClick={() => navigate("/hr/employees")}
          >
            View All ({totalEmployees})
          </button>
        </div>

        <div className="hr-recent-table-card">
          {loading ? (
            <div className="hr-table-placeholder">
              Loading employee snapshot...
            </div>
          ) : employees.length === 0 ? (
            <div className="hr-table-placeholder">No employees found.</div>
          ) : (
            <div className="table-wrapper">
              <table className="hr-snapshot-table">
                <thead>
                  <tr>
                    <th>EMPLOYEE</th>
                    <th>EMPLOYEE CODE</th>
                    <th>DEPARTMENT</th>
                    <th>DESIGNATION</th>
                    <th>JOINING DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.slice(0, 5).map((emp) => (
                    <tr
                      key={emp.id}
                      onClick={() => navigate("/hr/employees")}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <div className="emp-info-cell">
                          <strong>
                            {emp.firstName} {emp.lastName}
                          </strong>
                          <small>{emp.email || "-"}</small>
                        </div>
                      </td>
                      <td>
                        <span className="code-badge">
                          {emp.employeeCode || "-"}
                        </span>
                      </td>
                      <td>{emp.department || "-"}</td>
                      <td>{emp.designation || "-"}</td>
                      <td>{formatDate(emp.dateOfJoining)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HRDashboard;
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./HRLeaveApproval.css";
import API_URL from "../config";

const API = API_URL;

const DEFAULT_DEPARTMENTS = [
  "ALL",
  "Engineering",
  "Technology",
  "Human Resources",
  "Finance",
  "Product",
  "Sales",
  "Marketing",
  "Executive",
  "Operations",
];

const LEAVE_TYPE_OPTIONS = [
  { value: "ALL", label: "All Leave Types" },
  { value: "CASUAL", label: "Casual Leave" },
  { value: "SICK", label: "Sick Leave" },
  { value: "EARNED", label: "Earned Leave" },
  { value: "OTHER", label: "Other Leave" },
];

function formatDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  return (
    Math.floor(
      (end.getTime() - start.getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1
  );
}

function getEmployeeName(employee) {
  if (!employee) return "Unknown Employee";

  return (
    `${employee.firstName || ""} ${
      employee.lastName || ""
    }`.trim() || "Unknown Employee"
  );
}

function getLeaveBalanceDisplay(request) {
  if (!request) return "-";
  if (request.type === "OTHER") {
    return "N/A";
  }

  const balance = request.employee?.leaveBalance;
  if (!balance) {
    return "0 days";
  }

  let val = null;
  if (request.type === "CASUAL") {
    val = balance.casualLeave;
  } else if (request.type === "SICK") {
    val = balance.sickLeave;
  } else if (request.type === "EARNED") {
    val = balance.earnedLeave;
  }

  if (val === null || val === undefined) {
    return "0 days";
  }

  return `${val} ${val === 1 ? "day" : "days"}`;
}

export default function HRLeaveApproval() {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [department, setDepartment] = useState("ALL");
  const [leaveType, setLeaveType] = useState("ALL");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  async function loadRequests() {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API}/api/admin/leave`,
        {
          withCredentials: true,
        }
      );

      setRequests(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (err) {
      console.error(
        "Failed to load leave requests:",
        err
      );

      const message =
        err.response?.data?.message ||
        "Failed to load leave requests.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function fetchInitialData() {
      try {
        const response = await axios.get(`${API}/api/admin/leave`, {
          withCredentials: true,
        });

        if (!ignore) {
          setRequests(
            Array.isArray(response.data) ? response.data : []
          );
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to load leave requests:", err);
          const message =
            err.response?.data?.message ||
            "Failed to load leave requests.";
          setError(message);
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
  }, []);

  const departmentOptions = useMemo(() => {
    const depts = new Set(DEFAULT_DEPARTMENTS.filter((d) => d !== "ALL"));
    requests.forEach((r) => {
      if (r.employee?.department && r.employee.department.trim()) {
        depts.add(r.employee.department.trim());
      }
    });
    return ["ALL", ...Array.from(depts)];
  }, [requests]);

  async function approveLeave(id) {
    try {
      setProcessingId(id);
      setError("");

      await axios.patch(
        `${API}/api/admin/leave/${id}/approve`,
        {},
        {
          withCredentials: true,
        }
      );

      await loadRequests();
    } catch (err) {
      console.error("Approve error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to approve leave request."
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function rejectLeave(id) {
    if (!rejectReason.trim()) {
      setError(
        "Please provide a reason for rejecting the request."
      );
      return;
    }

    try {
      setProcessingId(id);
      setError("");

      await axios.patch(
        `${API}/api/admin/leave/${id}/reject`,
        {
          reason: rejectReason.trim(),
        },
        {
          withCredentials: true,
        }
      );

      setRejectingId(null);
      setRejectReason("");

      await loadRequests();
    } catch (err) {
      console.error("Reject error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to reject leave request."
      );
    } finally {
      setProcessingId(null);
    }
  }

  const stats = useMemo(() => {
    return {
      total: requests.length,

      pending: requests.filter(
        (request) => request.status === "PENDING"
      ).length,

      approved: requests.filter(
        (request) => request.status === "APPROVED"
      ).length,

      rejected: requests.filter(
        (request) => request.status === "REJECTED"
      ).length,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();

    return requests.filter((request) => {
      // Status filter
      if (statusFilter !== "ALL" && request.status !== statusFilter) {
        return false;
      }

      // Leave type filter
      if (leaveType !== "ALL" && request.type !== leaveType) {
        return false;
      }

      // Department filter
      if (department !== "ALL") {
        const empDept = request.employee?.department?.trim().toLowerCase();
        if (empDept !== department.trim().toLowerCase()) {
          return false;
        }
      }

      // Search filter
      if (q) {
        const name = getEmployeeName(request.employee).toLowerCase();
        const email = (request.employee?.email || "").toLowerCase();
        const code = (request.employee?.employeeCode || "").toLowerCase();

        if (!name.includes(q) && !email.includes(q) && !code.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [requests, statusFilter, leaveType, department, search]);

  return (
    <div className="hr-page">
      {/* HEADER */}
      <div className="hr-page-header">
        <div>
          <h1>Leave Approval</h1>

          <p>
            Review employee leave requests and approve or
            reject them.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={loadRequests}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      {/* STATISTICS */}
      <div className="stats-grid">
        <div className="stat-card">
          <span>Total Requests</span>
          <strong>{stats.total}</strong>
        </div>

        <div className="stat-card">
          <span>Pending</span>
          <strong className="pending-number">
            {stats.pending}
          </strong>
        </div>

        <div className="stat-card">
          <span>Approved</span>
          <strong className="approved-number">
            {stats.approved}
          </strong>
        </div>

        <div className="stat-card">
          <span>Rejected</span>
          <strong className="rejected-number">
            {stats.rejected}
          </strong>
        </div>
      </div>

      {/* FILTERS TOOLBAR */}
      <div className="leave-filter-bar">
        {/* Search */}
        <div className="filter-item search-filter-item">
          <label htmlFor="leave-search">Search Employee</label>
          <input
            id="leave-search"
            type="text"
            placeholder="Search by name, email, or employee code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Department Filter */}
        <div className="filter-item">
          <label htmlFor="leave-department">Department</label>
          <select
            id="leave-department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept}>
                {dept === "ALL" ? "All Departments" : dept}
              </option>
            ))}
          </select>
        </div>

        {/* Leave Type Filter */}
        <div className="filter-item">
          <label htmlFor="leave-type">Leave Type</label>
          <select
            id="leave-type"
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
          >
            {LEAVE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* STATUS TABS */}
      <div className="filter-row">
        {[
          "ALL",
          "PENDING",
          "APPROVED",
          "REJECTED",
        ].map((item) => (
          <button
            key={item}
            className={
              statusFilter === item
                ? "filter-button active"
                : "filter-button"
            }
            onClick={() => setStatusFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div className="leave-table-card">
        {loading ? (
          <div className="empty-state">
            <div className="loading-spinner"></div>
            <p>Loading leave requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No leave requests found</h3>
            <p>
              There are no requests matching the selected filters.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="leave-table">
              <thead>
                <tr>
                  <th>EMPLOYEE</th>
                  <th>LEAVE TYPE</th>
                  <th>BALANCE</th>
                  <th>DATES</th>
                  <th>DAYS</th>
                  <th>REASON</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>

              <tbody>
                {filteredRequests.map((request) => {
                  const days = getDays(
                    request.startDate,
                    request.endDate
                  );

                  return (
                    <tr key={request.id}>
                      {/* EMPLOYEE */}
                      <td>
                        <div className="employee-cell">
                          <strong>
                            {getEmployeeName(
                              request.employee
                            )}
                          </strong>

                          <small>
                            {request.employee?.email || "-"}
                          </small>

                          <div className="employee-meta-row">
                            <span className="employee-code">
                              {request.employee
                                ?.employeeCode || "-"}
                            </span>
                            {request.employee?.department && (
                              <span className="employee-dept-badge">
                                {request.employee.department}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* LEAVE TYPE */}
                      <td>
                        <span className="leave-type">
                          {request.type}
                        </span>
                      </td>

                      {/* BALANCE */}
                      <td>
                        <span
                          className={`balance-badge ${
                            request.type === "OTHER" ? "na" : ""
                          }`}
                        >
                          {getLeaveBalanceDisplay(request)}
                        </span>
                      </td>

                      {/* DATES */}
                      <td>
                        <div className="date-cell">
                          <span>
                            {formatDate(
                              request.startDate
                            )}
                          </span>

                          <small>to</small>

                          <span>
                            {formatDate(
                              request.endDate
                            )}
                          </span>
                        </div>
                      </td>

                      {/* DAYS */}
                      <td>
                        <span className="days-badge">
                          {days}{" "}
                          {days === 1
                            ? "day"
                            : "days"}
                        </span>
                      </td>

                      {/* REASON */}
                      <td>
                        <div className="reason-cell">
                          {request.reason || "-"}
                        </div>
                      </td>

                      {/* STATUS */}
                      <td>
                        <span
                          className={`status-badge ${
                            request.status
                              ?.toLowerCase() || ""
                          }`}
                        >
                          {request.status}
                        </span>
                      </td>

                      {/* ACTION */}
                      <td>
                        {request.status === "PENDING" ? (
                          <div className="action-buttons">
                            <button
                              className="approve-button"
                              disabled={
                                processingId ===
                                request.id
                              }
                              onClick={() =>
                                approveLeave(
                                  request.id
                                )
                              }
                            >
                              {processingId === request.id
                                ? "..."
                                : "Approve"}
                            </button>

                            <button
                              className="reject-button"
                              disabled={
                                processingId ===
                                request.id
                              }
                              onClick={() => {
                                setRejectingId(
                                  request.id
                                );
                                setRejectReason("");
                                setError("");
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="processed-text">
                            Processed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REJECT MODAL */}
      {rejectingId && (
        <div
          className="modal-overlay"
          onClick={(event) => {
            if (
              event.target === event.currentTarget &&
              processingId !== rejectingId
            ) {
              setRejectingId(null);
              setRejectReason("");
            }
          }}
        >
          <div className="reject-modal">
            <div className="modal-icon">!</div>

            <h2>Reject Leave Request</h2>

            <p>
              Please provide a reason for rejecting this
              request.
            </p>

            <textarea
              value={rejectReason}
              onChange={(event) =>
                setRejectReason(event.target.value)
              }
              placeholder="Enter rejection reason..."
              rows="5"
              autoFocus
            />

            <div className="modal-actions">
              <button
                className="cancel-button"
                disabled={processingId === rejectingId}
                onClick={() => {
                  setRejectingId(null);
                  setRejectReason("");
                }}
              >
                Cancel
              </button>

              <button
                className="reject-confirm-button"
                disabled={
                  processingId === rejectingId ||
                  !rejectReason.trim()
                }
                onClick={() =>
                  rejectLeave(rejectingId)
                }
              >
                {processingId === rejectingId
                  ? "Rejecting..."
                  : "Reject Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
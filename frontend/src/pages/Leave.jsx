import { useEffect, useState } from "react";
import axios from "axios";
import API_URL from "../config";
import "./Leave.css";

const API = API_URL;

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function calculateDays(startDate, endDate) {
  if (!startDate || !endDate) {
    return 0;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  const difference = end.getTime() - start.getTime();

  return Math.floor(difference / (1000 * 60 * 60 * 24)) + 1;
}

function getRequestsFromResponse(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.requests)) {
    return data.requests;
  }

  if (Array.isArray(data?.leaveRequests)) {
    return data.leaveRequests;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

function getBalanceFromResponse(data) {
  if (!data) {
    return null;
  }

  if (data.balance) {
    return data.balance;
  }

  if (data.data && !Array.isArray(data.data)) {
    return data.data;
  }

  return data;
}

function Leave() {
  const [balance, setBalance] = useState(null);
  const [requests, setRequests] = useState([]);

  const [form, setForm] = useState({
    type: "CASUAL",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadLeaveData = async () => {
    try {
      setLoading(true);
      setError("");

      const balanceResponse = await axios.get(
        `${API}/api/leave/balance`,
        {
          withCredentials: true,
        }
      );

      const requestsResponse = await axios.get(
        `${API}/api/leave`,
        {
          withCredentials: true,
        }
      );

      setBalance(
        getBalanceFromResponse(balanceResponse.data)
      );

      setRequests(
        getRequestsFromResponse(requestsResponse.data)
      );
    } catch (err) {
      console.error("Leave data error:", err);

      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
      } else {
        setError(
          err.response?.data?.message ||
            "Unable to load leave information."
        );
      }

      setBalance(null);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaveData();
  }, []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (
      !form.type ||
      !form.startDate ||
      !form.endDate ||
      !form.reason.trim()
    ) {
      setError("Please complete all leave details.");
      return;
    }

    if (form.endDate < form.startDate) {
      setError("End date cannot be before start date.");
      return;
    }

    const numberOfDays = calculateDays(
      form.startDate,
      form.endDate
    );

    if (numberOfDays <= 0) {
      setError("Please select valid leave dates.");
      return;
    }

    try {
      setSubmitting(true);

      await axios.post(
        `${API}/api/leave`,
        {
          type: form.type,
          startDate: form.startDate,
          endDate: form.endDate,
          reason: form.reason.trim(),
        },
        {
          withCredentials: true,
        }
      );

      setMessage(
        "Leave request submitted successfully."
      );

      setForm({
        type: "CASUAL",
        startDate: "",
        endDate: "",
        reason: "",
      });

      await loadLeaveData();
    } catch (err) {
      console.error("Leave submission error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to submit leave request."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getCasualLeave = () => {
    if (!balance) return 0;

    return (
      balance.casualLeave ??
      balance.casual ??
      balance.CASUAL ??
      0
    );
  };

  const getSickLeave = () => {
    if (!balance) return 0;

    return (
      balance.sickLeave ??
      balance.sick ??
      balance.SICK ??
      0
    );
  };

  const getEarnedLeave = () => {
    if (!balance) return 0;

    return (
      balance.earnedLeave ??
      balance.earned ??
      balance.EARNED ??
      0
    );
  };

  if (loading) {
    return (
      <div className="leave-page">
        <div className="leave-loading">
          <div className="loading-spinner"></div>
          <p>Loading leave information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leave-page">
      <div className="leave-header">
        <div>
          <h1>Leave Management</h1>
          <p>
            View your leave balance and apply for leave.
          </p>
        </div>

        <button
          type="button"
          className="leave-refresh-button"
          onClick={loadLeaveData}
        >
          Refresh
        </button>
      </div>

      {message && (
        <div className="leave-alert leave-alert-success">
          <span className="alert-icon">✓</span>
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="leave-alert leave-alert-error">
          <span className="alert-icon">!</span>
          <span>{error}</span>
        </div>
      )}

      <section className="leave-section">
        <div className="section-heading">
          <h2>Current Leave Balance</h2>
          <p>
            Your available leave balance for the current year.
          </p>
        </div>

        <div className="leave-balance-grid">
          <div className="balance-card">
            <div className="balance-icon casual-icon">
              📅
            </div>

            <div className="balance-content">
              <span className="balance-label">
                Casual Leave
              </span>

              <strong>{getCasualLeave()}</strong>

              <small>days available</small>
            </div>
          </div>

          <div className="balance-card">
            <div className="balance-icon sick-icon">
              🏥
            </div>

            <div className="balance-content">
              <span className="balance-label">
                Sick Leave
              </span>

              <strong>{getSickLeave()}</strong>

              <small>days available</small>
            </div>
          </div>

          <div className="balance-card">
            <div className="balance-icon earned-icon">
              🌿
            </div>

            <div className="balance-content">
              <span className="balance-label">
                Earned Leave
              </span>

              <strong>{getEarnedLeave()}</strong>

              <small>days available</small>
            </div>
          </div>
        </div>
      </section>

      <section className="leave-section">
        <div className="section-heading">
          <h2>Apply for Leave</h2>
          <p>
            Submit a leave request for HR approval.
          </p>
        </div>

        <div className="leave-form-card">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="type">
                  Leave Type
                </label>

                <select
                  id="type"
                  name="type"
                  value={form.type}
                  onChange={handleInputChange}
                >
                  <option value="CASUAL">
                    Casual Leave
                  </option>

                  <option value="SICK">
                    Sick Leave
                  </option>

                  <option value="EARNED">
                    Earned Leave
                  </option>

                  <option value="OTHER">
                    Other
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="startDate">
                  Start Date
                </label>

                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="endDate">
                  End Date
                </label>

                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group form-group-full">
                <label htmlFor="reason">
                  Reason
                </label>

                <textarea
                  id="reason"
                  name="reason"
                  value={form.reason}
                  onChange={handleInputChange}
                  placeholder="Enter the reason for your leave"
                  rows="4"
                />
              </div>
            </div>

            {form.startDate && form.endDate && (
              <div className="leave-days-preview">
                <span>Requested duration</span>

                <strong>
                  {calculateDays(
                    form.startDate,
                    form.endDate
                  )}{" "}
                  {calculateDays(
                    form.startDate,
                    form.endDate
                  ) === 1
                    ? "day"
                    : "days"}
                </strong>
              </div>
            )}

            <div className="form-footer">
              <span className="form-note">
                Leave requests require HR approval.
              </span>

              <button
                type="submit"
                className="submit-leave-button"
                disabled={submitting}
              >
                {submitting
                  ? "Submitting..."
                  : "Apply for Leave"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="leave-section">
        <div className="section-heading">
          <h2>Leave History</h2>
          <p>
            Track your previous and current leave requests.
          </p>
        </div>

        <div className="leave-history-card">
          {requests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                📋
              </div>

              <h3>No leave requests yet</h3>

              <p>
                Your submitted leave requests will
                appear here.
              </p>
            </div>
          ) : (
            <div className="leave-table-wrapper">
              <table className="leave-table">
                <thead>
                  <tr>
                    <th>Leave Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {requests.map((request) => {
                    const days = calculateDays(
                      request.startDate,
                      request.endDate
                    );

                    const status = String(
                      request.status || "PENDING"
                    ).toLowerCase();

                    return (
                      <tr key={request.id}>
                        <td>
                          <span className="leave-type">
                            {request.type || "-"}
                          </span>
                        </td>

                        <td>
                          {formatDate(
                            request.startDate
                          )}
                        </td>

                        <td>
                          {formatDate(
                            request.endDate
                          )}
                        </td>

                        <td>
                          <span className="days-badge">
                            {days}
                          </span>
                        </td>

                        <td className="reason-cell">
                          {request.reason || "-"}
                        </td>

                        <td>
                          <span
                            className={`status-badge status-${status}`}
                          >
                            {request.status ||
                              "PENDING"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Leave;
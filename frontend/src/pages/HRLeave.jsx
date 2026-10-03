import { useEffect, useState } from "react";
import axios from "axios";
import API_URL from "../config";

const API = API_URL;

function HRLeave() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API}/api/admin/leave`,
        {
          withCredentials: true,
        }
      );

      setRequests(response.data);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Failed to load leave requests."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const approveLeave = async (id) => {
    try {
      await axios.patch(
        `${API}/api/admin/leave/${id}/approve`,
        {},
        {
          withCredentials: true,
        }
      );

      await loadRequests();
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Failed to approve leave."
      );
    }
  };

  const rejectLeave = async (id) => {
    const reason = window.prompt(
      "Enter rejection reason:"
    );

    if (reason === null) return;

    try {
      await axios.patch(
        `${API}/api/admin/leave/${id}/reject`,
        {
          reason,
        },
        {
          withCredentials: true,
        }
      );

      await loadRequests();
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Failed to reject leave."
      );
    }
  };

  const filteredRequests =
    filter === "ALL"
      ? requests
      : requests.filter(
          (request) => request.status === filter
        );

  const total = requests.length;

  const pending = requests.filter(
    (r) => r.status === "PENDING"
  ).length;

  const approved = requests.filter(
    (r) => r.status === "APPROVED"
  ).length;

  const rejected = requests.filter(
    (r) => r.status === "REJECTED"
  ).length;

  const calculateDays = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const difference =
      endDate.getTime() - startDate.getTime();

    return (
      Math.floor(
        difference / (1000 * 60 * 60 * 24)
      ) + 1
    );
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  return (
    <div className="hr-page">
      <div className="hr-page-header">
        <div>
          <h1>Leave Approval</h1>
          <p>
            Review employee leave requests and
            approve or reject them.
          </p>
        </div>

        <button
          className="primary-dark-button"
          onClick={loadRequests}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <span>Total Requests</span>
          <strong>{total}</strong>
        </div>

        <div className="stat-card">
          <span>Pending</span>
          <strong className="pending-number">
            {pending}
          </strong>
        </div>

        <div className="stat-card">
          <span>Approved</span>
          <strong className="approved-number">
            {approved}
          </strong>
        </div>

        <div className="stat-card">
          <span>Rejected</span>
          <strong className="rejected-number">
            {rejected}
          </strong>
        </div>
      </div>

      <div className="filter-row">
        {["ALL", "PENDING", "APPROVED", "REJECTED"].map(
          (item) => (
            <button
              key={item}
              className={
                filter === item
                  ? "filter-button active"
                  : "filter-button"
              }
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          )
        )}
      </div>

      <div className="table-card">
        {loading ? (
          <div className="empty-state">
            Loading leave requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="empty-state">
            No leave requests found.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="hr-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <strong>
                        {request.employee?.firstName}{" "}
                        {request.employee?.lastName}
                      </strong>

                      <small>
                        {request.employee?.email}
                      </small>

                      <small>
                        {request.employee?.employeeCode}
                      </small>
                    </td>

                    <td>
                      <strong>
                        {request.type}
                      </strong>
                    </td>

                    <td>
                      {formatDate(request.startDate)}
                      <br />
                      <span className="date-to">
                        to
                      </span>
                      <br />
                      {formatDate(request.endDate)}
                    </td>

                    <td>
                      <span className="days-badge">
                        {calculateDays(
                          request.startDate,
                          request.endDate
                        )}{" "}
                        days
                      </span>
                    </td>

                    <td>
                      {request.reason || "-"}
                    </td>

                    <td>
                      <span
                        className={`status-badge ${request.status.toLowerCase()}`}
                      >
                        {request.status}
                      </span>
                    </td>

                    <td>
                      {request.status === "PENDING" ? (
                        <div className="action-buttons">
                          <button
                            className="approve-button"
                            onClick={() =>
                              approveLeave(request.id)
                            }
                          >
                            Approve
                          </button>

                          <button
                            className="reject-button"
                            onClick={() =>
                              rejectLeave(request.id)
                            }
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default HRLeave;
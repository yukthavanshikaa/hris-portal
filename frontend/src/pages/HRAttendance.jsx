import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_URL from "../config";
import "./HRAttendance.css";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "PRESENT", label: "Present" },
  { value: "LATE", label: "Late" },
  { value: "HALF_DAY", label: "Half Day" },
  { value: "ABSENT", label: "Absent" },
  { value: "LEAVE", label: "Leave" }
];

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
  "Operations"
];

function getTodayString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDate(dateValue) {
  if (!dateValue) return "-";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatTime(isoStr) {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

function toDatetimeLocal(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function HRAttendance() {
  const [selectedDate, setSelectedDate] = useState(() => getTodayString());
  const [department, setDepartment] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({
    totalRecords: 0,
    presentCount: 0,
    lateCount: 0,
    halfDayCount: 0,
    absentCount: 0,
    leaveCount: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Modal State for Regularization
  const [editingRecord, setEditingRecord] = useState(null);
  const [modalStatus, setModalStatus] = useState("PRESENT");
  const [modalCheckIn, setModalCheckIn] = useState("");
  const [modalCheckOut, setModalCheckOut] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const departmentOptions = useMemo(() => {
    const depts = new Set(DEFAULT_DEPARTMENTS.filter((d) => d !== "ALL"));
    records.forEach((r) => {
      if (r.department && r.department.trim()) {
        depts.add(r.department.trim());
      }
    });
    return ["ALL", ...Array.from(depts)];
  }, [records]);

  const fetchAttendance = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        setError("");

        const params = {
          date: selectedDate
        };
        if (department && department !== "ALL") {
          params.department = department;
        }
        if (status && status !== "ALL") {
          params.status = status;
        }
        if (search && search.trim()) {
          params.search = search.trim();
        }

        const response = await axios.get(`${API_URL}/api/admin/attendance`, {
          params,
          withCredentials: true
        });

        const data = response.data;
        setRecords(Array.isArray(data.records) ? data.records : []);
        if (data.summary) {
          setSummary(data.summary);
        } else {
          setSummary({
            totalRecords: data.totalRecords || 0,
            presentCount: data.presentCount || 0,
            lateCount: data.lateCount || 0,
            halfDayCount: data.halfDayCount || 0,
            absentCount: data.absentCount || 0,
            leaveCount: data.leaveCount || 0
          });
        }
      } catch (err) {
        console.error("Fetch attendance error:", err);
        setError(
          err.response?.data?.message ||
            "Unable to load attendance records for the selected filters."
        );
        setRecords([]);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [selectedDate, department, status, search]
  );

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        setLoading(true);
        setError("");

        const params = {
          date: selectedDate
        };
        if (department && department !== "ALL") {
          params.department = department;
        }
        if (status && status !== "ALL") {
          params.status = status;
        }
        if (search && search.trim()) {
          params.search = search.trim();
        }

        const response = await axios.get(`${API_URL}/api/admin/attendance`, {
          params,
          withCredentials: true
        });

        if (!ignore) {
          const data = response.data;
          setRecords(Array.isArray(data.records) ? data.records : []);
          if (data.summary) {
            setSummary(data.summary);
          } else {
            setSummary({
              totalRecords: data.totalRecords || 0,
              presentCount: data.presentCount || 0,
              lateCount: data.lateCount || 0,
              halfDayCount: data.halfDayCount || 0,
              absentCount: data.absentCount || 0,
              leaveCount: data.leaveCount || 0
            });
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error("Load attendance error:", err);
          setError(
            err.response?.data?.message ||
              "Unable to load attendance records for the selected filters."
          );
          setRecords([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [selectedDate, department, status, search]);

  const openRegularizeModal = (record) => {
    setEditingRecord(record);
    setModalStatus(record.status || "PRESENT");
    setModalCheckIn(toDatetimeLocal(record.checkIn));
    setModalCheckOut(toDatetimeLocal(record.checkOut));
    setModalError("");
  };

  const closeRegularizeModal = () => {
    setEditingRecord(null);
    setModalError("");
  };

  const handleSaveRegularization = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;

    try {
      setSaving(true);
      setModalError("");

      const payload = {
        status: modalStatus,
        checkIn: modalCheckIn ? new Date(modalCheckIn).toISOString() : null,
        checkOut: modalCheckOut ? new Date(modalCheckOut).toISOString() : null
      };

      await axios.patch(
        `${API_URL}/api/admin/attendance/${editingRecord.id}`,
        payload,
        {
          withCredentials: true
        }
      );

      setSuccessMessage(
        `Attendance for ${editingRecord.firstName} ${editingRecord.lastName} regularized successfully.`
      );
      closeRegularizeModal();
      await fetchAttendance(false);

      setTimeout(() => {
        setSuccessMessage("");
      }, 5000);
    } catch (err) {
      console.error("Regularization error:", err);
      setModalError(
        err.response?.data?.message || "Failed to update attendance record."
      );
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (recStatus) => {
    switch (recStatus) {
      case "PRESENT":
        return <span className="status-badge badge-present">Present</span>;
      case "LATE":
        return <span className="status-badge badge-late">Late</span>;
      case "HALF_DAY":
        return <span className="status-badge badge-halfday">Half Day</span>;
      case "ABSENT":
        return <span className="status-badge badge-absent">Absent</span>;
      case "LEAVE":
        return <span className="status-badge badge-leave">Leave</span>;
      default:
        return <span className="status-badge">{recStatus || "-"}</span>;
    }
  };

  return (
    <div className="hr-page hr-attendance-page">
      {/* HEADER */}
      <div className="hr-page-header">
        <div>
          <h1>Attendance Management</h1>
          <p>
            View daily employee attendance, filter records, and regularize
            working hours.
          </p>
        </div>

        <div className="hr-header-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => fetchAttendance(true)}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* SUCCESS BANNER */}
      {successMessage && (
        <div className="success-box">
          <span>✓ {successMessage}</span>
          <button
            type="button"
            className="banner-close"
            onClick={() => setSuccessMessage("")}
          >
            ✕
          </button>
        </div>
      )}

      {/* ERROR BANNER */}
      {error && <div className="error-box">{error}</div>}

      {/* SUMMARY CARDS */}
      <div className="stats-grid attendance-stats-grid">
        <div className="stat-card">
          <span>Total Records</span>
          <strong>{summary.totalRecords}</strong>
        </div>

        <div className="stat-card">
          <span>Present</span>
          <strong className="stat-present">{summary.presentCount}</strong>
        </div>

        <div className="stat-card">
          <span>Late</span>
          <strong className="stat-late">{summary.lateCount}</strong>
        </div>

        <div className="stat-card">
          <span>Half Day</span>
          <strong className="stat-halfday">{summary.halfDayCount}</strong>
        </div>

        <div className="stat-card">
          <span>Absent</span>
          <strong className="stat-absent">{summary.absentCount}</strong>
        </div>

        <div className="stat-card">
          <span>On Leave</span>
          <strong className="stat-leave">{summary.leaveCount}</strong>
        </div>
      </div>

      {/* FILTERS TOOLBAR */}
      <div className="attendance-filter-bar">
        {/* Date Selector */}
        <div className="filter-item date-filter-item">
          <label htmlFor="attendance-date">Date</label>
          <input
            id="attendance-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        {/* Search */}
        <div className="filter-item search-filter-item">
          <label htmlFor="attendance-search">Search Employee</label>
          <input
            id="attendance-search"
            type="text"
            placeholder="Search name or employee code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Department Filter */}
        <div className="filter-item">
          <label htmlFor="attendance-department">Department</label>
          <select
            id="attendance-department"
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

        {/* Status Filter */}
        <div className="filter-item">
          <label htmlFor="attendance-status">Status</label>
          <select
            id="attendance-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="leave-table-card attendance-table-card">
        {loading ? (
          <div className="empty-state">
            <div className="loading-spinner" />
            <p>Loading attendance records for {formatDate(selectedDate)}...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <h3>No attendance records found</h3>
            <p>
              There are no attendance records matching the selected date and
              filters.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="leave-table attendance-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Employee Code</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <div className="employee-info-cell">
                        <span className="employee-name-primary">
                          {record.firstName} {record.lastName}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="code-pill">
                        {record.employeeCode || "-"}
                      </span>
                    </td>
                    <td>{record.department || "-"}</td>
                    <td>{record.designation || "-"}</td>
                    <td>{formatTime(record.checkIn)}</td>
                    <td>{formatTime(record.checkOut)}</td>
                    <td>{getStatusBadge(record.status)}</td>
                    <td>
                      <button
                        type="button"
                        className="regularize-action-button"
                        onClick={() => openRegularizeModal(record)}
                      >
                        Regularize
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REGULARIZATION MODAL */}
      {editingRecord && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeRegularizeModal();
          }}
        >
          <div className="regularize-modal">
            <div className="modal-header">
              <div>
                <h2>Regularize Attendance</h2>
                <p>
                  Adjust status or check-in/out timestamps for this record.
                </p>
              </div>
              <button
                type="button"
                className="close-button"
                onClick={closeRegularizeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            {modalError && <div className="modal-error">{modalError}</div>}

            <form onSubmit={handleSaveRegularization}>
              <div className="modal-form-grid">
                {/* Employee Name (Read Only) */}
                <div className="form-group">
                  <label>Employee</label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={`${editingRecord.firstName || ""} ${editingRecord.lastName || ""} (${editingRecord.employeeCode || ""})`}
                  />
                </div>

                {/* Date (Read Only) */}
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={formatDate(editingRecord.date)}
                  />
                </div>

                {/* Status Dropdown */}
                <div className="form-group full-width">
                  <label htmlFor="modal-status-select">Status</label>
                  <select
                    id="modal-status-select"
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value)}
                  >
                    <option value="PRESENT">Present</option>
                    <option value="LATE">Late</option>
                    <option value="HALF_DAY">Half Day</option>
                    <option value="ABSENT">Absent</option>
                    <option value="LEAVE">Leave</option>
                  </select>
                </div>

                {/* Check In Datetime */}
                <div className="form-group">
                  <div className="label-with-action">
                    <label htmlFor="modal-checkin">Check-In Time</label>
                    {modalCheckIn && (
                      <button
                        type="button"
                        className="clear-field-link"
                        onClick={() => setModalCheckIn("")}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    id="modal-checkin"
                    type="datetime-local"
                    value={modalCheckIn}
                    onChange={(e) => setModalCheckIn(e.target.value)}
                  />
                </div>

                {/* Check Out Datetime */}
                <div className="form-group">
                  <div className="label-with-action">
                    <label htmlFor="modal-checkout">Check-Out Time</label>
                    {modalCheckOut && (
                      <button
                        type="button"
                        className="clear-field-link"
                        onClick={() => setModalCheckOut("")}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    id="modal-checkout"
                    type="datetime-local"
                    value={modalCheckOut}
                    onChange={(e) => setModalCheckOut(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeRegularizeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="save-button"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

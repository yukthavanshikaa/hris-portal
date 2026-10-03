import { useEffect, useState } from "react";
import axios from "axios";
import API_URL from "../config";
import "./Attendance.css";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${formatDate(date)}, ${date.toLocaleTimeString()}`;
}

function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchAttendance = async () => {
    try {
      setError("");

      const response = await axios.get(
        `${API_URL}/api/attendance`,
        {
          withCredentials: true,
        }
      );

      setAttendance(response.data.attendance || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load attendance records."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function loadInitialAttendance() {
      try {
        const response = await axios.get(`${API_URL}/api/attendance`, {
          withCredentials: true,
        });

        if (!ignore) {
          setAttendance(response.data?.attendance || []);
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err.response?.data?.message ||
              "Unable to load attendance records."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadInitialAttendance();

    return () => {
      ignore = true;
    };
  }, []);

  const getTodayAttendance = () => {
    const today = new Date();

    return attendance.find((record) => {
      const recordDate = new Date(record.date);

      return (
        recordDate.getFullYear() === today.getFullYear() &&
        recordDate.getMonth() === today.getMonth() &&
        recordDate.getDate() === today.getDate()
      );
    });
  };

  const todayAttendance = getTodayAttendance();

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const response = await axios.post(
        `${API_URL}/api/attendance/check-in`,
        {},
        {
          withCredentials: true,
        }
      );

      setMessage(response.data.message);
      await fetchAttendance();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to check in."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const response = await axios.post(
        `${API_URL}/api/attendance/check-out`,
        {},
        {
          withCredentials: true,
        }
      );

      setMessage(response.data.message);
      await fetchAttendance();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to check out."
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="module-page">
      <h1>Attendance</h1>

      <p>
        View your attendance records and working hours.
      </p>

      <div className="attendance-actions">
        <button
          onClick={handleCheckIn}
          disabled={
            actionLoading ||
            Boolean(todayAttendance?.checkIn)
          }
        >
          {actionLoading ? "Processing..." : "Check In"}
        </button>

        <button
          onClick={handleCheckOut}
          disabled={
            actionLoading ||
            !todayAttendance?.checkIn ||
            Boolean(todayAttendance?.checkOut)
          }
        >
          {actionLoading ? "Processing..." : "Check Out"}
        </button>
      </div>

      {message && (
        <p className="success-message">
          {message}
        </p>
      )}

      {error && (
        <p className="error-message">
          {error}
        </p>
      )}

      {loading ? (
        <p>Loading attendance...</p>
      ) : attendance.length === 0 ? (
        <p>No attendance records found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {attendance.map((record) => (
              <tr key={record.id}>
                <td>
                  {formatDate(record.date)}
                </td>

                <td>
                  {formatDateTime(record.checkIn)}
                </td>

                <td>
                  {formatDateTime(record.checkOut)}
                </td>

                <td>
                  {record.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Attendance;

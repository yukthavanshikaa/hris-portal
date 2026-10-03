import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./HREmployees.css";
import API_URL from "../config";

function formatDate(dateValue) {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(isoStr) {
  if (!isoStr) return "-";
  const date = new Date(isoStr);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function toInputDate(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatRole(role) {
  if (!role) return "Employee";
  const normalized = role.toUpperCase();
  if (normalized === "ADMIN") return "Admin";
  if (normalized === "HR") return "HR";
  return "Employee";
}

function formatCurrency(amount) {
  if (amount === null || amount === undefined) return "-";
  const num = Number(amount);
  if (Number.isNaN(num)) return "-";
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDocumentType(type) {
  if (!type) return "Other";
  const map = {
    AADHAAR: "Aadhaar Card",
    PAN: "PAN Card",
    DEGREE: "Degree Certificate",
    ADDRESS_PROOF: "Address Proof",
    OTHER: "Other Document",
  };
  return map[type] || type.replaceAll("_", " ");
}

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

function HREmployees() {
  const navigate = useNavigate();

  const storedUser = getStoredUser();
  const activeUserId = storedUser?.id || storedUser?.userId || storedUser?.employee?.userId;
  const activeEmployeeId = storedUser?.employee?.id;
  const activeUserRole = (storedUser?.role || storedUser?.employee?.role)?.toUpperCase();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    employeeCode: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    dateOfJoining: "",
    password: "",
    managerId: "",
    role: "EMPLOYEE",
  });

  // View Profile Modal state
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Delete Confirmation Modal state
  const [deletingEmployee, setDeletingEmployee] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_URL}/api/admin/employees`, {
        withCredentials: true,
      });

      setEmployees(
        Array.isArray(response.data)
          ? response.data
          : response.data?.employees || []
      );
    } catch (err) {
      console.error("LOAD EMPLOYEES ERROR:", err);

      if (err.response?.status === 401) {
        navigate("/login");
        return;
      }

      setError(
        err.response?.data?.message || "Failed to load employees."
      );
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function fetchInitialData() {
      try {
        const response = await axios.get(`${API_URL}/api/admin/employees`, {
          withCredentials: true,
        });

        if (!ignore) {
          setEmployees(
            Array.isArray(response.data)
              ? response.data
              : response.data?.employees || []
          );
        }
      } catch (err) {
        if (!ignore) {
          console.error("INITIAL LOAD EMPLOYEES ERROR:", err);
          if (err.response?.status === 401) {
            navigate("/login");
            return;
          }
          setError(
            err.response?.data?.message || "Failed to load employees."
          );
          setEmployees([]);
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

  // Derived Summary Metric Cards
  const stats = useMemo(() => {
    const total = employees.length;
    const depts = new Set();
    let admins = 0;
    let regular = 0;

    employees.forEach((emp) => {
      if (emp.department && emp.department.trim()) {
        depts.add(emp.department.trim().toLowerCase());
      }
      const role = emp.user?.role?.toUpperCase();
      if (role === "HR" || role === "ADMIN") {
        admins += 1;
      } else {
        regular += 1;
      }
    });

    return {
      total,
      departments: depts.size,
      admins,
      regular,
    };
  }, [employees]);

  // Dynamic Department Options for Filter
  const departmentOptions = useMemo(() => {
    const depts = new Set();
    employees.forEach((emp) => {
      if (emp.department && emp.department.trim()) {
        depts.add(emp.department.trim());
      }
    });
    return ["ALL", ...Array.from(depts).sort((a, b) => a.localeCompare(b))];
  }, [employees]);

  // Combined Filtering: Search + Department + Role
  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return employees.filter((employee) => {
      // Department Filter
      if (departmentFilter !== "ALL") {
        const empDept = (employee.department || "").trim().toLowerCase();
        if (empDept !== departmentFilter.trim().toLowerCase()) {
          return false;
        }
      }

      // Role Filter
      if (roleFilter !== "ALL") {
        const empRole = (employee.user?.role || "EMPLOYEE").toUpperCase();
        if (empRole !== roleFilter.toUpperCase()) {
          return false;
        }
      }

      // Search Filter
      if (query) {
        const fullName = `${employee.firstName || ""} ${
          employee.lastName || ""
        }`.toLowerCase();
        const code = (employee.employeeCode || "").toLowerCase();
        const email = (employee.email || "").toLowerCase();
        const department = (employee.department || "").toLowerCase();
        const designation = (employee.designation || "").toLowerCase();
        const phone = (employee.phone || "").toLowerCase();

        const matches =
          fullName.includes(query) ||
          code.includes(query) ||
          email.includes(query) ||
          department.includes(query) ||
          designation.includes(query) ||
          phone.includes(query);

        if (!matches) return false;
      }

      return true;
    });
  }, [employees, search, departmentFilter, roleFilter]);

  // Profile Modal Handler
  const handleViewProfile = async (emp) => {
    setViewingEmployee(emp);
    setLoadingProfile(true);
    setProfileError("");

    try {
      const response = await axios.get(
        `${API_URL}/api/admin/employees/${emp.id}`,
        {
          withCredentials: true,
        }
      );

      if (response.data) {
        setViewingEmployee(response.data);
      }
    } catch (err) {
      console.error("VIEW EMPLOYEE PROFILE ERROR:", err);
      setProfileError(
        err.response?.data?.message || "Failed to load complete employee details."
      );
    } finally {
      setLoadingProfile(false);
    }
  };

  const closeProfileModal = () => {
    setViewingEmployee(null);
    setProfileError("");
  };

  // Eligible Reporting Managers for Add/Edit Form
  const eligibleManagers = useMemo(() => {
    return employees
      .filter((emp) => !editingEmployee || emp.id !== editingEmployee.id)
      .sort((a, b) => {
        const nameA = `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase();
        const nameB = `${b.firstName || ""} ${b.lastName || ""}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [employees, editingEmployee]);

  // Add / Edit Modal Handlers
  const openAddModal = () => {
    setEditingEmployee(null);
    setForm({
      firstName: "",
      lastName: "",
      employeeCode: "",
      email: "",
      phone: "",
      department: "",
      designation: "",
      dateOfJoining: "",
      password: "",
      managerId: "",
      role: "EMPLOYEE",
    });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (employee) => {
    setEditingEmployee(employee);
    setForm({
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      employeeCode: employee.employeeCode || "",
      email: employee.email || "",
      phone: employee.phone || "",
      department: employee.department || "",
      designation: employee.designation || "",
      dateOfJoining: toInputDate(employee.dateOfJoining),
      password: "",
      managerId: employee.managerId || "",
      role: employee.user?.role || "EMPLOYEE",
    });
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingEmployee(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (editingEmployee) {
        await axios.patch(
          `${API_URL}/api/admin/employees/${editingEmployee.id}`,
          form,
          {
            withCredentials: true,
          }
        );
        setSuccess(
          `Employee ${form.firstName} ${form.lastName} updated successfully.`
        );
      } else {
        await axios.post(
          `${API_URL}/api/admin/employees`,
          form,
          {
            withCredentials: true,
          }
        );
        setSuccess(
          `Employee ${form.firstName} ${form.lastName} (${form.employeeCode}) created successfully.`
        );
      }

      setShowModal(false);
      setEditingEmployee(null);
      await loadEmployees();
    } catch (err) {
      console.error("SAVE EMPLOYEE ERROR:", err);
      setError(
        err.response?.data?.message || "Failed to save employee."
      );
    } finally {
      setSaving(false);
    }
  };

  // Delete Modal Handlers
  const openDeleteModal = (employee) => {
    setDeletingEmployee(employee);
    setError("");
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeletingEmployee(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingEmployee) return;

    try {
      setDeleting(true);
      setError("");

      await axios.delete(
        `${API_URL}/api/admin/employees/${deletingEmployee.id}`,
        {
          withCredentials: true,
        }
      );

      setSuccess(
        `Employee ${deletingEmployee.firstName} ${deletingEmployee.lastName} (${deletingEmployee.employeeCode}) was deleted successfully.`
      );
      setDeletingEmployee(null);
      await loadEmployees();
    } catch (err) {
      console.error("DELETE EMPLOYEE ERROR:", err);
      setError(
        err.response?.data?.message || "Failed to delete employee."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="hr-employees-page">
      {/* HEADER */}
      <div className="hr-employees-header">
        <div>
          <h1>Employee Management</h1>
          <p>Manage employee records, accounts, and profile details.</p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={openAddModal}
        >
          + Add Employee
        </button>
      </div>

      {/* SUCCESS BANNER */}
      {success && (
        <div className="banner-success">
          <span>{success}</span>
          <button
            type="button"
            className="banner-close"
            onClick={() => setSuccess("")}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* ERROR BANNER */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button
            type="button"
            className="banner-close"
            onClick={() => setError("")}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* SUMMARY STAT CARDS */}
      <div className="employee-stats-grid">
        <div className="employee-stat-card">
          <span className="stat-label">Total Workforce</span>
          <strong className="stat-value">{stats.total}</strong>
          <span className="stat-meta">Active staff records</span>
        </div>

        <div className="employee-stat-card">
          <span className="stat-label">Departments</span>
          <strong className="stat-value">{stats.departments}</strong>
          <span className="stat-meta">Operational units</span>
        </div>

        <div className="employee-stat-card hr-stat">
          <span className="stat-label">HR / Admins</span>
          <strong className="stat-value">{stats.admins}</strong>
          <span className="stat-meta">Elevated permissions</span>
        </div>

        <div className="employee-stat-card">
          <span className="stat-label">Employees</span>
          <strong className="stat-value">{stats.regular}</strong>
          <span className="stat-meta">Standard portal access</span>
        </div>
      </div>

      {/* SEARCH & FILTERS TOOLBAR */}
      <div className="employee-toolbar">
        <div className="toolbar-search">
          <input
            type="text"
            placeholder="Search by name, code, email, department, designation..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="toolbar-select">
          <select
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
            aria-label="Filter by department"
          >
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept}>
                {dept === "ALL" ? "All Departments" : dept}
              </option>
            ))}
          </select>
        </div>

        <div className="toolbar-select">
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            aria-label="Filter by role"
          >
            <option value="ALL">All Roles</option>
            <option value="EMPLOYEE">Employee</option>
            <option value="HR">HR</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={loadEmployees}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* EMPLOYEES TABLE */}
      <div className="employee-table-card">
        <div className="table-wrapper">
          {loading ? (
            <div className="empty-state">
              <strong>Loading employees...</strong>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="empty-state">
              <strong>No employees found.</strong>
              <span>Try changing your search or filter options.</span>
            </div>
          ) : (
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Code</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Joining Date</th>
                  <th>Email</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <div className="employee-name">
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div className="employee-subtext">
                        {employee.phone || "No phone"}
                      </div>
                    </td>

                    <td>
                      <span className="code-badge">
                        {employee.employeeCode || "-"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`role-badge role-${(
                          employee.user?.role || "EMPLOYEE"
                        ).toLowerCase()}`}
                      >
                        {formatRole(employee.user?.role)}
                      </span>
                    </td>

                    <td>{employee.department || "-"}</td>

                    <td>{employee.designation || "-"}</td>

                    <td>{formatDate(employee.dateOfJoining)}</td>

                    <td>{employee.email || "-"}</td>

                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="view-button"
                          onClick={() => handleViewProfile(employee)}
                          title="View Employee Profile"
                        >
                          View
                        </button>

                        <button
                          type="button"
                          className="edit-button"
                          onClick={() => openEditModal(employee)}
                        >
                          Edit
                        </button>

                        {(() => {
                          const isOwnAccount =
                            Boolean(
                              activeUserId &&
                                (employee.userId === activeUserId ||
                                  employee.user?.id === activeUserId)
                            ) ||
                            Boolean(
                              activeEmployeeId &&
                                employee.id === activeEmployeeId
                            );

                          const targetRole = (
                            employee.user?.role || employee.role
                          )?.toUpperCase();
                          const isHRViewingAdmin =
                            activeUserRole === "HR" && targetRole === "ADMIN";

                          if (isOwnAccount || isHRViewingAdmin) {
                            return null;
                          }

                          return (
                            <button
                              type="button"
                              className="delete-button"
                              onClick={() => openDeleteModal(employee)}
                            >
                              Delete
                            </button>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="employee-footer">
        Showing {filteredEmployees.length} of {employees.length} employees
      </div>

      {/* VIEW PROFILE MODAL */}
      {viewingEmployee && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeProfileModal();
            }
          }}
        >
          <div className="employee-modal profile-modal">
            <div className="modal-header">
              <div>
                <h2>
                  {viewingEmployee.firstName} {viewingEmployee.lastName}
                </h2>
                <p>
                  {viewingEmployee.employeeCode} · {formatRole(viewingEmployee.user?.role)} in {viewingEmployee.department || "No Department"}
                </p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={closeProfileModal}
              >
                ×
              </button>
            </div>

            {profileError && (
              <div className="modal-error">{profileError}</div>
            )}

            <div className="profile-content">
              {loadingProfile && (
                <div className="profile-loading-notice">
                  Refreshing complete profile details...
                </div>
              )}

              {/* SECTION A: BASIC INFORMATION */}
              <div className="profile-section">
                <h3>Personal & Employment Details</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Employee Code</span>
                    <strong className="detail-value">{viewingEmployee.employeeCode || "-"}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">System Role</span>
                    <strong className="detail-value">{formatRole(viewingEmployee.user?.role)}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Email Address</span>
                    <strong className="detail-value">{viewingEmployee.email || "-"}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Phone</span>
                    <strong className="detail-value">{viewingEmployee.phone || "Not provided"}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Department</span>
                    <strong className="detail-value">{viewingEmployee.department || "-"}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Designation</span>
                    <strong className="detail-value">{viewingEmployee.designation || "-"}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Joining Date</span>
                    <strong className="detail-value">{formatDate(viewingEmployee.dateOfJoining)}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Reporting Manager</span>
                    <strong className="detail-value">
                      {(() => {
                        const mgr =
                          viewingEmployee.manager ||
                          (viewingEmployee.managerId
                            ? employees.find((e) => e.id === viewingEmployee.managerId)
                            : null);
                        if (mgr) {
                          return `${mgr.firstName} ${mgr.lastName} (${mgr.designation || mgr.employeeCode})`;
                        }
                        return "No reporting manager";
                      })()}
                    </strong>
                  </div>
                </div>
              </div>

              {/* SECTION B: LEAVE BALANCE */}
              <div className="profile-section">
                <h3>Leave Balance Summary</h3>
                <div className="balance-grid">
                  <div className="balance-pill">
                    <span className="balance-name">Casual Leave</span>
                    <strong className="balance-num">
                      {viewingEmployee.leaveBalance?.casualLeave ?? 0}
                    </strong>
                    <span className="balance-unit">days</span>
                  </div>

                  <div className="balance-pill">
                    <span className="balance-name">Sick Leave</span>
                    <strong className="balance-num">
                      {viewingEmployee.leaveBalance?.sickLeave ?? 0}
                    </strong>
                    <span className="balance-unit">days</span>
                  </div>

                  <div className="balance-pill">
                    <span className="balance-name">Earned Leave</span>
                    <strong className="balance-num">
                      {viewingEmployee.leaveBalance?.earnedLeave ?? 0}
                    </strong>
                    <span className="balance-unit">days</span>
                  </div>
                </div>
              </div>

              {/* SECTION C: RECENT ATTENDANCE */}
              <div className="profile-section">
                <h3>Recent Attendance (Last 10 Records)</h3>
                {!viewingEmployee.attendance || viewingEmployee.attendance.length === 0 ? (
                  <div className="profile-empty-text">No attendance records logged yet.</div>
                ) : (
                  <div className="profile-mini-table-wrapper">
                    <table className="profile-mini-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Status</th>
                          <th>Check-in</th>
                          <th>Check-out</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingEmployee.attendance.map((att) => (
                          <tr key={att.id}>
                            <td>{formatDate(att.date)}</td>
                            <td>
                              <span className={`status-pill status-${(att.status || "").toLowerCase()}`}>
                                {att.status}
                              </span>
                            </td>
                            <td>{formatTime(att.checkIn)}</td>
                            <td>{formatTime(att.checkOut)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SECTION D: RECENT LEAVE REQUESTS */}
              <div className="profile-section">
                <h3>Recent Leave Requests (Last 10 Records)</h3>
                {!viewingEmployee.leaveRequests || viewingEmployee.leaveRequests.length === 0 ? (
                  <div className="profile-empty-text">No leave requests recorded.</div>
                ) : (
                  <div className="profile-mini-table-wrapper">
                    <table className="profile-mini-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Duration</th>
                          <th>Status</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingEmployee.leaveRequests.map((req) => (
                          <tr key={req.id}>
                            <td><strong>{req.type}</strong></td>
                            <td>
                              {formatDate(req.startDate)} - {formatDate(req.endDate)}
                            </td>
                            <td>
                              <span className={`status-pill status-${(req.status || "").toLowerCase()}`}>
                                {req.status}
                              </span>
                            </td>
                            <td>
                              <span className="table-reason-text">
                                {req.reason || "-"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SECTION E: RECENT PAYROLL */}
              <div className="profile-section">
                <h3>Recent Payroll History (Last 10 Records)</h3>
                {!viewingEmployee.payroll || viewingEmployee.payroll.length === 0 ? (
                  <div className="profile-empty-text">No payroll statements generated yet.</div>
                ) : (
                  <div className="profile-mini-table-wrapper">
                    <table className="profile-mini-table">
                      <thead>
                        <tr>
                          <th>Period</th>
                          <th>Gross Salary</th>
                          <th>Deductions</th>
                          <th>Net Salary</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingEmployee.payroll.map((pay) => (
                          <tr key={pay.id}>
                            <td><strong>{pay.month}/{pay.year}</strong></td>
                            <td>{formatCurrency(pay.grossSalary)}</td>
                            <td>{formatCurrency(pay.deductions)}</td>
                            <td><strong>{formatCurrency(pay.netSalary)}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SECTION F: UPLOADED DOCUMENTS */}
              <div className="profile-section">
                <h3>Uploaded Documents</h3>
                {!viewingEmployee.documents || viewingEmployee.documents.length === 0 ? (
                  <div className="profile-empty-text">No identification or credentials submitted.</div>
                ) : (
                  <div className="profile-mini-table-wrapper">
                    <table className="profile-mini-table">
                      <thead>
                        <tr>
                          <th>Document</th>
                          <th>Status</th>
                          <th>Submitted</th>
                          <th>Notes / Rejection Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingEmployee.documents.map((doc) => (
                          <tr key={doc.id}>
                            <td><strong>{formatDocumentType(doc.type)}</strong></td>
                            <td>
                              <span className={`status-pill status-${(doc.status || "").toLowerCase()}`}>
                                {doc.status}
                              </span>
                            </td>
                            <td>{formatDate(doc.createdAt)}</td>
                            <td>
                              {doc.rejectionReason ? (
                                <span className="rejection-note">
                                  {doc.rejectionReason}
                                </span>
                              ) : (
                                "―"
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

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closeProfileModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              closeModal();
            }
          }}
        >
          <div className="employee-modal">
            <div className="modal-header">
              <div>
                <h2>
                  {editingEmployee ? "Edit Employee" : "Add Employee"}
                </h2>
                <p>
                  {editingEmployee
                    ? "Update employee information."
                    : "Create a new employee account."}
                </p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            {error && <div className="modal-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="form-first-name">First Name *</label>
                  <input
                    id="form-first-name"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="form-last-name">Last Name *</label>
                  <input
                    id="form-last-name"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="form-employee-code">Employee Code *</label>
                  <input
                    id="form-employee-code"
                    name="employeeCode"
                    value={form.employeeCode}
                    onChange={handleChange}
                    required
                    disabled={Boolean(editingEmployee)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="form-email">Email *</label>
                  <input
                    id="form-email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="form-phone">Phone</label>
                  <input
                    id="form-phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="e.g. +91 9876543210"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="form-department">Department *</label>
                  <input
                    id="form-department"
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="form-designation">Designation *</label>
                  <input
                    id="form-designation"
                    name="designation"
                    value={form.designation}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="form-date-of-joining">Date of Joining *</label>
                  <input
                    id="form-date-of-joining"
                    type="date"
                    name="dateOfJoining"
                    value={form.dateOfJoining}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="form-role">Role *</label>
                  <select
                    id="form-role"
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    required
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="HR">HR</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="form-manager">Reporting Manager</label>
                  <select
                    id="form-manager"
                    name="managerId"
                    value={form.managerId}
                    onChange={handleChange}
                  >
                    <option value="">No Manager (Independent / Root)</option>
                    {eligibleManagers.map((mgr) => (
                      <option key={mgr.id} value={mgr.id}>
                        {mgr.firstName} {mgr.lastName} • {mgr.employeeCode} • {mgr.designation || mgr.department}
                      </option>
                    ))}
                  </select>
                </div>

                {!editingEmployee && (
                  <div className="form-group full-width">
                    <label htmlFor="form-password">Temporary Password *</label>
                    <input
                      id="form-password"
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      required={!editingEmployee}
                      minLength={6}
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingEmployee
                    ? "Save Changes"
                    : "Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-APP DANGER DELETE CONFIRMATION MODAL */}
      {deletingEmployee && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              closeDeleteModal();
            }
          }}
        >
          <div className="employee-modal delete-modal">
            <div className="delete-modal-icon">⚠️</div>

            <h2 className="delete-modal-title">Delete Employee Record</h2>

            <p className="delete-modal-desc">
              Are you sure you want to permanently delete{" "}
              <strong>
                {deletingEmployee.firstName} {deletingEmployee.lastName}
              </strong>{" "}
              ({deletingEmployee.employeeCode})?
            </p>

            <div className="delete-warning-box">
              <strong>Permanent Cascade Deletion</strong>
              <p>
                Deleting this employee will permanently erase all associated portal
                data including their attendance history, leave balances and requests,
                payroll slips, uploaded verification documents, and user account.
              </p>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="confirm-delete-button"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Employee"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HREmployees;
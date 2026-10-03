import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_URL from "../config";

const API = API_URL;

const emptyForm = {
  firstName: "",
  lastName: "",
  employeeCode: "",
  email: "",
  phone: "",
  department: "",
  designation: "",
  dateOfJoining: "",
  password: ""
};

function formatDate(dateString) {
  if (!dateString) return "-";

  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function toInputDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().split("T")[0];
}

export default function Employees() {
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [editingEmployee, setEditingEmployee] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  /*
    Load employees
  */
  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API}/api/employees`,
        {
          withCredentials: true
        }
      );

      setEmployees(response.data || []);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Failed to load employees."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  /*
    Open Add Employee modal
  */
  const openAddModal = () => {
    setEditingEmployee(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  /*
    Open Edit Employee modal
  */
  const openEditModal = (employee) => {
    setEditingEmployee(employee);

    setForm({
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      employeeCode: employee.employeeCode || "",
      email:
        employee.user?.email ||
        employee.email ||
        "",
      phone: employee.phone || "",
      department: employee.department || "",
      designation: employee.designation || "",
      dateOfJoining: toInputDate(
        employee.dateOfJoining
      ),
      password: ""
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  /*
    Close modal
  */
  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingEmployee(null);
    setForm(emptyForm);
    setError("");
  };

  /*
    Form changes
  */
  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  /*
    Submit Add/Edit
  */
  const handleSubmit = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingEmployee) {
        await axios.patch(
          `${API}/api/employees/${editingEmployee.id}`,
          form,
          {
            withCredentials: true
          }
        );

        setSuccess(
          "Employee updated successfully."
        );
      } else {
        await axios.post(
          `${API}/api/employees`,
          form,
          {
            withCredentials: true
          }
        );

        setSuccess(
          "Employee created successfully."
        );
      }

      await loadEmployees();

      setTimeout(() => {
        setShowModal(false);
        setEditingEmployee(null);
        setForm(emptyForm);
      }, 500);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
    Search
  */
  const filteredEmployees = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return employees;
    }

    return employees.filter((employee) => {
      const fullName =
        `${employee.firstName} ${employee.lastName}`.toLowerCase();

      const code =
        employee.employeeCode?.toLowerCase() || "";

      const email =
        (
          employee.user?.email ||
          employee.email ||
          ""
        ).toLowerCase();

      const department =
        employee.department?.toLowerCase() || "";

      const designation =
        employee.designation?.toLowerCase() || "";

      return (
        fullName.includes(value) ||
        code.includes(value) ||
        email.includes(value) ||
        department.includes(value) ||
        designation.includes(value)
      );
    });
  }, [employees, search]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Employee Management</h1>

          <p>
            Manage employee records and accounts.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={openAddModal}
        >
          + Add Employee
        </button>
      </div>

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      {error && !showModal && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px"
        }}
      >
        <input
          type="text"
          placeholder="Search by name, code, email, department..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          style={{
            flex: 1,
            padding: "12px 14px",
            border: "1px solid #d8dee9",
            borderRadius: "8px",
            fontSize: "14px",
            outline: "none"
          }}
        />

        <button
          className="secondary-button"
          onClick={loadEmployees}
        >
          Refresh
        </button>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>EMPLOYEE</th>
              <th>CODE</th>
              <th>DEPARTMENT</th>
              <th>DESIGNATION</th>
              <th>JOINING DATE</th>
              <th>EMAIL</th>
              <th>ACTION</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan="7"
                  style={{
                    textAlign: "center",
                    padding: "40px"
                  }}
                >
                  Loading employees...
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  style={{
                    textAlign: "center",
                    padding: "40px"
                  }}
                >
                  No employees found.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <div
                      style={{
                        fontWeight: 700
                      }}
                    >
                      {employee.firstName}{" "}
                      {employee.lastName}
                    </div>

                    {employee.phone && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#8993a7",
                          marginTop: "4px"
                        }}
                      >
                        {employee.phone}
                      </div>
                    )}
                  </td>

                  <td>
                    <span className="code-badge">
                      {employee.employeeCode}
                    </span>
                  </td>

                  <td>
                    {employee.department}
                  </td>

                  <td>
                    {employee.designation}
                  </td>

                  <td>
                    {formatDate(
                      employee.dateOfJoining
                    )}
                  </td>

                  <td>
                    {employee.user?.email ||
                      employee.email}
                  </td>

                  <td>
                    <button
                      className="secondary-button small"
                      onClick={() =>
                        openEditModal(employee)
                      }
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: "14px",
          color: "#8993a7",
          fontSize: "13px"
        }}
      >
        Showing {filteredEmployees.length} of{" "}
        {employees.length} employees
      </div>

      {showModal && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            className="modal-card"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <h2>
                  {editingEmployee
                    ? "Edit Employee"
                    : "Add Employee"}
                </h2>

                <p>
                  {editingEmployee
                    ? "Update employee information."
                    : "Create a new employee account."}
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {success && (
              <div className="success-message">
                {success}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="employee-form"
            >
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    First Name *
                  </label>

                  <input
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                    placeholder="First name"
                  />
                </div>

                <div className="form-group">
                  <label>
                    Last Name *
                  </label>

                  <input
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                    placeholder="Last name"
                  />
                </div>

                <div className="form-group">
                  <label>
                    Employee Code *
                  </label>

                  <input
                    name="employeeCode"
                    value={form.employeeCode}
                    onChange={handleChange}
                    required
                    placeholder="EMP003"
                  />
                </div>

                <div className="form-group">
                  <label>
                    Email *
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="employee@company.com"
                  />
                </div>

                <div className="form-group">
                  <label>
                    Phone
                  </label>

                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Phone number"
                  />
                </div>

                <div className="form-group">
                  <label>
                    Department *
                  </label>

                  <input
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    required
                    placeholder="Engineering"
                  />
                </div>

                <div className="form-group">
                  <label>
                    Designation *
                  </label>

                  <input
                    name="designation"
                    value={form.designation}
                    onChange={handleChange}
                    required
                    placeholder="Software Engineer"
                  />
                </div>

                <div className="form-group">
                  <label>
                    Date of Joining *
                  </label>

                  <input
                    type="date"
                    name="dateOfJoining"
                    value={form.dateOfJoining}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>
                    {editingEmployee
                      ? "New Password"
                      : "Temporary Password *"}
                  </label>

                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required={!editingEmployee}
                    minLength="6"
                    placeholder={
                      editingEmployee
                        ? "Leave blank to keep current password"
                        : "Minimum 6 characters"
                    }
                  />

                  {!editingEmployee && (
                    <small>
                      Give this temporary password
                      to the employee so they can
                      log in.
                    </small>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingEmployee
                    ? "Save Changes"
                    : "Create Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_URL from "../config";
import "./HRPayroll.css";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return "₹0";
  }
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

function formatPayPeriod(month, year) {
  if (!month || !year) return "-";
  const name = MONTH_NAMES[month - 1] || `Month ${month}`;
  return `${name} ${year}`;
}

const CSV_HEADERS = [
  "Employee Code",
  "Full Name",
  "Department",
  "Designation",
  "Month",
  "Year",
  "Basic Salary",
  "HRA",
  "Allowances",
  "Gross Salary",
  "Deductions",
  "Net Salary",
  "Status"
];

function escapeCSVValue(val) {
  if (val === null || val === undefined) {
    return "";
  }
  const str = String(val);
  if (
    str.includes('"') ||
    str.includes(",") ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function getPayrollExportFilename(month, year) {
  let monthPart = "all-months";
  if (month && month !== "ALL") {
    const monthNum = parseInt(month, 10);
    if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
      monthPart = MONTH_NAMES[monthNum - 1].toLowerCase();
    } else {
      monthPart = String(month).toLowerCase();
    }
  }

  let yearPart = "all-years";
  if (year && year !== "ALL") {
    yearPart = String(year).toLowerCase();
  }

  return `payroll-report-${monthPart}-${yearPart}.csv`;
}

const DEFAULT_SUMMARY = {
  totalGross: 0,
  totalDeductions: 0,
  totalNet: 0,
  totalEmployeesPaid: 0
};

export default function HRPayroll() {
  const navigate = useNavigate();

  // Current date defaults
  const currentMonth = String(new Date().getMonth() + 1);
  const currentYear = String(new Date().getFullYear());

  // Filter states
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [department, setDepartment] = useState("ALL");
  const [search, setSearch] = useState("");

  // Data states
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [availableDepartments, setAvailableDepartments] = useState([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Load data based on filters
  useEffect(() => {
    let ignore = false;

    async function loadPayrollData() {
      try {
        setLoading(true);
        setError("");

        const params = {};
        if (month && month !== "ALL") params.month = month;
        if (year && year !== "ALL") params.year = year;
        if (department && department !== "ALL") params.department = department;
        if (search.trim()) params.search = search.trim();

        const response = await axios.get(`${API_URL}/api/admin/payroll`, {
          params,
          withCredentials: true
        });

        if (!ignore) {
          setRecords(response.data.records || []);
          setSummary(response.data.summary || DEFAULT_SUMMARY);
          if (Array.isArray(response.data.departments)) {
            setAvailableDepartments(response.data.departments);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to load HR payroll records:", err);
          if (err.response?.status === 401) {
            navigate("/login");
            return;
          }
          setError(
            err.response?.data?.message || "Failed to load payroll records."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadPayrollData();

    return () => {
      ignore = true;
    };
  }, [month, year, department, search, navigate]);

  // Modal keyboard listener (Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && selectedRecord) {
        setSelectedRecord(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedRecord]);

  // Scroll lock when modal is open
  useEffect(() => {
    if (selectedRecord) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedRecord]);

  // Manual refresh
  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};
      if (month && month !== "ALL") params.month = month;
      if (year && year !== "ALL") params.year = year;
      if (department && department !== "ALL") params.department = department;
      if (search.trim()) params.search = search.trim();

      const response = await axios.get(`${API_URL}/api/admin/payroll`, {
        params,
        withCredentials: true
      });

      setRecords(response.data.records || []);
      setSummary(response.data.summary || DEFAULT_SUMMARY);
      if (Array.isArray(response.data.departments)) {
        setAvailableDepartments(response.data.departments);
      }
    } catch (err) {
      console.error("Failed to refresh payroll records:", err);
      if (err.response?.status === 401) {
        navigate("/login");
        return;
      }
      setError(
        err.response?.data?.message || "Failed to refresh payroll records."
      );
    } finally {
      setLoading(false);
    }
  };

  // Clear filters
  const handleClearFilters = () => {
    setMonth("ALL");
    setYear("ALL");
    setDepartment("ALL");
    setSearch("");
  };

  // Export current filtered payroll records to CSV
  const handleExportCSV = () => {
    const headerRow = CSV_HEADERS.map(escapeCSVValue).join(",");

    const dataRows = (records || []).map((record) => {
      const employee = record.employee || {};
      const fullName =
        employee.fullName ||
        `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
        "Employee";
      const monthStr =
        record.month && MONTH_NAMES[record.month - 1]
          ? MONTH_NAMES[record.month - 1]
          : record.month != null
            ? String(record.month)
            : "";
      const yearStr = record.year != null ? String(record.year) : "";

      const basicSalary =
        record.basicSalary != null ? Number(record.basicSalary) : 0;
      const hra = record.hra != null ? Number(record.hra) : 0;
      const allowances =
        record.allowances != null ? Number(record.allowances) : 0;
      const grossSalary =
        record.grossSalary != null ? Number(record.grossSalary) : 0;
      const deductions =
        record.deductions != null ? Number(record.deductions) : 0;
      const netSalary =
        record.netSalary != null ? Number(record.netSalary) : 0;
      const status = record.status || "Paid";

      const rowValues = [
        employee.employeeCode || "",
        fullName,
        employee.department || "",
        employee.designation || "",
        monthStr,
        yearStr,
        basicSalary,
        hra,
        allowances,
        grossSalary,
        deductions,
        netSalary,
        status
      ];

      return rowValues.map(escapeCSVValue).join(",");
    });

    const csvContent = [headerRow, ...dataRows].join("\r\n");
    const filename = getPayrollExportFilename(month, year);

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    if (typeof window !== "undefined" && window.URL && window.URL.createObjectURL) {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  };

  // Print official payslip
  const handlePrintPayslip = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="hr-payroll-page">
      {/* Header */}
      <div className="hr-payroll-header">
        <div>
          <h1>Payroll Management</h1>
          <p>
            Monitor corporate payroll disbursements, monthly compensation, and
            tax deductions.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* A. Summary Cards */}
      <div className="hr-payroll-stats-grid">
        <div className="hr-payroll-stat-card card-gross">
          <span className="stat-label">Total Payroll</span>
          <strong className="stat-value">
            {formatCurrency(summary.totalGross)}
          </strong>
          <span className="stat-subtext">Gross salary disbursed</span>
        </div>

        <div className="hr-payroll-stat-card card-deductions">
          <span className="stat-label">Total Deductions</span>
          <strong className="stat-value">
            {formatCurrency(summary.totalDeductions)}
          </strong>
          <span className="stat-subtext">Taxes & benefit deductions</span>
        </div>

        <div className="hr-payroll-stat-card card-net">
          <span className="stat-label">Total Net Pay</span>
          <strong className="stat-value">
            {formatCurrency(summary.totalNet)}
          </strong>
          <span className="stat-subtext">Net amount transferred</span>
        </div>

        <div className="hr-payroll-stat-card card-employees">
          <span className="stat-label">Employees Paid</span>
          <strong className="stat-value">{summary.totalEmployeesPaid}</strong>
          <span className="stat-subtext">With processed payroll</span>
        </div>
      </div>

      {/* B. Filter Toolbar */}
      <div className="hr-payroll-toolbar">
        <div className="hr-payroll-search-box">
          <input
            type="text"
            placeholder="Search by employee name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="hr-payroll-filters">
          {/* Department Filter */}
          <select
            className="filter-select"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="ALL">All Departments</option>
            {availableDepartments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Month Filter */}
          <select
            className="filter-select"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            <option value="ALL">All Months</option>
            {MONTH_NAMES.map((name, index) => (
              <option key={name} value={String(index + 1)}>
                {name}
              </option>
            ))}
          </select>

          {/* Year Filter */}
          <select
            className="filter-select"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            <option value="ALL">All Years</option>
            <option value="2027">2027</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>

          {/* Clear Filters */}
          <button
            type="button"
            className="clear-filters-btn"
            onClick={handleClearFilters}
          >
            Clear Filters
          </button>

          {/* Export CSV */}
          <button
            type="button"
            className="export-csv-btn"
            onClick={handleExportCSV}
            disabled={loading}
            title="Export filtered payroll records to CSV"
          >
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* C. Payroll Table / States */}
      <div className="hr-payroll-table-card">
        {loading ? (
          <div className="payroll-loading-state">
            <div className="loading-spinner"></div>
            <p>Loading payroll records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="payroll-empty-state">
            <div className="empty-icon">💳</div>
            <h3>No Payroll Records Found</h3>
            <p>
              No employee payroll statements matched your selected month, year,
              or filters.
            </p>
            {(month !== "ALL" ||
              year !== "ALL" ||
              department !== "ALL" ||
              search) && (
              <button
                type="button"
                className="primary-button-small"
                onClick={handleClearFilters}
              >
                View All Payroll Statements
              </button>
            )}
          </div>
        ) : (
          <div className="hr-payroll-table-wrapper">
            <table className="hr-payroll-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Employee Code</th>
                  <th>Department</th>
                  <th>Pay Period</th>
                  <th>Basic Salary</th>
                  <th>HRA</th>
                  <th>Allowances</th>
                  <th>Gross Salary</th>
                  <th>Deductions</th>
                  <th>Net Salary</th>
                  <th className="th-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <div className="employee-cell">
                        <div className="cell-avatar">
                          {record.employee?.firstName?.[0] || "E"}
                          {record.employee?.lastName?.[0] || ""}
                        </div>
                        <div className="cell-names">
                          <strong>
                            {record.employee?.fullName || "Employee"}
                          </strong>
                          <small>
                            {record.employee?.designation || "Staff"}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="code-pill">
                        {record.employee?.employeeCode || "-"}
                      </span>
                    </td>
                    <td>
                      <span className="dept-pill">
                        {record.employee?.department || "-"}
                      </span>
                    </td>
                    <td>
                      <strong>
                        {formatPayPeriod(record.month, record.year)}
                      </strong>
                    </td>
                    <td>{formatCurrency(record.basicSalary)}</td>
                    <td>{formatCurrency(record.hra)}</td>
                    <td>{formatCurrency(record.allowances)}</td>
                    <td className="bold-gross">
                      {formatCurrency(record.grossSalary)}
                    </td>
                    <td className="deductions-val">
                      {formatCurrency(record.deductions)}
                    </td>
                    <td className="bold-net">
                      {formatCurrency(record.netSalary)}
                    </td>
                    <td className="td-action">
                      <button
                        type="button"
                        className="breakdown-btn"
                        onClick={() => setSelectedRecord(record)}
                        title="View itemized breakdown"
                      >
                        View Breakdown
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* D. View Breakdown Modal */}
      {selectedRecord && (
        <div
          className="payroll-modal-backdrop"
          onClick={() => setSelectedRecord(null)}
          role="presentation"
        >
          <div
            className="payroll-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payroll-modal-title"
          >
            {/* Modal Header */}
            <div className="payroll-modal-header">
              <div className="modal-header-info">
                <div className="modal-avatar">
                  {selectedRecord.employee?.firstName?.[0] || "E"}
                  {selectedRecord.employee?.lastName?.[0] || ""}
                </div>
                <div>
                  <h2 id="payroll-modal-title">
                    {selectedRecord.employee?.fullName || "Employee"}
                  </h2>
                  <span className="modal-sub">
                    {selectedRecord.employee?.designation} •{" "}
                    {selectedRecord.employee?.department} (
                    {selectedRecord.employee?.employeeCode})
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedRecord(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="payroll-modal-body">
              <div className="modal-period-badge">
                <span>Pay Period:</span>
                <strong>
                  {formatPayPeriod(
                    selectedRecord.month,
                    selectedRecord.year
                  )}
                </strong>
              </div>

              {/* Earnings Breakdown */}
              <div className="modal-section-card">
                <h3>Earnings & Allowances</h3>
                <div className="modal-row">
                  <span>Basic Salary</span>
                  <strong>{formatCurrency(selectedRecord.basicSalary)}</strong>
                </div>
                <div className="modal-row">
                  <span>House Rent Allowance (HRA)</span>
                  <strong>{formatCurrency(selectedRecord.hra)}</strong>
                </div>
                <div className="modal-row">
                  <span>Special & Other Allowances</span>
                  <strong>
                    {formatCurrency(selectedRecord.allowances)}
                  </strong>
                </div>
                <div className="modal-row subtotal-row">
                  <span>Monthly Gross Salary</span>
                  <strong className="text-gross">
                    {formatCurrency(selectedRecord.grossSalary)}
                  </strong>
                </div>
              </div>

              {/* Deductions & Net Pay */}
              <div className="modal-section-card">
                <h3>Deductions & Net Pay</h3>
                <div className="modal-row">
                  <span>Taxes, PF & Deductions</span>
                  <strong className="text-deduction">
                    {formatCurrency(selectedRecord.deductions)}
                  </strong>
                </div>
                <div className="modal-row subtotal-row net-row">
                  <span>Net Salary Payable</span>
                  <strong className="text-net">
                    {formatCurrency(selectedRecord.netSalary)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="payroll-modal-footer">
              <button
                type="button"
                className="print-payslip-btn"
                onClick={handlePrintPayslip}
                title="Print formal employee payslip"
              >
                🖨 Print Payslip
              </button>
              <button
                type="button"
                className="modal-action-btn"
                onClick={() => setSelectedRecord(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* E. Print-Only Official Payslip Document */}
      {selectedRecord && (
        <div className="payslip-print-document" aria-hidden="true">
          <div className="payslip-print-header">
            <div className="payslip-company-block">
              <h1>HRIS Portal</h1>
              <p className="payslip-subtitle">
                Human Resource Information System
              </p>
            </div>
            <div className="payslip-title-block">
              <h2>PAYSLIP</h2>
              <span className="payslip-period-pill">
                {formatPayPeriod(selectedRecord.month, selectedRecord.year)}
              </span>
            </div>
          </div>

          <div className="payslip-rule"></div>

          {/* Employee & Payroll Meta Grid */}
          <div className="payslip-meta-grid">
            <div className="payslip-meta-cell">
              <span className="meta-label">Employee Name:</span>
              <strong className="meta-value">
                {selectedRecord.employee?.fullName ||
                  `${selectedRecord.employee?.firstName || ""} ${
                    selectedRecord.employee?.lastName || ""
                  }`.trim() ||
                  "Employee"}
              </strong>
            </div>
            <div className="payslip-meta-cell">
              <span className="meta-label">Employee Code:</span>
              <strong className="meta-value">
                {selectedRecord.employee?.employeeCode || "N/A"}
              </strong>
            </div>
            <div className="payslip-meta-cell">
              <span className="meta-label">Department:</span>
              <strong className="meta-value">
                {selectedRecord.employee?.department || "N/A"}
              </strong>
            </div>
            <div className="payslip-meta-cell">
              <span className="meta-label">Designation:</span>
              <strong className="meta-value">
                {selectedRecord.employee?.designation || "N/A"}
              </strong>
            </div>
            <div className="payslip-meta-cell">
              <span className="meta-label">Pay Period:</span>
              <strong className="meta-value">
                {formatPayPeriod(selectedRecord.month, selectedRecord.year)}
              </strong>
            </div>
            <div className="payslip-meta-cell">
              <span className="meta-label">Month / Year:</span>
              <strong className="meta-value">
                {selectedRecord.month && MONTH_NAMES[selectedRecord.month - 1]
                  ? MONTH_NAMES[selectedRecord.month - 1]
                  : selectedRecord.month || "-"}{" "}
                / {selectedRecord.year || "-"}
              </strong>
            </div>
            <div className="payslip-meta-cell">
              <span className="meta-label">Payroll Status:</span>
              <strong className="meta-value status-paid">
                {selectedRecord.status || "Paid"}
              </strong>
            </div>
          </div>

          {/* Earnings & Deductions Tables */}
          <div className="payslip-tables-row">
            <div className="payslip-table-wrapper">
              <table className="payslip-table">
                <thead>
                  <tr>
                    <th>Earnings & Allowances</th>
                    <th className="align-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Basic Salary</td>
                    <td className="align-right">
                      {formatCurrency(selectedRecord.basicSalary)}
                    </td>
                  </tr>
                  <tr>
                    <td>House Rent Allowance (HRA)</td>
                    <td className="align-right">
                      {formatCurrency(selectedRecord.hra)}
                    </td>
                  </tr>
                  <tr>
                    <td>Special & Other Allowances</td>
                    <td className="align-right">
                      {formatCurrency(selectedRecord.allowances)}
                    </td>
                  </tr>
                  <tr className="payslip-subtotal-row">
                    <td>Gross Salary</td>
                    <td className="align-right">
                      {formatCurrency(selectedRecord.grossSalary)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="payslip-table-wrapper">
              <table className="payslip-table">
                <thead>
                  <tr>
                    <th>Deductions</th>
                    <th className="align-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Taxes, PF & Deductions</td>
                    <td className="align-right">
                      {formatCurrency(selectedRecord.deductions)}
                    </td>
                  </tr>
                  <tr className="payslip-subtotal-row">
                    <td>Total Deductions</td>
                    <td className="align-right">
                      {formatCurrency(selectedRecord.deductions)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Net Salary Payable Callout */}
          <div className="payslip-net-summary">
            <div className="net-summary-label">
              <strong>Net Salary Payable</strong>
              <span>Net amount transferred to employee account</span>
            </div>
            <div className="net-summary-amount">
              <strong>{formatCurrency(selectedRecord.netSalary)}</strong>
            </div>
          </div>

          {/* Footer Declaration */}
          <div className="payslip-print-footer">
            <p>
              This is a system-generated official payslip from the HRIS Portal. It
              requires no physical signature.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

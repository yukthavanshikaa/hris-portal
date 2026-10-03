import { useEffect, useState } from "react";
import axios from "axios";
import API_URL from "../config";
import "./Payroll.css";

function Payroll() {
  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const API = `${API_URL}/api/payroll`;

  useEffect(() => {
    const loadPayroll = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(`${API}/latest`, {
          withCredentials: true
        });

        setPayroll(response.data.payroll);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load payroll information."
        );
      } finally {
        setLoading(false);
      }
    };

    loadPayroll();
  }, []);

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "-";
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  };

  const getMonthName = (month) => {
    if (!month) return "-";
    return new Date(2000, month - 1, 1).toLocaleString("en-IN", {
      month: "long"
    });
  };

  if (loading) {
    return (
      <div className="module-page">
        <h1>Payroll</h1>
        <p>Loading payroll information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="module-page">
        <h1>Payroll</h1>
        <p className="error-message">{error}</p>
      </div>
    );
  }

  if (!payroll) {
    return (
      <div className="module-page">
        <h1>Payroll</h1>
        <p>No payroll records found.</p>
      </div>
    );
  }

  const payPeriod = `${getMonthName(payroll.month)} ${payroll.year}`;

  return (
    <div className="module-page">
      <h1>Payroll</h1>

      <p>
        View your salary details and latest payroll information.
      </p>

      {/* Main Summary Cards */}
      <section className="payroll-summary-section">
        <div className="payroll-summary">
          <div className="payroll-card gross-card">
            <strong>Monthly Gross Salary</strong>
            <span>{formatCurrency(payroll.grossSalary)}</span>
          </div>

          <div className="payroll-card deductions-card">
            <strong>Total Deductions</strong>
            <span>{formatCurrency(payroll.deductions)}</span>
          </div>

          <div className="payroll-card net-card">
            <strong>Net Salary</strong>
            <span>{formatCurrency(payroll.netSalary)}</span>
          </div>

          <div className="payroll-card period-card">
            <strong>Salary Month / Pay Period</strong>
            <span>{payPeriod}</span>
          </div>
        </div>
      </section>

      {/* Secondary Detailed Breakdown: Salary Breakdown */}
      <section className="payroll-breakdown-section">
        <h2>Salary Breakdown</h2>

        <div className="breakdown-container">
          <div className="breakdown-card">
            <h3>Earnings & Allowances</h3>

            <div className="breakdown-row">
              <span>Basic Salary</span>
              <strong>{formatCurrency(payroll.basicSalary)}</strong>
            </div>

            <div className="breakdown-row">
              <span>HRA</span>
              <strong>{formatCurrency(payroll.hra)}</strong>
            </div>

            <div className="breakdown-row">
              <span>Allowances</span>
              <strong>{formatCurrency(payroll.allowances)}</strong>
            </div>

            <div className="breakdown-row breakdown-subtotal">
              <span>Monthly Gross Salary</span>
              <strong>{formatCurrency(payroll.grossSalary)}</strong>
            </div>
          </div>

          <div className="breakdown-card">
            <h3>Deductions & Net Pay</h3>

            <div className="breakdown-row">
              <span>Total Deductions</span>
              <strong className="text-deduction">{formatCurrency(payroll.deductions)}</strong>
            </div>

            <div className="breakdown-row breakdown-subtotal breakdown-net">
              <span>Net Salary</span>
              <strong>{formatCurrency(payroll.netSalary)}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Payroll Details */}
      <section className="payroll-details-section">
        <h2>Payroll Details</h2>

        <table>
          <thead>
            <tr>
              <th>Salary Month / Pay Period</th>
              <th>Monthly Gross Salary</th>
              <th>Total Deductions</th>
              <th>Net Salary</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>{payPeriod}</td>
              <td>{formatCurrency(payroll.grossSalary)}</td>
              <td>{formatCurrency(payroll.deductions)}</td>
              <td>{formatCurrency(payroll.netSalary)}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default Payroll;
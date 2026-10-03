import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import "./App.css";

import Login from "./pages/Login";

import Dashboard from "./pages/Dashboard";
import Attendance from "./pages/Attendance";
import Leave from "./pages/Leave";
import Payroll from "./pages/Payroll";
import Documents from "./pages/Documents";

import EmployeeLayout from "./components/EmployeeLayout";
import HRLayout from "./components/HRLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import HRDashboard from "./pages/HRDashboard";
import HREmployees from "./pages/HREmployees";
import HRAttendance from "./pages/HRAttendance";
import HRLeaveApproval from "./pages/HRLeaveApproval";
import HRDocuments from "./pages/HRDocuments";
import HRPayroll from "./pages/HRPayroll";

import Organization from "./pages/Organization";
import Assistant from "./pages/Assistant";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* =====================================================
            LOGIN
        ===================================================== */}

        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        <Route
          path="/login"
          element={<Login />}
        />


        {/* =====================================================
            EMPLOYEE PORTAL
        ===================================================== */}

        <Route
          element={
            <ProtectedRoute>
              <EmployeeLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          <Route
            path="/attendance"
            element={<Attendance />}
          />

          <Route
            path="/leave"
            element={<Leave />}
          />

          <Route
            path="/payroll"
            element={<Payroll />}
          />

          <Route
            path="/documents"
            element={<Documents />}
          />

          <Route
            path="/organization"
            element={<Organization />}
          />

          <Route
            path="/assistant"
            element={<Assistant />}
          />
        </Route>


        {/* =====================================================
            HR PORTAL
            HRLayout provides the sidebar + main content area.
        ===================================================== */}

        <Route
          path="/hr"
          element={
            <ProtectedRoute allowedRoles={["HR", "ADMIN"]}>
              <HRLayout />
            </ProtectedRoute>
          }
        >

          {/* /hr automatically opens dashboard */}
          <Route
            index
            element={
              <Navigate
                to="/hr/dashboard"
                replace
              />
            }
          />

          {/* HR Dashboard */}
          <Route
            path="dashboard"
            element={<HRDashboard />}
          />

          {/* Employee Management */}
          <Route
            path="employees"
            element={<HREmployees />}
          />

          {/* Attendance Management */}
          <Route
            path="attendance"
            element={<HRAttendance />}
          />

          {/* Leave Approval */}
          <Route
            path="leave"
            element={<HRLeaveApproval />}
          />

          {/* Document Verification */}
          <Route
            path="documents"
            element={<HRDocuments />}
          />

          {/* Payroll Management */}
          <Route
            path="payroll"
            element={<HRPayroll />}
          />

          {/* Organization Hierarchy */}
          <Route
            path="organization"
            element={<Organization />}
          />

          {/* Company Assistant */}
          <Route
            path="assistant"
            element={<Assistant />}
          />

        </Route>


        {/* =====================================================
            FALLBACK
        ===================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
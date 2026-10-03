import { Outlet } from "react-router-dom";
import EmployeeSidebar from "./EmployeeSidebar";

function EmployeeLayout() {
  return (
    <div className="app-layout">
      <EmployeeSidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default EmployeeLayout;

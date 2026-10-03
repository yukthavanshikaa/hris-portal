import { Outlet } from "react-router-dom";
import HRSidebar from "./HRSidebar";
import "./HRLayout.css";

function HRLayout() {
  return (
    <div className="hr-layout">
      <HRSidebar />

      <main className="hr-layout-content">
        <Outlet />
      </main>
    </div>
  );
}

export default HRLayout;
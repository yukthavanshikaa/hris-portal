import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import API_URL from "../config";
import "./Organization.css";

/* =====================================================
   HELPER UTILITIES
   ===================================================== */

/**
 * Format ISO or Date string to DD/MM/YYYY
 */
function formatDate(dateValue) {
  if (!dateValue) return "-";
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return "-";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "-";
  }
}

/**
 * Department color indicator CSS class
 */
function getDeptColorClass(dept) {
  switch (dept?.toLowerCase()) {
    case "executive":
      return "dept-executive";
    case "technology":
      return "dept-technology";
    case "engineering":
      return "dept-engineering";
    case "human resources":
      return "dept-hr";
    case "finance":
      return "dept-finance";
    case "product":
      return "dept-product";
    case "sales":
      return "dept-sales";
    case "marketing":
      return "dept-marketing";
    default:
      return "dept-default";
  }
}

/* =====================================================
   NODE CARD COMPONENT
   ===================================================== */
function OrgNodeCard({
  node,
  depth = 0,
  isExpanded,
  onToggleExpand,
  hasChildren,
  onSelectEmployee
}) {
  return (
    <div
      className={`org-node-card depth-${depth} ${getDeptColorClass(node.department)} clickable`}
      onClick={() => onSelectEmployee && onSelectEmployee(node)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectEmployee && onSelectEmployee(node);
        }
      }}
      title={`Click to view profile of ${node.fullName}`}
    >
      <div className="org-node-header">
        <div className="org-node-avatar">
          {node.firstName?.[0] || "E"}
          {node.lastName?.[0] || ""}
        </div>
        <div className="org-node-titles">
          <h3 className="org-node-name">{node.fullName}</h3>
          <span className="org-node-designation">{node.designation}</span>
        </div>
      </div>

      <div className="org-node-meta">
        <span
          className={`org-node-badge ${getDeptColorClass(node.department)}`}
        >
          {node.department}
        </span>
        <span className="org-node-code">{node.employeeCode}</span>
      </div>

      <div className="org-node-footer">
        <span className="org-node-email">{node.email}</span>
        {hasChildren && (
          <button
            type="button"
            className="expand-collapse-btn"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            title={isExpanded ? "Collapse reports" : "Expand reports"}
          >
            {isExpanded ? "▲" : "▼"} {node.directReports.length}{" "}
            {node.directReports.length === 1 ? "report" : "reports"}
          </button>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   TREE BRANCH RECURSIVE RENDERER
   ===================================================== */
function OrgTreeBranch({
  node,
  depth = 0,
  collapsedNodes,
  toggleCollapse,
  searchTerm,
  onSelectEmployee
}) {
  const hasChildren = node.directReports && node.directReports.length > 0;
  const isCollapsed = collapsedNodes.has(node.id);
  const isExpanded = !isCollapsed;

  // If search is active, show nodes that match or have matching descendants
  const matchesSearch = (item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const selfMatches =
      item.fullName?.toLowerCase().includes(term) ||
      item.designation?.toLowerCase().includes(term) ||
      item.department?.toLowerCase().includes(term) ||
      item.employeeCode?.toLowerCase().includes(term);

    if (selfMatches) return true;
    return item.directReports?.some(matchesSearch);
  };

  if (searchTerm && !matchesSearch(node)) {
    return null;
  }

  return (
    <div className="org-tree-node-wrapper">
      <OrgNodeCard
        node={node}
        depth={depth}
        isExpanded={isExpanded}
        onToggleExpand={toggleCollapse}
        hasChildren={hasChildren}
        onSelectEmployee={onSelectEmployee}
      />

      {hasChildren && isExpanded && (
        <div className="org-children-container">
          <div className="org-connector-vertical-stem"></div>
          <div className="org-children-grid">
            {node.directReports.map((child) => (
              <div key={child.id} className="org-child-column">
                <div className="org-connector-vertical-drop"></div>
                <OrgTreeBranch
                  node={child}
                  depth={depth + 1}
                  collapsedNodes={collapsedNodes}
                  toggleCollapse={toggleCollapse}
                  searchTerm={searchTerm}
                  onSelectEmployee={onSelectEmployee}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   MAIN ORGANIZATION COMPONENT
   ===================================================== */
export default function Organization() {
  const navigate = useNavigate();
  const location = useLocation();

  const isHRRoute = location.pathname.startsWith("/hr");

  const [data, setData] = useState({
    tree: [],
    employees: [],
    departments: [],
    totalEmployees: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [viewMode, setViewMode] = useState("tree"); // "tree" | "directory"
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());

  // Quick-view modal state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  const treeCanvasRef = useRef(null);

  // Initial load with ignore cleanup for React 19 / strict mode
  useEffect(() => {
    let ignore = false;

    async function fetchOrgData() {
      try {
        setError("");
        const response = await axios.get(`${API_URL}/api/organization`, {
          withCredentials: true
        });
        if (!ignore) {
          setData(response.data || {});
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to load organization data:", err);
          if (err.response?.status === 401) {
            navigate("/login");
            return;
          }
          setError(
            err.response?.data?.message ||
              "Failed to load organization hierarchy."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchOrgData();

    return () => {
      ignore = true;
    };
  }, [navigate]);

  // Manual refresh handler
  const loadOrganization = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_URL}/api/organization`, {
        withCredentials: true
      });

      setData(response.data || {});
    } catch (err) {
      console.error("Failed to load organization data:", err);
      if (err.response?.status === 401) {
        navigate("/login");
        return;
      }
      setError(
        err.response?.data?.message || "Failed to load organization hierarchy."
      );
    } finally {
      setLoading(false);
    }
  };

  // Center tree horizontally on initial render and when switching to tree view
  useEffect(() => {
    if (viewMode === "tree" && treeCanvasRef.current) {
      const centerTree = () => {
        const canvas = treeCanvasRef.current;
        if (canvas && canvas.scrollWidth > canvas.clientWidth) {
          canvas.scrollLeft = (canvas.scrollWidth - canvas.clientWidth) / 2;
        }
      };
      const raf = requestAnimationFrame(centerTree);
      return () => cancelAnimationFrame(raf);
    }
  }, [data.tree, viewMode]);

  // Modal keyboard listener (Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && selectedEmployeeId) {
        setSelectedEmployeeId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEmployeeId]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (selectedEmployeeId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedEmployeeId]);

  const toggleCollapse = (nodeId) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAll = () => setCollapsedNodes(new Set());
  const collapseAll = () => {
    const allParentIds = new Set();
    const collectParents = (nodes) => {
      nodes?.forEach((node) => {
        if (node.directReports?.length > 0) {
          allParentIds.add(node.id);
          collectParents(node.directReports);
        }
      });
    };
    collectParents(data.tree);
    setCollapsedNodes(allParentIds);
  };

  // Compute Organization KPI Metrics
  const kpiStats = useMemo(() => {
    const employees = data.employees || [];
    const totalHeadcount = data.totalEmployees || employees.length;
    const activeDepartments = data.departments?.length || 0;

    let peopleManagersCount = 0;
    let individualContributorsCount = 0;
    let totalDirectReportsUnderManagers = 0;

    employees.forEach((emp) => {
      const reports = Number(emp.directReportsCount) || 0;
      if (reports > 0) {
        peopleManagersCount += 1;
        totalDirectReportsUnderManagers += reports;
      } else {
        individualContributorsCount += 1;
      }
    });

    const avg =
      peopleManagersCount > 0
        ? totalDirectReportsUnderManagers / peopleManagersCount
        : 0;

    const averageTeamSize =
      peopleManagersCount === 0
        ? "0"
        : Number.isInteger(avg)
          ? avg.toString()
          : avg.toFixed(1);

    return {
      totalHeadcount,
      activeDepartments,
      peopleManagersCount,
      individualContributorsCount,
      averageTeamSize
    };
  }, [data.employees, data.totalEmployees, data.departments]);

  // Quick-view: selected employee record
  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return (data.employees || []).find((e) => e.id === selectedEmployeeId) || null;
  }, [data.employees, selectedEmployeeId]);

  // Quick-view: direct reports of selected employee
  const selectedDirectReports = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return (data.employees || []).filter((e) => e.managerId === selectedEmployeeId);
  }, [data.employees, selectedEmployeeId]);

  // Filtered employees for directory view
  const filteredEmployees = useMemo(() => {
    return (data.employees || []).filter((emp) => {
      const matchesDept =
        selectedDept === "ALL" || emp.department === selectedDept;
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        emp.fullName.toLowerCase().includes(term) ||
        emp.designation.toLowerCase().includes(term) ||
        emp.department.toLowerCase().includes(term) ||
        emp.employeeCode.toLowerCase().includes(term);

      return matchesDept && matchesSearch;
    });
  }, [data.employees, selectedDept, searchTerm]);

  const content = (
    <div className="org-page-content">
      {/* Page Header */}
      <div className="org-header">
        <div>
          <h1>Organization Hierarchy</h1>
          <p>
            Explore the complete corporate reporting structure and employee
            directory.
          </p>
        </div>

        <div className="org-header-actions">
          <div className="org-view-toggle">
            <button
              type="button"
              className={viewMode === "tree" ? "view-btn active" : "view-btn"}
              onClick={() => setViewMode("tree")}
            >
              🌳 Hierarchy Tree
            </button>
            <button
              type="button"
              className={
                viewMode === "directory" ? "view-btn active" : "view-btn"
              }
              onClick={() => setViewMode("directory")}
            >
              📋 Directory Cards
            </button>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={loadOrganization}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {/* FEATURE 1: Organization KPI Summary Metrics */}
      <div className="org-kpi-grid">
        <div className="org-kpi-card">
          <span className="org-kpi-label">Total Headcount</span>
          <strong className="org-kpi-value">{kpiStats.totalHeadcount}</strong>
          <span className="org-kpi-subtext">All active personnel</span>
        </div>

        <div className="org-kpi-card">
          <span className="org-kpi-label">Active Departments</span>
          <strong className="org-kpi-value">{kpiStats.activeDepartments}</strong>
          <span className="org-kpi-subtext">Operating divisions</span>
        </div>

        <div className="org-kpi-card">
          <span className="org-kpi-label">People Managers</span>
          <strong className="org-kpi-value">{kpiStats.peopleManagersCount}</strong>
          <span className="org-kpi-subtext">With direct reports</span>
        </div>

        <div className="org-kpi-card">
          <span className="org-kpi-label">Individual Contributors</span>
          <strong className="org-kpi-value">
            {kpiStats.individualContributorsCount}
          </strong>
          <span className="org-kpi-subtext">Zero direct reports</span>
        </div>

        <div className="org-kpi-card">
          <span className="org-kpi-label">Avg Team Size</span>
          <strong className="org-kpi-value">{kpiStats.averageTeamSize}</strong>
          <span className="org-kpi-subtext">Per people manager</span>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="org-toolbar">
        <div className="org-search-box">
          <input
            type="text"
            placeholder="Search by name, designation, code, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearchTerm("")}
            >
              ✕
            </button>
          )}
        </div>

        {viewMode === "tree" ? (
          <div className="tree-quick-controls">
            <button type="button" className="chip-btn" onClick={expandAll}>
              Expand All
            </button>
            <button type="button" className="chip-btn" onClick={collapseAll}>
              Collapse All
            </button>
          </div>
        ) : (
          <div className="org-dept-filters">
            <button
              type="button"
              className={
                selectedDept === "ALL" ? "filter-chip active" : "filter-chip"
              }
              onClick={() => setSelectedDept("ALL")}
            >
              All ({data.employees?.length || 0})
            </button>
            {data.departments?.map((dept) => (
              <button
                key={dept}
                type="button"
                className={
                  selectedDept === dept ? "filter-chip active" : "filter-chip"
                }
                onClick={() => setSelectedDept(dept)}
              >
                {dept}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="org-loading-state">
          <div className="loading-spinner"></div>
          <p>Building organization structure from database...</p>
        </div>
      ) : viewMode === "tree" ? (
        <div className="org-tree-canvas" ref={treeCanvasRef}>
          <div className="org-tree-inner">
            {data.tree && data.tree.length > 0 ? (
              data.tree.map((rootNode) => (
                <OrgTreeBranch
                  key={rootNode.id}
                  node={rootNode}
                  depth={0}
                  collapsedNodes={collapsedNodes}
                  toggleCollapse={toggleCollapse}
                  searchTerm={searchTerm}
                  onSelectEmployee={(emp) => setSelectedEmployeeId(emp.id)}
                />
              ))
            ) : (
              <div className="org-empty-state">
                <p>No organizational hierarchy nodes found.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Directory Grid View */
        <div className="org-directory-grid">
          {filteredEmployees.length === 0 ? (
            <div className="org-empty-state">
              <p>No employees match your search or filter.</p>
            </div>
          ) : (
            filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                className="org-directory-card clickable"
                onClick={() => setSelectedEmployeeId(emp.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedEmployeeId(emp.id);
                  }
                }}
                title={`Click to view profile of ${emp.fullName}`}
              >
                <div className="directory-card-top">
                  <div className="directory-avatar">
                    {emp.firstName?.[0] || "E"}
                    {emp.lastName?.[0] || ""}
                  </div>
                  <div>
                    <h4>{emp.fullName}</h4>
                    <span className="directory-designation">
                      {emp.designation}
                    </span>
                  </div>
                </div>

                <div className="directory-badges">
                  <span className="directory-dept-badge">{emp.department}</span>
                  <span className="directory-code-badge">
                    {emp.employeeCode}
                  </span>
                </div>

                <div className="directory-details">
                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <span className="detail-val">{emp.email}</span>
                  </div>
                  {emp.phone && (
                    <div className="detail-row">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-val">{emp.phone}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Reports To:</span>
                    <span className="detail-val manager-val">
                      {emp.manager
                        ? `${emp.manager.fullName} (${emp.manager.designation})`
                        : "Executive Board / None"}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Direct Reports:</span>
                    <span className="detail-val">{emp.directReportsCount}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* FEATURE 2: Employee Quick-View Modal */}
      {selectedEmployee && (
        <div
          className="org-modal-backdrop"
          onClick={() => setSelectedEmployeeId(null)}
          role="presentation"
        >
          <div
            className="org-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="org-modal-emp-name"
          >
            {/* Modal Header */}
            <div className="org-modal-header">
              <div className="org-modal-user-block">
                <div className="org-modal-avatar">
                  {selectedEmployee.firstName?.[0] || "E"}
                  {selectedEmployee.lastName?.[0] || ""}
                </div>
                <div className="org-modal-titles">
                  <h2 id="org-modal-emp-name">{selectedEmployee.fullName}</h2>
                  <span className="org-modal-designation">
                    {selectedEmployee.designation}
                  </span>
                  <div className="org-modal-badges">
                    <span
                      className={`org-node-badge ${getDeptColorClass(selectedEmployee.department)}`}
                    >
                      {selectedEmployee.department}
                    </span>
                    <span className="directory-code-badge">
                      {selectedEmployee.employeeCode}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="org-modal-close-btn"
                onClick={() => setSelectedEmployeeId(null)}
                aria-label="Close details"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="org-modal-body">
              {/* Contact & Employment Info Grid */}
              <div>
                <h3 className="org-modal-section-title">Employee Details</h3>
                <div className="org-modal-details-grid">
                  <div className="org-modal-detail-item">
                    <span className="org-modal-detail-label">Email Address</span>
                    <span className="org-modal-detail-val">
                      {selectedEmployee.email || "-"}
                    </span>
                  </div>
                  <div className="org-modal-detail-item">
                    <span className="org-modal-detail-label">Phone Number</span>
                    <span className="org-modal-detail-val">
                      {selectedEmployee.phone || "Not provided"}
                    </span>
                  </div>
                  <div className="org-modal-detail-item">
                    <span className="org-modal-detail-label">Date of Joining</span>
                    <span className="org-modal-detail-val">
                      {formatDate(selectedEmployee.dateOfJoining)}
                    </span>
                  </div>
                  <div className="org-modal-detail-item">
                    <span className="org-modal-detail-label">Role Category</span>
                    <span className="org-modal-detail-val">
                      {selectedDirectReports.length > 0
                        ? `People Manager (${selectedDirectReports.length} ${
                            selectedDirectReports.length === 1
                              ? "report"
                              : "reports"
                          })`
                        : "Individual Contributor"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reporting Manager Section */}
              <div>
                <h3 className="org-modal-section-title">Reporting Manager</h3>
                {selectedEmployee.manager ? (
                  <button
                    type="button"
                    className="org-modal-manager-card"
                    onClick={() =>
                      setSelectedEmployeeId(selectedEmployee.manager.id)
                    }
                    title={`Switch view to manager: ${selectedEmployee.manager.fullName}`}
                  >
                    <div className="org-modal-manager-left">
                      <div className="org-modal-manager-avatar">
                        {selectedEmployee.manager.firstName?.[0] || "M"}
                        {selectedEmployee.manager.lastName?.[0] || ""}
                      </div>
                      <div className="org-modal-manager-info">
                        <strong>{selectedEmployee.manager.fullName}</strong>
                        <span>
                          {selectedEmployee.manager.designation} •{" "}
                          {selectedEmployee.manager.department} (
                          {selectedEmployee.manager.employeeCode})
                        </span>
                      </div>
                    </div>
                    <span className="org-modal-manager-hint">View Profile ↗</span>
                  </button>
                ) : (
                  <p className="org-modal-empty-text">
                    Executive Board / Top Level (No direct reporting manager)
                  </p>
                )}
              </div>

              {/* Direct Reports Section */}
              <div>
                <h3 className="org-modal-section-title">
                  Direct Reports ({selectedDirectReports.length})
                </h3>
                {selectedDirectReports.length > 0 ? (
                  <div className="org-modal-reports-list">
                    {selectedDirectReports.map((report) => (
                      <button
                        key={report.id}
                        type="button"
                        className="org-modal-report-chip"
                        onClick={() => setSelectedEmployeeId(report.id)}
                        title={`Switch view to ${report.fullName}`}
                      >
                        <div className="report-chip-left">
                          <span className="report-chip-avatar">
                            {report.firstName?.[0] || "E"}
                            {report.lastName?.[0] || ""}
                          </span>
                          <span className="report-chip-info">
                            <strong>{report.fullName}</strong>
                            <small>
                              {report.designation} • {report.employeeCode}
                            </small>
                          </span>
                        </div>
                        <span className="report-chip-arrow">→</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="org-modal-empty-text">
                    No direct reports (Individual Contributor)
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="org-modal-footer">
              {isHRRoute && (
                <button
                  type="button"
                  className="org-modal-hr-btn"
                  onClick={() => {
                    setSelectedEmployeeId(null);
                    navigate("/hr/employees");
                  }}
                >
                  👥 View in HR Employee Management →
                </button>
              )}
              <button
                type="button"
                className="org-modal-cancel-btn"
                onClick={() => setSelectedEmployeeId(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // If rendered inside HRLayout (/hr/organization), render directly inside HR main area
  if (isHRRoute) {
    return <div className="hr-page-wrapper">{content}</div>;
  }

  // If accessed directly via /organization as an employee, rendered inside EmployeeLayout
  return (
    <div>
      <header className="topbar">
        <div>
          <h1>Organization</h1>
          <p>Company reporting hierarchy and structure.</p>
        </div>
        <div className="profile">
          <div className="profile-avatar">E</div>
          <div>
            <strong>Employee Portal</strong>
            <span>Organization Directory</span>
          </div>
        </div>
      </header>

      {content}
    </div>
  );
}

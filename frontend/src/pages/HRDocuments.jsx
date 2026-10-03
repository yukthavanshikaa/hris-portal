import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./HRDocuments.css";
import API_URL from "../config";

const API = API_URL;

const DOCUMENT_TYPE_OPTIONS = [
  { value: "ALL", label: "All Document Types" },
  { value: "AADHAAR", label: "Aadhaar Card" },
  { value: "PAN", label: "PAN Card" },
  { value: "DEGREE", label: "Degree Certificate" },
  { value: "ADDRESS_PROOF", label: "Address Proof" },
  { value: "OTHER", label: "Other Document" },
];

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

function formatDate(date) {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getEmployeeName(document) {
  if (!document.employee) return "Unknown Employee";

  const firstName = document.employee.firstName || "";
  const lastName = document.employee.lastName || "";

  return `${firstName} ${lastName}`.trim() || "Unknown Employee";
}

function getEmployeeCode(document) {
  return document.employee?.employeeCode || "N/A";
}

function HRDocuments() {
  const [documents, setDocuments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [department, setDepartment] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [processingId, setProcessingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);

  const [rejectingDoc, setRejectingDoc] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API}/api/admin/documents`, {
        withCredentials: true,
      });

      setDocuments(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to load documents:", err);
      setError(
        err.response?.data?.message || "Failed to load employee documents."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function fetchInitialDocuments() {
      try {
        const response = await axios.get(`${API}/api/admin/documents`, {
          withCredentials: true,
        });

        if (!ignore) {
          setDocuments(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to load documents:", err);
          setError(
            err.response?.data?.message || "Failed to load employee documents."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchInitialDocuments();

    return () => {
      ignore = true;
    };
  }, []);

  const departmentOptions = useMemo(() => {
    const depts = new Set();
    documents.forEach((d) => {
      if (d.employee?.department && d.employee.department.trim()) {
        depts.add(d.employee.department.trim());
      }
    });
    return ["ALL", ...Array.from(depts).sort()];
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    const q = search.trim().toLowerCase();

    return documents.filter((doc) => {
      // Status filter
      if (statusFilter !== "ALL" && doc.status !== statusFilter) {
        return false;
      }

      // Document Type filter
      if (typeFilter !== "ALL" && doc.type !== typeFilter) {
        return false;
      }

      // Department filter
      if (department !== "ALL") {
        const empDept = doc.employee?.department?.trim().toLowerCase();
        if (empDept !== department.trim().toLowerCase()) {
          return false;
        }
      }

      // Search filter (employee name, email, employee code)
      if (q) {
        const name = getEmployeeName(doc).toLowerCase();
        const email = (doc.employee?.email || "").toLowerCase();
        const code = (doc.employee?.employeeCode || "").toLowerCase();

        if (!name.includes(q) && !email.includes(q) && !code.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [documents, statusFilter, typeFilter, department, search]);

  const counts = useMemo(
    () => ({
      total: documents.length,
      pending: documents.filter((d) => d.status === "PENDING").length,
      verified: documents.filter((d) => d.status === "VERIFIED").length,
      rejected: documents.filter((d) => d.status === "REJECTED").length,
    }),
    [documents]
  );

  const handleViewDocument = async (doc) => {
    try {
      setViewingId(doc.id);
      setError("");

      const res = await axios.get(`${API}/api/admin/documents/${doc.id}/view`, {
        withCredentials: true,
      });

      if (res.data?.url) {
        window.open(res.data.url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("View document error:", err);
      setError(err.response?.data?.message || "Failed to open document.");
    } finally {
      setViewingId(null);
    }
  };

  const verifyDocument = async (id, doc) => {
    try {
      setProcessingId(id);
      setError("");
      setSuccessMessage("");

      await axios.patch(
        `${API}/api/admin/documents/${id}/verify`,
        {},
        { withCredentials: true }
      );

      const empName = doc ? getEmployeeName(doc) : "Employee";
      setSuccessMessage(`Document for ${empName} verified successfully.`);

      await loadDocuments();
    } catch (err) {
      console.error("Verify document error:", err);
      setError(
        err.response?.data?.message || "Failed to verify document."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (doc) => {
    setRejectingDoc(doc);
    setRejectReason("");
    setError("");
  };

  const handleConfirmReject = async () => {
    if (!rejectingDoc) return;

    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      setError("Please provide a reason for rejecting the document.");
      return;
    }

    try {
      setProcessingId(rejectingDoc.id);
      setError("");
      setSuccessMessage("");

      await axios.patch(
        `${API}/api/admin/documents/${rejectingDoc.id}/reject`,
        { reason: trimmedReason },
        { withCredentials: true }
      );

      setSuccessMessage(
        `Document for ${getEmployeeName(rejectingDoc)} rejected successfully.`
      );
      setRejectingDoc(null);
      setRejectReason("");

      await loadDocuments();
    } catch (err) {
      console.error("Reject document error:", err);
      setError(
        err.response?.data?.message || "Failed to reject document."
      );
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="hr-documents-page">
      {/* HEADER */}
      <div className="hr-documents-header">
        <div>
          <h1>Document Verification</h1>
          <p>
            Review employee documents and verify or reject submissions.
          </p>
        </div>

        <button
          className="hr-documents-refresh"
          onClick={loadDocuments}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* SUCCESS BANNER */}
      {successMessage && (
        <div className="hr-documents-success">
          <span>{successMessage}</span>
          <button
            type="button"
            className="banner-close-btn"
            onClick={() => setSuccessMessage("")}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* ERROR BANNER */}
      {error && (
        <div className="hr-documents-error">
          <span>{error}</span>
          <button
            type="button"
            className="banner-close-btn"
            onClick={() => setError("")}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* STAT CARDS */}
      <div className="hr-document-stats">
        <div className="hr-document-stat-card">
          <span>Total Documents</span>
          <strong>{counts.total}</strong>
        </div>

        <div className="hr-document-stat-card pending">
          <span>Pending</span>
          <strong>{counts.pending}</strong>
        </div>

        <div className="hr-document-stat-card verified">
          <span>Verified</span>
          <strong>{counts.verified}</strong>
        </div>

        <div className="hr-document-stat-card rejected">
          <span>Rejected</span>
          <strong>{counts.rejected}</strong>
        </div>
      </div>

      {/* FILTERS TOOLBAR */}
      <div className="hr-document-filter-bar">
        {/* Search */}
        <div className="filter-item search-filter-item">
          <label htmlFor="document-search">Search Employee</label>
          <input
            id="document-search"
            type="text"
            placeholder="Search by name, email, or employee code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Department Filter */}
        <div className="filter-item">
          <label htmlFor="document-department">Department</label>
          <select
            id="document-department"
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

        {/* Document Type Filter */}
        <div className="filter-item">
          <label htmlFor="document-type-filter">Document Type</label>
          <select
            id="document-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            {DOCUMENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* STATUS TABS */}
      <div className="hr-document-filters">
        {["ALL", "PENDING", "VERIFIED", "REJECTED"].map((item) => (
          <button
            key={item}
            type="button"
            className={`hr-document-filter ${
              statusFilter === item ? "active" : ""
            }`}
            onClick={() => setStatusFilter(item)}
          >
            {item === "ALL"
              ? "All"
              : item.charAt(0) + item.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div className="hr-documents-table-card">
        {loading ? (
          <div className="hr-documents-empty">
            Loading documents...
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="hr-documents-empty">
            No documents found matching the selected filters.
          </div>
        ) : (
          <div className="hr-documents-table-wrapper">
            <table className="hr-documents-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Employee Code</th>
                  <th>Document Type</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Rejection Reason</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredDocuments.map((document) => (
                  <tr key={document.id}>
                    {/* EMPLOYEE */}
                    <td>
                      <div className="employee-cell">
                        <strong>{getEmployeeName(document)}</strong>
                        <span>
                          {document.employee?.email || "No email"}
                        </span>
                        {document.employee?.department && (
                          <span className="employee-dept-tag">
                            {document.employee.department}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* EMPLOYEE CODE */}
                    <td>
                      <span className="employee-code">
                        {getEmployeeCode(document)}
                      </span>
                    </td>

                    {/* DOCUMENT TYPE */}
                    <td>
                      <span className="document-type-badge">
                        {formatDocumentType(document.type)}
                      </span>
                    </td>

                    {/* SUBMITTED */}
                    <td>{formatDate(document.createdAt)}</td>

                    {/* STATUS */}
                    <td>
                      <span
                        className={`document-status ${document.status?.toLowerCase()}`}
                      >
                        {document.status}
                      </span>
                    </td>

                    {/* REJECTION REASON */}
                    <td>
                      {document.status === "REJECTED" ? (
                        <div className="rejection-reason-cell">
                          <span className="rejection-reason-text">
                            {document.rejectionReason || "No reason specified"}
                          </span>
                        </div>
                      ) : (
                        <span className="reason-na">—</span>
                      )}
                    </td>

                    {/* ACTION */}
                    <td>
                      <div className="document-actions">
                        {document.fileUrl && (
                          <button
                            type="button"
                            className="view-document"
                            onClick={() => handleViewDocument(document)}
                            disabled={viewingId === document.id}
                          >
                            {viewingId === document.id ? "..." : "View"}
                          </button>
                        )}

                        {document.status === "PENDING" ? (
                          <>
                            <button
                              type="button"
                              className="verify-button"
                              onClick={() =>
                                verifyDocument(document.id, document)
                              }
                              disabled={processingId === document.id}
                            >
                              {processingId === document.id
                                ? "..."
                                : "Verify"}
                            </button>

                            <button
                              type="button"
                              className="reject-button"
                              onClick={() => openRejectModal(document)}
                              disabled={processingId === document.id}
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="processed-text">
                            Processed
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REJECT MODAL */}
      {rejectingDoc && (
        <div
          className="doc-modal-overlay"
          onClick={(event) => {
            if (
              event.target === event.currentTarget &&
              processingId !== rejectingDoc.id
            ) {
              setRejectingDoc(null);
              setRejectReason("");
            }
          }}
        >
          <div className="doc-reject-modal">
            <div className="modal-icon">⚠️</div>

            <h2>Reject Document</h2>

            <p>
              You are rejecting <strong>{formatDocumentType(rejectingDoc.type)}</strong> submitted by{" "}
              <strong>{getEmployeeName(rejectingDoc)}</strong> ({getEmployeeCode(rejectingDoc)}).
            </p>

            <label htmlFor="reject-reason-input" className="modal-label">
              Reason for Rejection <span className="required-mark">*</span>
            </label>

            <textarea
              id="reject-reason-input"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide a clear explanation for the rejection (e.g. document blurred, expired, name mismatch)..."
              rows="4"
              autoFocus
            />

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-button"
                disabled={processingId === rejectingDoc.id}
                onClick={() => {
                  setRejectingDoc(null);
                  setRejectReason("");
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="reject-confirm-button"
                disabled={
                  processingId === rejectingDoc.id || !rejectReason.trim()
                }
                onClick={handleConfirmReject}
              >
                {processingId === rejectingDoc.id
                  ? "Rejecting..."
                  : "Reject Document"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HRDocuments;
import { useEffect, useState } from "react";
import axios from "axios";
import API_URL from "../config";
import "./Documents.css";

const API = `${API_URL}/api/documents`;

/* =====================================================
   FORMAT DOCUMENT TYPE
   ===================================================== */

function formatDocumentType(type) {
  switch (type) {
    case "AADHAAR":
      return "Aadhaar";

    case "PAN":
      return "PAN";

    case "DEGREE":
      return "Degree Certificate";

    case "ADDRESS_PROOF":
      return "Address Proof";

    case "OTHER":
      return "Other";

    default:
      return type;
  }
}

/* =====================================================
   FORMAT STATUS
   ===================================================== */

function formatStatus(status) {
  switch (status) {
    case "VERIFIED":
      return "Verified";

    case "REJECTED":
      return "Rejected";

    case "PENDING":
      return "Pending Verification";

    default:
      return status;
  }
}

/* =====================================================
   STATUS CLASS
   ===================================================== */

function getStatusClass(status) {
  switch (status) {
    case "VERIFIED":
      return "status-verified";

    case "REJECTED":
      return "status-rejected";

    default:
      return "status-pending";
  }
}

/* =====================================================
   DOCUMENTS COMPONENT
   ===================================================== */

function Documents() {

  const [documents, setDocuments] = useState([]);

  const [loading, setLoading] = useState(true);

  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [documentType, setDocumentType] =
    useState("AADHAAR");

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [viewingId, setViewingId] = useState(null);

  const handleViewDocument = async (doc) => {
    try {
      setViewingId(doc.id);
      const res = await axios.get(`${API}/${doc.id}/view`, {
        withCredentials: true
      });
      if (res.data?.url) {
        window.open(res.data.url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to open document.");
    } finally {
      setViewingId(null);
    }
  };

  /* ===================================================
     LOAD DOCUMENTS
     =================================================== */

  const loadDocuments = async () => {

    try {

      setLoading(true);

      setError("");

      const response = await axios.get(API, {
        withCredentials: true
      });

      setDocuments(
        response.data.documents || []
      );

    } catch (error) {

      console.error(
        "Load documents error:",
        error
      );

      setError(
        error.response?.data?.message ||
        "Unable to load documents."
      );

    } finally {

      setLoading(false);

    }
  };

  /* ===================================================
     LOAD DOCUMENTS WHEN PAGE OPENS
     =================================================== */

  useEffect(() => {
    loadDocuments();
  }, []);

  /* ===================================================
     FILE SELECTION
     =================================================== */

  const handleFileChange = (event) => {

    const file = event.target.files?.[0];

    setError("");

    setSuccess("");

    if (!file) {

      setSelectedFile(null);

      return;
    }

    /* -----------------------------------------------
       Allowed file types
       ----------------------------------------------- */

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png"
    ];

    if (!allowedTypes.includes(file.type)) {

      setSelectedFile(null);

      event.target.value = "";

      setError(
        "Only PDF, JPG and PNG files are allowed."
      );

      return;
    }

    /* -----------------------------------------------
       Maximum file size: 10 MB
       ----------------------------------------------- */

    if (file.size > 10 * 1024 * 1024) {

      setSelectedFile(null);

      event.target.value = "";

      setError(
        "File is too large. Maximum size is 10 MB."
      );

      return;
    }

    setSelectedFile(file);
  };

  /* ===================================================
     UPLOAD DOCUMENT
     =================================================== */

  const handleUpload = async (event) => {

    event.preventDefault();

    setError("");

    setSuccess("");

    /* -----------------------------------------------
       Make sure a file was selected
       ----------------------------------------------- */

    if (!selectedFile) {

      setError(
        "Please select a document."
      );

      return;
    }

    try {

      setUploading(true);

      /* ---------------------------------------------
         Create multipart form data
         --------------------------------------------- */

      const formData = new FormData();

      formData.append(
        "document",
        selectedFile
      );

      formData.append(
        "type",
        documentType
      );

      /* ---------------------------------------------
         Send file to backend
         --------------------------------------------- */

      await axios.post(
        API,
        formData,
        {
          withCredentials: true
        }
      );

      /* ---------------------------------------------
         Success
         --------------------------------------------- */

      setSuccess(
        "Document uploaded successfully. It is now pending verification."
      );

      /* ---------------------------------------------
         Reset form
         --------------------------------------------- */

      setSelectedFile(null);

      event.target.reset();

      setDocumentType("AADHAAR");

      /* ---------------------------------------------
         Reload documents
         --------------------------------------------- */

      await loadDocuments();

    } catch (error) {

      console.error(
        "Upload error:",
        error
      );

      setError(
        error.response?.data?.message ||
        "Unable to upload document."
      );

    } finally {

      setUploading(false);

    }
  };

  /* ===================================================
     PAGE
     =================================================== */

  return (

    <div className="page">

      {/* =================================================
          HEADER
          ================================================= */}

      <div className="page-header">

        <h1>
          Document Verification
        </h1>

        <p>
          Upload your documents and track their
          verification status.
        </p>

      </div>

      {/* =================================================
          ERROR MESSAGE
          ================================================= */}

      {error && (

        <div className="error-message">
          {error}
        </div>

      )}

      {/* =================================================
          SUCCESS MESSAGE
          ================================================= */}

      {success && (

        <div className="success-message">
          {success}
        </div>

      )}

      {/* =================================================
          UPLOAD SECTION
          ================================================= */}

      <section className="card">

        <h2>
          Upload Document
        </h2>

        <p className="section-description">
          Upload a PDF, JPG or PNG file.
          Maximum file size is 10 MB.
        </p>

        <form onSubmit={handleUpload}>

          {/* ---------------------------------------------
              DOCUMENT TYPE
              --------------------------------------------- */}

          <div className="form-group">

            <label htmlFor="documentType">
              Document Type
            </label>

            <select
              id="documentType"
              value={documentType}
              onChange={(event) =>
                setDocumentType(
                  event.target.value
                )
              }
            >

              <option value="AADHAAR">
                Aadhaar
              </option>

              <option value="PAN">
                PAN
              </option>

              <option value="DEGREE">
                Degree Certificate
              </option>

              <option value="ADDRESS_PROOF">
                Address Proof
              </option>

              <option value="OTHER">
                Other
              </option>

            </select>

          </div>

          {/* ---------------------------------------------
              FILE INPUT
              --------------------------------------------- */}

          <div className="form-group">

            <label htmlFor="document">
              Select File
            </label>

            <input
              id="document"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
            />

          </div>

          {/* ---------------------------------------------
              SELECTED FILE
              --------------------------------------------- */}

          {selectedFile && (

            <div className="selected-file">

              <strong>
                Selected file:
              </strong>{" "}

              {selectedFile.name}

            </div>

          )}

          {/* ---------------------------------------------
              UPLOAD BUTTON
              --------------------------------------------- */}

          <button
            type="submit"
            disabled={
              uploading ||
              !selectedFile
            }
          >

            {uploading
              ? "Uploading..."
              : "Upload Document"}

          </button>

        </form>

      </section>

      {/* =================================================
          DOCUMENT LIST
          ================================================= */}

      <section className="card">

        <h2>
          My Documents
        </h2>

        {/* -----------------------------------------------
            LOADING
            ----------------------------------------------- */}

        {loading ? (

          <p>
            Loading documents...
          </p>

        ) : documents.length === 0 ? (

          /* ---------------------------------------------
             EMPTY STATE
             --------------------------------------------- */

          <p>
            No documents submitted yet.
          </p>

        ) : (

          /* ---------------------------------------------
             DOCUMENT TABLE
             --------------------------------------------- */

          <div className="table-container">

            <table>

              <thead>

                <tr>

                  <th>
                    Document
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Submitted
                  </th>

                  <th>
                    Verification
                  </th>

                  <th>
                    File
                  </th>

                </tr>

              </thead>

              <tbody>

                {documents.map(
                  (document) => (

                    <tr
                      key={document.id}
                    >

                      {/* DOCUMENT TYPE */}

                      <td>
                        {formatDocumentType(
                          document.type
                        )}
                      </td>

                      {/* STATUS */}

                      <td>

                        <span
                          className={`status-badge ${getStatusClass(
                            document.status
                          )}`}
                        >
                          {formatStatus(
                            document.status
                          )}
                        </span>

                      </td>

                      {/* SUBMITTED DATE */}

                      <td>

                        {new Date(
                          document.createdAt
                        ).toLocaleDateString(
                          "en-IN"
                        )}

                      </td>

                      {/* VERIFICATION */}

                      <td>

                        {document.status ===
                        "VERIFIED"

                          ? "Verified"

                          : document.status ===
                            "REJECTED"

                          ? document.rejectionReason ||
                            "Rejected"

                          : "Pending verification"}

                      </td>

                      {/* FILE */}

                      <td>

                        <button
                          type="button"
                          onClick={() => handleViewDocument(document)}
                          disabled={viewingId === document.id}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#2563eb",
                            textDecoration: "underline",
                            cursor: "pointer",
                            padding: 0,
                            font: "inherit"
                          }}
                        >
                          {viewingId === document.id ? "Loading..." : "View"}
                        </button>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </div>
  );
}

/* =====================================================
   EXPORT
   ===================================================== */

export default Documents;
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const prisma = require("../lib/prisma");
const authenticateToken = require("../middleware/auth");
const {
  supabase,
  isSupabaseConfigured,
  BUCKET_NAME
} = require("../lib/supabase");

const router = express.Router();

/* =====================================================
   LOCAL UPLOAD DIRECTORY (Development Fallback & Legacy)
   ===================================================== */

const uploadDirectory = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

/* =====================================================
   MULTER CONFIGURATION (In-Memory Buffer)
   ===================================================== */

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png"
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Only PDF, JPG and PNG files are allowed.")
      );
    }
  }
});

/* =====================================================
   GET /api/documents
   Get all documents for logged-in employee
   ===================================================== */

router.get("/", authenticateToken, async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: {
        userId: req.user.userId
      }
    });

    if (!employee) {
      return res.status(404).json({
        message: "Employee profile not found."
      });
    }

    const documents = await prisma.document.findMany({
      where: {
        employeeId: employee.id
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json({
      documents
    });
  } catch (error) {
    console.error("Documents error:", error);

    res.status(500).json({
      message: "Unable to load documents."
    });
  }
});

/* =====================================================
   POST /api/documents
   Upload a new document
   ===================================================== */

router.post(
  "/",
  authenticateToken,
  upload.single("document"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Please select a document to upload."
        });
      }

      const employee = await prisma.employee.findUnique({
        where: {
          userId: req.user.userId
        }
      });

      if (!employee) {
        return res.status(404).json({
          message: "Employee profile not found."
        });
      }

      const allowedDocumentTypes = [
        "AADHAAR",
        "PAN",
        "DEGREE",
        "ADDRESS_PROOF",
        "OTHER"
      ];

      const documentType = req.body.type;

      if (!allowedDocumentTypes.includes(documentType)) {
        return res.status(400).json({
          message: "Invalid document type."
        });
      }

      const extension = path.extname(req.file.originalname);
      const uniqueName =
        `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
      let fileUrl;

      if (isSupabaseConfigured) {
        const objectPath = `employee-documents/${employee.id}/${uniqueName}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(objectPath, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false
          });

        if (uploadError) {
          console.error("Supabase Storage upload error:", uploadError);
          return res.status(500).json({
            message: "Failed to upload document to storage."
          });
        }

        fileUrl = objectPath;
      } else {
        // In production, missing Supabase Storage configuration must fail closed
        if (process.env.NODE_ENV === "production") {
          return res.status(500).json({
            message: "Document storage service is not configured."
          });
        }

        // Local development fallback
        const localFilePath = path.join(uploadDirectory, uniqueName);
        fs.writeFileSync(localFilePath, req.file.buffer);
        fileUrl = `/uploads/${uniqueName}`;
      }

      const document = await prisma.document.create({
        data: {
          employeeId: employee.id,
          type: documentType,
          fileUrl,
          status: "PENDING"
        }
      });

      res.status(201).json({
        message: "Document uploaded successfully.",
        document
      });
    } catch (error) {
      console.error("Document upload error:", error);

      res.status(500).json({
        message: "Unable to upload document."
      });
    }
  }
);

/* =====================================================
   GET /api/documents/:id/view
   Get signed URL (or legacy local URL) to view document
   ===================================================== */

router.get("/:id/view", authenticateToken, async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: {
        id: req.params.id
      },
      include: {
        employee: true
      }
    });

    if (!document) {
      return res.status(404).json({
        message: "Document not found."
      });
    }

    const isHRorAdmin =
      req.user.role === "HR" || req.user.role === "ADMIN";
    const isOwner =
      document.employee?.userId === req.user.userId;

    if (!isHRorAdmin && !isOwner) {
      return res.status(403).json({
        message: "Access denied."
      });
    }

    // Legacy local uploads
    if (document.fileUrl.startsWith("/uploads/")) {
      const fullLocalUrl = `${req.protocol}://${req.get("host")}${document.fileUrl}`;
      return res.json({
        url: fullLocalUrl,
        legacy: true
      });
    }

    // Supabase Private Storage Signed URL (5 minutes / 300 seconds)
    if (!isSupabaseConfigured) {
      return res.status(500).json({
        message: "Document storage service is not configured."
      });
    }

    const { data, error: signedUrlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(document.fileUrl, 300);

    if (signedUrlError || !data?.signedUrl) {
      console.error("Supabase createSignedUrl error:", signedUrlError);
      return res.status(500).json({
        message: "Failed to generate document view URL."
      });
    }

    return res.json({
      url: data.signedUrl
    });
  } catch (error) {
    console.error("Document view error:", error);

    res.status(500).json({
      message: "Unable to retrieve document view URL."
    });
  }
});

/* =====================================================
   GET /api/documents/:id
   Get one document belonging to logged-in employee
   ===================================================== */

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: {
        userId: req.user.userId
      }
    });

    if (!employee) {
      return res.status(404).json({
        message: "Employee profile not found."
      });
    }

    const document = await prisma.document.findFirst({
      where: {
        id: req.params.id,
        employeeId: employee.id
      }
    });

    if (!document) {
      return res.status(404).json({
        message: "Document not found."
      });
    }

    res.json({
      document
    });
  } catch (error) {
    console.error("Document details error:", error);

    res.status(500).json({
      message: "Unable to load document."
    });
  }
});

/* =====================================================
   MULTER ERROR HANDLER
   ===================================================== */

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "File is too large. Maximum size is 10 MB."
      });
    }

    return res.status(400).json({
      message: error.message
    });
  }

  if (error) {
    return res.status(400).json({
      message: error.message
    });
  }

  next();
});

/* =====================================================
   EXPORT ROUTER
   ===================================================== */

module.exports = router;
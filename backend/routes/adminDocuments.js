const express = require("express");
const prisma = require("../lib/prisma");
const authenticateToken = require("../middleware/auth");
const {
  supabase,
  isSupabaseConfigured,
  BUCKET_NAME
} = require("../lib/supabase");

const router = express.Router();

/* =====================================================
   HR / ADMIN AUTHORIZATION
===================================================== */

function requireHRorAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required."
    });
  }

  if (req.user.role !== "HR" && req.user.role !== "ADMIN") {
    return res.status(403).json({
      message: "HR or Admin access required."
    });
  }

  next();
}

/* =====================================================
   GET ALL EMPLOYEE DOCUMENTS
   GET /api/admin/documents
===================================================== */

router.get(
  "/",
  authenticateToken,
  requireHRorAdmin,
  async (req, res) => {
    try {
      const documents = await prisma.document.findMany({
        include: {
          employee: true
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      return res.json(documents);
    } catch (error) {
      console.error("GET ADMIN DOCUMENTS ERROR:");
      console.error(error);

      return res.status(500).json({
        message: "Failed to load employee documents.",
        error: error.message
      });
    }
  }
);

/* =====================================================
   GET SIGNED URL FOR DOCUMENT
   GET /api/admin/documents/:id/view
===================================================== */

router.get(
  "/:id/view",
  authenticateToken,
  requireHRorAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const document = await prisma.document.findUnique({
        where: { id }
      });

      if (!document) {
        return res.status(404).json({
          message: "Document not found."
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
      console.error("ADMIN GET DOCUMENT VIEW ERROR:", error);
      return res.status(500).json({
        message: "Unable to retrieve document view URL."
      });
    }
  }
);

/* =====================================================
   VERIFY DOCUMENT
   PATCH /api/admin/documents/:id/verify
===================================================== */

router.patch(
  "/:id/verify",
  authenticateToken,
  requireHRorAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const document = await prisma.document.findUnique({
        where: {
          id
        }
      });

      if (!document) {
        return res.status(404).json({
          message: "Document not found."
        });
      }

      const updatedDocument = await prisma.document.update({
        where: {
          id
        },
        data: {
          status: "VERIFIED",
          verifiedById: req.user.userId,
          verifiedAt: new Date(),
          rejectionReason: null
        },
        include: {
          employee: true
        }
      });

      return res.json({
        message: "Document verified successfully.",
        document: updatedDocument
      });
    } catch (error) {
      console.error("VERIFY DOCUMENT ERROR:");
      console.error(error);

      return res.status(500).json({
        message: "Failed to verify document.",
        error: error.message
      });
    }
  }
);

/* =====================================================
   REJECT DOCUMENT
   PATCH /api/admin/documents/:id/reject
===================================================== */

router.patch(
  "/:id/reject",
  authenticateToken,
  requireHRorAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || !reason.trim()) {
        return res.status(400).json({
          message: "Rejection reason is required."
        });
      }

      const document = await prisma.document.findUnique({
        where: {
          id
        }
      });

      if (!document) {
        return res.status(404).json({
          message: "Document not found."
        });
      }

      const updatedDocument = await prisma.document.update({
        where: {
          id
        },
        data: {
          status: "REJECTED",
          verifiedById: req.user.userId,
          verifiedAt: new Date(),
          rejectionReason: reason.trim()
        },
        include: {
          employee: true
        }
      });

      return res.json({
        message: "Document rejected successfully.",
        document: updatedDocument
      });
    } catch (error) {
      console.error("REJECT DOCUMENT ERROR:");
      console.error(error);

      return res.status(500).json({
        message: "Failed to reject document.",
        error: error.message
      });
    }
  }
);

module.exports = router;
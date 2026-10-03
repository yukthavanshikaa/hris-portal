/**
 * Company Knowledge Base
 * Structured company policies, workflows, procedures, and departmental information
 * used by the Company Assistant.
 */

const COMPANY_KNOWLEDGE = {
  company: {
    name: "HRIS Portal Enterprise",
    workingHours: "Monday to Friday, 9:00 AM to 6:00 PM IST (Flexible check-in between 8:30 AM - 9:30 AM)",
    workModel: "Hybrid work model with core collaboration hours from 10:00 AM to 4:30 PM",
    officialHolidaysPerYear: 10
  },

  attendance: {
    title: "Attendance & Working Hours Policy",
    summary: "Employees are required to mark attendance daily via the employee portal.",
    procedure: "Navigate to the Attendance page (/attendance) and click 'Check In' upon starting work. Click 'Check Out' when completing your workday.",
    workingHours: "Standard 8 working hours per day excluding 1-hour lunch break.",
    lateArrival: "Check-ins after 10:00 AM without prior manager notice are flagged for review."
  },

  leave: {
    title: "Leave Policy & Application Workflow",
    entitlements: {
      casual: "12 days of Casual Leave (CL) per year for short personal reasons (max 3 consecutive days).",
      sick: "12 days of Sick Leave (SL) per year for medical recovery. Medical certificate required for 3+ consecutive days.",
      earned: "15 days of Earned/Privilege Leave (EL) per year for planned vacations and personal time off."
    },
    totalDays: 39,
    procedure: "To apply for leave, open the Leave module (/leave), select the leave category (Casual, Sick, Earned, or Other), select your start and end dates, provide a brief reason, and submit. Your request will be reviewed by HR/management under Leave Approvals (/hr/leave).",
    cancellation: "Pending leave requests can be cancelled or modified before HR review."
  },

  documents: {
    title: "Employee Document Verification Policy",
    allowedTypes: ["Aadhaar", "PAN", "Degree Certificate", "Address Proof", "Other"],
    allowedFormats: "PDF, JPG, JPEG, PNG",
    maxFileSize: "10 MB per document",
    storage: "Documents are securely uploaded and stored in private encrypted storage with temporary time-limited access URLs.",
    procedure: "Go to the Documents module (/documents), choose the Document Type from the dropdown, select your file (PDF/JPG/PNG up to 10 MB), and click 'Upload Document'. HR reviews submissions in Document Verification (/hr/documents)."
  },

  payroll: {
    title: "Payroll & Compensation Schedule",
    payoutDate: "Salaries are processed and credited on the last working day of each calendar month.",
    components: "Basic Salary, House Rent Allowance (HRA), Special Allowances, and Statutory Deductions (Provident Fund, Professional Tax, TDS).",
    procedure: "You can view your latest salary slip, gross earnings, deduction breakdown, and net pay in the Payroll module (/payroll)."
  },

  departments: [
    {
      name: "Executive",
      head: "Arjun Mehta (Chief Executive Officer)",
      description: "Executive management, strategic direction, and company governance."
    },
    {
      name: "Technology",
      head: "Rohan Kapoor (Chief Technology Officer)",
      description: "Architecture, infrastructure, technological innovation, and engineering leadership."
    },
    {
      name: "Engineering",
      head: "Vikram Rao (Engineering Manager)",
      description: "Core software engineering, full-stack application development, and quality assurance."
    },
    {
      name: "Product",
      head: "Ananya Reddy (Product Manager)",
      description: "Product roadmap, user experience design, and feature strategy."
    },
    {
      name: "Human Resources",
      head: "Priya Sharma (Chief Human Resources Officer)",
      description: "Talent acquisition, employee relations, onboarding, performance, and HR operations."
    },
    {
      name: "Finance",
      head: "Neha Iyer (Chief Financial Officer)",
      description: "Financial planning, accounting, payroll administration, compliance, and budget management."
    },
    {
      name: "Sales",
      head: "Armaan Khan (Sales Executive)",
      description: "Client partnerships, revenue generation, and business development."
    },
    {
      name: "Marketing",
      head: "Divya Patel (Marketing Executive)",
      description: "Brand identity, communications, and digital marketing."
    }
  ],

  support: {
    hrEmail: "hr@hris.com",
    portalHelp: "For portal-related issues, contact the HR team or reach out to internal IT support."
  }
};

module.exports = COMPANY_KNOWLEDGE;

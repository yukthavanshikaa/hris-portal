/**
 * Company Assistant Service
 * Natural language intent parsing, database grounding, security guardrails,
 * and authoritative knowledge base integration.
 */

const prisma = require("./prisma");
const COMPANY_KNOWLEDGE = require("./knowledgeBase");

// Restricted keywords that ordinary employees must not query
const RESTRICTED_SECRET_PATTERNS = [
  /password/i,
  /hash/i,
  /jwt/i,
  /secret/i,
  /token/i,
  /database_url/i,
  /direct_url/i,
  /api[_-]?key/i,
  /supabase[_-]?service/i,
  /\.env/i,
  /credential/i
];

const RESTRICTED_PEER_DATA_PATTERNS = [
  /(?:what is|how much is|tell me|show me|get)\s+([a-zA-Z\s]+)'s\s+(?:salary|pay|compensation|ctc|package|payroll|payslip)/i,
  /salary of ([a-zA-Z\s]+)/i,
  /payroll of ([a-zA-Z\s]+)/i,
  /leave balance of ([a-zA-Z\s]+)/i,
  /how many leaves (?:does|has)\s+([a-zA-Z\s]+)\s+have/i,
  /document(?:s)? of ([a-zA-Z\s]+)/i,
  /aadhaar of ([a-zA-Z\s]+)/i,
  /pan of ([a-zA-Z\s]+)/i
];

/**
 * Format an employee's display title
 */
function formatEmployeeName(emp) {
  if (!emp) return "Unknown";
  return `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
}

/**
 * Process a user's question with database grounding and safety controls
 * @param {string} userMessage
 * @param {object} user - Authenticated user from JWT { userId, role, ... }
 */
async function processAssistantQuery(userMessage, user) {
  const query = (userMessage || "").trim();
  const lowerQuery = query.toLowerCase();

  if (!query) {
    return {
      answer: "Hello! How can I help you today? You can ask me about your manager, leave balance, company policies, document verification, or employee directory.",
      sources: ["Company Assistant"]
    };
  }

  // -------------------------------------------------------------
  // 1. SECURITY FILTER: System Secrets & Credentials (Blocked for all)
  // -------------------------------------------------------------
  for (const pattern of RESTRICTED_SECRET_PATTERNS) {
    if (pattern.test(lowerQuery)) {
      return {
        answer: "I cannot disclose system credentials, security tokens, passwords, database configurations, or environment variables. Company security policies strictly prohibit sharing internal technical parameters.",
        sources: ["HRIS Security Policy"]
      };
    }
  }

  // Fetch current user's employee record if available
  const currentEmployee = await prisma.employee.findUnique({
    where: { userId: user.userId },
    include: {
      manager: true,
      leaveBalance: true,
      directReports: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          designation: true,
          department: true,
          employeeCode: true
        }
      }
    }
  });

  const isHRorAdmin = ["HR", "ADMIN"].includes(user.role);

  // =============================================================
  // HR & ADMIN OPERATIONAL COMMANDS (Organization-Wide Grounded Data)
  // Only HR and ADMIN roles are authorized.
  // Non-HR roles receive the strict permission denial message.
  // =============================================================
  const HR_PERMISSION_DENIAL = {
    answer: "This inquiry requires HR or Administrator permissions. Individual employee queries are limited to your personal records.",
    sources: ["HR Access Control Policy"]
  };

  // 1. PENDING LEAVE REQUESTS
  if (
    (lowerQuery.includes("pending leave") ||
     lowerQuery.includes("leave requests pending") ||
     lowerQuery.includes("pending leave requests") ||
     (lowerQuery.includes("pending") && lowerQuery.includes("leave"))) &&
    !lowerQuery.includes("my leave") &&
    !lowerQuery.includes("my pending")
  ) {
    if (!isHRorAdmin) {
      return HR_PERMISSION_DENIAL;
    }

    const pendingLeaves = await prisma.leaveRequest.findMany({
      where: { status: "PENDING" },
      include: { employee: true },
      orderBy: { createdAt: "desc" }
    });

    if (pendingLeaves.length === 0) {
      return {
        answer: "There are currently no pending leave requests awaiting approval. You can review all leave records in the Leave Approval module (/hr/leave).",
        sources: ["Leave Approvals (Database)"]
      };
    }

    const leaveItems = pendingLeaves.slice(0, 10).map((r, idx) => {
      const empName = formatEmployeeName(r.employee);
      const startStr = r.startDate ? new Date(r.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
      const endStr = r.endDate ? new Date(r.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
      return `${idx + 1}. ${empName} — ${r.type} Leave (${startStr} to ${endStr}) [Status: ${r.status}]`;
    }).join("\n");

    return {
      answer: `There ${pendingLeaves.length === 1 ? "is 1 pending leave request" : `are ${pendingLeaves.length} pending leave requests`} awaiting HR approval:\n${leaveItems}${pendingLeaves.length > 10 ? `\n...and ${pendingLeaves.length - 10} more.` : ""}\n\nYou can review, approve, or reject these requests in the Leave Approval module (/hr/leave).`,
      sources: ["Leave Approvals (Database)"]
    };
  }

  // 2. TODAY'S ATTENDANCE SUMMARY
  if (
    (lowerQuery.includes("attendance summary") ||
     lowerQuery.includes("today's attendance") ||
     lowerQuery.includes("todays attendance") ||
     lowerQuery.includes("attendance today") ||
     (lowerQuery.includes("today") && lowerQuery.includes("attendance") && !lowerQuery.includes("my"))) &&
    !lowerQuery.includes("my attendance") &&
    !lowerQuery.includes("did i check in") &&
    !lowerQuery.includes("have i checked in") &&
    !lowerQuery.includes("my check in")
  ) {
    if (!isHRorAdmin) {
      return HR_PERMISSION_DENIAL;
    }

    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const todayISTStr = formatter.format(new Date());
    const startOfDay = new Date(`${todayISTStr}T00:00:00+05:30`);
    const endOfDay = new Date(`${todayISTStr}T23:59:59.999+05:30`);

    const dateRecords = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: {
        id: true,
        status: true
      }
    });

    const totalRecords = dateRecords.length;
    const presentCount = dateRecords.filter(r => r.status === "PRESENT").length;
    const lateCount = dateRecords.filter(r => r.status === "LATE").length;
    const halfDayCount = dateRecords.filter(r => r.status === "HALF_DAY").length;
    const absentCount = dateRecords.filter(r => r.status === "ABSENT").length;
    const leaveCount = dateRecords.filter(r => r.status === "LEAVE").length;

    return {
      answer: `Today's Attendance Summary (${todayISTStr} IST):
• Total Records: ${totalRecords}
• Present: ${presentCount}
• Late: ${lateCount}
• Half-day: ${halfDayCount}
• Absent: ${absentCount}
• Leave: ${leaveCount}

You can view real-time logs and manage attendance records in the Attendance module (/hr/attendance).`,
      sources: ["Attendance Records (Database)"]
    };
  }

  // 3. PAYROLL SUMMARY
  const monthNamesMap = {
    january: 1, jan: 1,
    february: 2, feb: 2,
    march: 3, mar: 3,
    april: 4, apr: 4,
    may: 5,
    june: 6, jun: 6,
    july: 7, jul: 7,
    august: 8, aug: 8,
    september: 9, sep: 9, sept: 9,
    october: 10, oct: 10,
    november: 11, nov: 11,
    december: 12, dec: 12
  };

  const isPayrollSummary =
    (lowerQuery.includes("summarize payroll") ||
     lowerQuery.includes("payroll summary") ||
     (lowerQuery.includes("payroll") && (
       Object.keys(monthNamesMap).some(m => new RegExp(`\\b${m}\\b`, "i").test(lowerQuery)) ||
       /\b(?:20\d\d)\b/.test(lowerQuery)
     ))) &&
    !lowerQuery.includes("my salary") &&
    !lowerQuery.includes("my payroll") &&
    !lowerQuery.includes("my pay") &&
    !lowerQuery.includes("my payslip") &&
    !lowerQuery.includes("when is salary") &&
    !lowerQuery.includes("salary date");

  if (isPayrollSummary) {
    if (!isHRorAdmin) {
      return HR_PERMISSION_DENIAL;
    }

    const yearMatch = query.match(/\b(20\d\d)\b/);
    const targetYear = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

    let targetMonth = null;
    for (const [mName, mNum] of Object.entries(monthNamesMap)) {
      if (new RegExp(`\\b${mName}\\b`, "i").test(lowerQuery)) {
        targetMonth = mNum;
        break;
      }
    }
    if (!targetMonth) {
      const numMonthMatch = lowerQuery.match(/\b(?:month\s*(\d{1,2})|(\d{1,2})\/(?:20\d\d))\b/);
      if (numMonthMatch) {
        const parsed = parseInt(numMonthMatch[1] || numMonthMatch[2], 10);
        if (parsed >= 1 && parsed <= 12) targetMonth = parsed;
      }
    }
    if (!targetMonth) {
      targetMonth = new Date().getMonth() + 1;
    }

    const fullMonthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const displayMonth = fullMonthNames[targetMonth - 1] || `Month ${targetMonth}`;

    const payrollRecords = await prisma.payroll.findMany({
      where: {
        month: targetMonth,
        year: targetYear
      }
    });

    const employeesPaid = payrollRecords.length;
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    for (const p of payrollRecords) {
      totalGross += Number(p.grossSalary || 0);
      totalDeductions += Number(p.deductions || 0);
      totalNet += Number(p.netSalary || 0);
    }

    if (employeesPaid === 0) {
      return {
        answer: `No processed payroll records were found for ${displayMonth} ${targetYear}. You can generate and manage payroll batches in the Payroll Management module (/hr/payroll).`,
        sources: ["Payroll Records (Database)"]
      };
    }

    return {
      answer: `Payroll Summary for ${displayMonth} ${targetYear}:
• Employees Paid: ${employeesPaid}
• Total Gross: ₹${totalGross.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
• Total Deductions: ₹${totalDeductions.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
• Total Net: ₹${totalNet.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

You can review individual itemized payslips, generate records, and export CSV reports in the Payroll Management module (/hr/payroll).`,
      sources: ["Payroll Records (Database)"]
    };
  }

  // 4. EMPLOYEES BY DEPARTMENT
  if (
    lowerQuery.includes("employees by department") ||
    lowerQuery.includes("staff by department") ||
    lowerQuery.includes("department breakdown") ||
    lowerQuery.includes("headcount by department") ||
    (lowerQuery.includes("employees") && lowerQuery.includes("department") && (lowerQuery.includes("by") || lowerQuery.includes("breakdown") || lowerQuery.includes("show")))
  ) {
    if (!isHRorAdmin) {
      return HR_PERMISSION_DENIAL;
    }

    const allEmployees = await prisma.employee.findMany({
      select: {
        id: true,
        department: true,
        designation: true
      }
    });

    const deptMap = {};
    for (const emp of allEmployees) {
      const dept = emp.department ? emp.department.trim() : "Unassigned";
      if (!deptMap[dept]) {
        deptMap[dept] = { count: 0, designations: new Set() };
      }
      deptMap[dept].count += 1;
      if (emp.designation) {
        deptMap[dept].designations.add(emp.designation.trim());
      }
    }

    const deptEntries = Object.entries(deptMap).sort((a, b) => b[1].count - a[1].count);
    const totalEmployees = allEmployees.length;

    const deptLines = deptEntries.map(([dept, info]) => {
      const desigSummary = Array.from(info.designations).slice(0, 3).join(", ");
      return `• ${dept}: ${info.count} ${info.count === 1 ? "employee" : "employees"}${desigSummary ? ` (${desigSummary})` : ""}`;
    }).join("\n");

    return {
      answer: `Organization Headcount by Department (${totalEmployees} total employees):\n${deptLines}\n\nYou can view and manage all employee records in the Employee Management module (/hr/employees).`,
      sources: ["Employee Directory (Database)"]
    };
  }

  // 5. EMPLOYEES WITHOUT REPORTING MANAGER
  if (
    (lowerQuery.includes("without a reporting manager") ||
     lowerQuery.includes("without reporting manager") ||
     lowerQuery.includes("no reporting manager") ||
     lowerQuery.includes("unassigned manager") ||
     lowerQuery.includes("without a manager") ||
     lowerQuery.includes("without manager")) &&
    !lowerQuery.includes("my manager")
  ) {
    if (!isHRorAdmin) {
      return HR_PERMISSION_DENIAL;
    }

    const unassignedEmployees = await prisma.employee.findMany({
      where: {
        managerId: null
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
        department: true,
        designation: true
      },
      orderBy: {
        lastName: "asc"
      }
    });

    if (unassignedEmployees.length === 0) {
      return {
        answer: "All employees currently have a reporting manager assigned in the system. You can inspect the hierarchy in the Organization Chart (/hr/organization).",
        sources: ["Organization Hierarchy (Database)"]
      };
    }

    const lines = unassignedEmployees.map((e, idx) => {
      const name = formatEmployeeName(e);
      const code = e.employeeCode ? ` (${e.employeeCode})` : "";
      const roleInfo = [e.designation, e.department].filter(Boolean).join(" - ");
      return `${idx + 1}. ${name}${code}${roleInfo ? ` — ${roleInfo}` : ""}`;
    }).join("\n");

    return {
      answer: `There ${unassignedEmployees.length === 1 ? "is 1 employee" : `are ${unassignedEmployees.length} employees`} without an assigned reporting manager (typically executive leadership or unlinked profiles):\n${lines}\n\nYou can assign reporting managers in the Employee Management module (/hr/employees) or review the structure in the Organization Chart (/hr/organization).`,
      sources: ["Organization Hierarchy (Database)"]
    };
  }

  // 6. RECENT EMPLOYEE DOCUMENTS REQUIRING ATTENTION
  if (
    lowerQuery.includes("documents requiring attention") ||
    lowerQuery.includes("pending employee documents") ||
    lowerQuery.includes("documents pending review") ||
    lowerQuery.includes("documents pending") ||
    lowerQuery.includes("pending documents") ||
    (lowerQuery.includes("document") && (lowerQuery.includes("attention") || lowerQuery.includes("pending") || lowerQuery.includes("requiring review") || lowerQuery.includes("to verify")))
  ) {
    if (!isHRorAdmin) {
      return HR_PERMISSION_DENIAL;
    }

    const pendingDocs = await prisma.document.findMany({
      where: {
        status: "PENDING"
      },
      include: {
        employee: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (pendingDocs.length === 0) {
      return {
        answer: "There are currently no employee documents awaiting verification. All uploaded documents have been processed. You can review past documents in the Document Verification module (/hr/documents).",
        sources: ["Document Verification (Database)"]
      };
    }

    const docLines = pendingDocs.slice(0, 10).map((d, idx) => {
      const empName = formatEmployeeName(d.employee);
      const createdDate = d.createdAt
        ? new Date(d.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "-";
      return `${idx + 1}. ${empName} — ${d.type} (Submitted: ${createdDate}) [Status: ${d.status}]`;
    }).join("\n");

    return {
      answer: `There ${pendingDocs.length === 1 ? "is 1 employee document" : `are ${pendingDocs.length} employee documents`} requiring HR review and verification:\n${docLines}${pendingDocs.length > 10 ? `\n...and ${pendingDocs.length - 10} more.` : ""}\n\nYou can inspect, verify, or reject these submissions in the Document Verification module (/hr/documents).`,
      sources: ["Document Verification (Database)"]
    };
  }

  // -------------------------------------------------------------
  // 2. SECURITY FILTER: Other Employees' Private Data
  // -------------------------------------------------------------
  for (const pattern of RESTRICTED_PEER_DATA_PATTERNS) {
    const match = query.match(pattern);
    if (match) {
      const targetName = (match[1] || "").trim();
      const isSelf = currentEmployee &&
        targetName.toLowerCase() === `${currentEmployee.firstName} ${currentEmployee.lastName}`.toLowerCase();

      if (!isSelf && !isHRorAdmin) {
        return {
          answer: `I cannot disclose ${targetName ? `${targetName}'s` : "another employee's"} personal compensation, leave balance, or confidential HR documents. Access to private individual records is strictly restricted to the respective employee and authorized HR personnel.`,
          sources: ["HR Privacy & Confidentiality Policy"]
        };
      }
    }
  }

  // Generic peer salary / compensation probe
  if (!isHRorAdmin && (
    (lowerQuery.includes("salary") || lowerQuery.includes("payroll") || lowerQuery.includes("payslip")) &&
    (lowerQuery.includes("everyone") || lowerQuery.includes("other") || lowerQuery.includes("all") || lowerQuery.includes("colleague"))
  )) {
    return {
      answer: "Individual compensation and payroll data is strictly confidential. You may only view your own payroll details in the Payroll section (/payroll).",
      sources: ["HR Privacy Policy"]
    };
  }

  // -------------------------------------------------------------
  // 3. PERSONAL HR QUERIES (Authenticated User's Own Data)
  // -------------------------------------------------------------

  // Who is my manager / Who do I report to?
  if (
    lowerQuery.includes("my manager") ||
    lowerQuery.includes("who is my boss") ||
    lowerQuery.includes("who do i report to") ||
    lowerQuery.includes("who is my supervisor") ||
    lowerQuery.includes("my reporting manager")
  ) {
    if (!currentEmployee) {
      return {
        answer: "You are logged in with an administrative/HR system account that does not have an attached reporting employee profile.",
        sources: ["User Account"]
      };
    }

    if (!currentEmployee.manager) {
      return {
        answer: `You (${formatEmployeeName(currentEmployee)}, ${currentEmployee.designation}) do not have a reporting manager assigned in the system (e.g. Executive Leadership / CEO).`,
        sources: ["Employee Hierarchy (Database)"]
      };
    }

    const mgr = currentEmployee.manager;
    return {
      answer: `Your reporting manager is ${formatEmployeeName(mgr)}, ${mgr.designation} (${mgr.department}). You can contact them at ${mgr.email || "their company email"}.`,
      sources: ["Employee Hierarchy (Database)"]
    };
  }

  // My Leave Balance / How many leaves do I have?
  if (
    lowerQuery.includes("my leave") ||
    lowerQuery.includes("leaves do i have") ||
    lowerQuery.includes("my balance") ||
    lowerQuery.includes("leave balance") ||
    lowerQuery.includes("casual leave") ||
    lowerQuery.includes("sick leave") ||
    lowerQuery.includes("earned leave")
  ) {
    if (!currentEmployee) {
      return {
        answer: "No employee leave record is associated with your current account profile.",
        sources: ["Leave Records"]
      };
    }

    const balance = currentEmployee.leaveBalance;
    if (!balance) {
      return {
        answer: "Your leave balance record for the current year is not initialized. Please contact HR to set up your annual leave quota.",
        sources: ["Leave Records (Database)"]
      };
    }

    return {
      answer: `Here is your current leave balance for ${balance.year || 2026}:
• Casual Leave: ${balance.casualLeave ?? 0} days
• Sick Leave: ${balance.sickLeave ?? 0} days
• Earned Leave: ${balance.earnedLeave ?? 0} days
Total available leave: ${(balance.casualLeave ?? 0) + (balance.sickLeave ?? 0) + (balance.earnedLeave ?? 0)} days.
You can submit a leave request anytime under the Leave section (/leave).`,
      sources: ["Leave Balance (Database)"]
    };
  }

  // My attendance status today
  if (
    lowerQuery.includes("my attendance") ||
    lowerQuery.includes("did i check in") ||
    lowerQuery.includes("have i checked in") ||
    lowerQuery.includes("my check in")
  ) {
    if (!currentEmployee) {
      return {
        answer: "No employee attendance profile is linked to this account.",
        sources: ["Attendance System"]
      };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayRecord = await prisma.attendance.findFirst({
      where: {
        employeeId: currentEmployee.id,
        date: { gte: todayStart }
      }
    });

    if (!todayRecord || !todayRecord.checkIn) {
      return {
        answer: "You have not checked in yet today. Please visit the Attendance page (/attendance) to record your check-in.",
        sources: ["Attendance Records (Database)"]
      };
    }

    const checkInTime = new Date(todayRecord.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const checkOutTime = todayRecord.checkOut
      ? new Date(todayRecord.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : null;

    return {
      answer: checkOutTime
        ? `You checked in today at ${checkInTime} and checked out at ${checkOutTime}. Status: ${todayRecord.status}.`
        : `You checked in today at ${checkInTime}. You have not checked out yet. Remember to check out at the end of your shift via /attendance.`,
      sources: ["Attendance Records (Database)"]
    };
  }

  // My payroll / salary (personal inquiry)
  if (
    lowerQuery.includes("my salary") ||
    lowerQuery.includes("my payroll") ||
    lowerQuery.includes("my pay") ||
    lowerQuery.includes("my payslip")
  ) {
    if (!currentEmployee) {
      return {
        answer: "No payroll profile is attached to this login.",
        sources: ["Payroll Records"]
      };
    }

    const latestPayroll = await prisma.payroll.findFirst({
      where: { employeeId: currentEmployee.id },
      orderBy: [{ year: "desc" }, { month: "desc" }]
    });

    if (!latestPayroll) {
      return {
        answer: "No processed payroll records were found for your account. Salaries are processed monthly and available in the Payroll module (/payroll).",
        sources: ["Payroll (Database)"]
      };
    }

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthStr = monthNames[(latestPayroll.month || 1) - 1] || `Month ${latestPayroll.month}`;

    return {
      answer: `Here is your latest payroll summary (${monthStr} ${latestPayroll.year}):
• Gross Salary: ₹${Number(latestPayroll.grossSalary).toLocaleString("en-IN")}
• Deductions: ₹${Number(latestPayroll.deductions).toLocaleString("en-IN")}
• Net Salary: ₹${Number(latestPayroll.netSalary).toLocaleString("en-IN")}
You can review the itemized breakdown anytime in the Payroll module (/payroll).`,
      sources: ["Payroll Records (Database)"]
    };
  }

  // -------------------------------------------------------------
  // 4. ORGANIZATION DIRECTORY & LEADERSHIP LOOKUPS
  // -------------------------------------------------------------

  // Who is the CEO / CTO / CFO / CHRO / Engineering Manager / Product Manager?
  const leadershipDesignations = [
    { key: "ceo", title: "Chief Executive Officer", match: /(?:who is the\s+)?(?:ceo|chief executive officer)/i },
    { key: "cto", title: "Chief Technology Officer", match: /(?:who is the\s+)?(?:cto|chief technology officer)/i },
    { key: "chro", title: "Chief Human Resources Officer", match: /(?:who is the\s+)?(?:chro|chief human resources officer|head of hr)/i },
    { key: "cfo", title: "Chief Financial Officer", match: /(?:who is the\s+)?(?:cfo|chief financial officer|head of finance)/i },
    { key: "em", title: "Engineering Manager", match: /(?:who is the\s+)?(?:engineering manager|eng manager)/i },
    { key: "pm", title: "Product Manager", match: /(?:who is the\s+)?(?:product manager|head of product)/i },
    { key: "hrm", title: "HR Manager", match: /(?:who is the\s+)?(?:hr manager)/i }
  ];

  for (const roleDef of leadershipDesignations) {
    if (roleDef.match.test(lowerQuery)) {
      const leader = await prisma.employee.findFirst({
        where: {
          designation: {
            contains: roleDef.title,
            mode: "insensitive"
          }
        },
        include: {
          manager: true,
          directReports: {
            select: { firstName: true, lastName: true, designation: true }
          }
        }
      });

      if (leader) {
        const directReportsCount = leader.directReports.length;
        const reportsText = directReportsCount > 0
          ? ` They have ${directReportsCount} direct report${directReportsCount > 1 ? "s" : ""}.`
          : "";
        return {
          answer: `The ${roleDef.title} is ${formatEmployeeName(leader)} (${leader.department}). Employee Code: ${leader.employeeCode}.${reportsText} You can contact them at ${leader.email}.`,
          sources: ["Employee Directory (Database)"]
        };
      }
    }
  }

  // Who reports to [Name or Designation]?
  const reportsToMatch = query.match(/(?:who reports to|who are the direct reports of|direct reports of)\s+(?:the\s+)?([a-zA-Z\s]+)/i);
  if (reportsToMatch) {
    const target = reportsToMatch[1].trim();
    const manager = await prisma.employee.findFirst({
      where: {
        OR: [
          { designation: { contains: target, mode: "insensitive" } },
          { firstName: { contains: target.split(" ")[0], mode: "insensitive" } }
        ]
      },
      include: {
        directReports: {
          select: {
            firstName: true,
            lastName: true,
            designation: true,
            department: true,
            employeeCode: true
          }
        }
      }
    });

    if (manager) {
      if (!manager.directReports || manager.directReports.length === 0) {
        return {
          answer: `${formatEmployeeName(manager)} (${manager.designation}) currently has no direct reports assigned.`,
          sources: ["Organization Hierarchy (Database)"]
        };
      }

      const reportList = manager.directReports
        .map((r, i) => `${i + 1}. ${formatEmployeeName(r)} — ${r.designation} (${r.department})`)
        .join("\n");

      return {
        answer: `Here are the direct reports for ${formatEmployeeName(manager)} (${manager.designation}):\n${reportList}`,
        sources: ["Organization Hierarchy (Database)"]
      };
    }
  }

  // Department members lookup: "Who works in Engineering / HR / Finance / Product / Sales / Marketing?"
  const deptMatch = query.match(/(?:who works in|who is in|members of|employees in|team in)\s+([a-zA-Z\s]+)/i);
  if (deptMatch) {
    const deptName = deptMatch[1].trim().replace(/\?$/, "");
    const deptEmployees = await prisma.employee.findMany({
      where: {
        department: {
          contains: deptName,
          mode: "insensitive"
        }
      },
      orderBy: { designation: "asc" },
      select: {
        firstName: true,
        lastName: true,
        designation: true,
        employeeCode: true
      }
    });

    if (deptEmployees.length > 0) {
      const list = deptEmployees
        .map((e, idx) => `${idx + 1}. ${formatEmployeeName(e)} — ${e.designation} (${e.employeeCode})`)
        .join("\n");

      return {
        answer: `There are ${deptEmployees.length} employees in the ${deptName} department:\n${list}`,
        sources: ["Employee Directory (Database)"]
      };
    }
  }

  // -------------------------------------------------------------
  // 5. COMPANY POLICIES & KNOWLEDGE BASE FAQS
  // -------------------------------------------------------------

  // How to apply for leave?
  if (
    lowerQuery.includes("how to apply for leave") ||
    lowerQuery.includes("how do i apply for leave") ||
    lowerQuery.includes("apply for leave") ||
    lowerQuery.includes("request leave") ||
    lowerQuery.includes("take leave")
  ) {
    return {
      answer: `${COMPANY_KNOWLEDGE.leave.title}:
${COMPANY_KNOWLEDGE.leave.procedure}

Leave Categories:
• Casual Leave: ${COMPANY_KNOWLEDGE.leave.entitlements.casual}
• Sick Leave: ${COMPANY_KNOWLEDGE.leave.entitlements.sick}
• Earned Leave: ${COMPANY_KNOWLEDGE.leave.entitlements.earned}

Requests are typically reviewed within 24–48 hours.`,
      sources: ["Company Leave Policy", "HRIS Leave Guide"]
    };
  }

  // What documents can I upload / Document upload procedure
  if (
    lowerQuery.includes("document") ||
    lowerQuery.includes("upload") ||
    lowerQuery.includes("verification")
  ) {
    return {
      answer: `${COMPANY_KNOWLEDGE.documents.title}:
${COMPANY_KNOWLEDGE.documents.procedure}

Guidelines:
• Allowed Document Types: ${COMPANY_KNOWLEDGE.documents.allowedTypes.join(", ")}
• Supported File Formats: ${COMPANY_KNOWLEDGE.documents.allowedFormats}
• File Size Limit: ${COMPANY_KNOWLEDGE.documents.maxFileSize}
• Storage: ${COMPANY_KNOWLEDGE.documents.storage}`,
      sources: ["Document Verification Policy"]
    };
  }

  // Working hours & Attendance procedure
  if (
    lowerQuery.includes("working hour") ||
    lowerQuery.includes("work hour") ||
    lowerQuery.includes("office timing") ||
    lowerQuery.includes("attendance policy") ||
    lowerQuery.includes("how do i check in") ||
    lowerQuery.includes("how to mark attendance")
  ) {
    return {
      answer: `${COMPANY_KNOWLEDGE.attendance.title}:
• Working Hours: ${COMPANY_KNOWLEDGE.company.workingHours}
• Work Model: ${COMPANY_KNOWLEDGE.company.workModel}
• Daily Procedure: ${COMPANY_KNOWLEDGE.attendance.procedure}
• Lateness Guideline: ${COMPANY_KNOWLEDGE.attendance.lateArrival}`,
      sources: ["Company Attendance Policy"]
    };
  }

  // Payroll date / salary schedule
  if (
    lowerQuery.includes("when is salary") ||
    lowerQuery.includes("salary date") ||
    lowerQuery.includes("pay date") ||
    lowerQuery.includes("payout") ||
    lowerQuery.includes("when do we get paid")
  ) {
    return {
      answer: `${COMPANY_KNOWLEDGE.payroll.title}:
• Schedule: ${COMPANY_KNOWLEDGE.payroll.payoutDate}
• Salary Components: ${COMPANY_KNOWLEDGE.payroll.components}
• Accessing Payslips: ${COMPANY_KNOWLEDGE.payroll.procedure}`,
      sources: ["Company Payroll Policy"]
    };
  }

  // Departments list / Organization overview
  if (
    lowerQuery.includes("departments") ||
    lowerQuery.includes("organization structure") ||
    lowerQuery.includes("org chart") ||
    lowerQuery.includes("company structure")
  ) {
    const deptList = COMPANY_KNOWLEDGE.departments
      .map(d => `• ${d.name}: Led by ${d.head}`)
      .join("\n");

    return {
      answer: `Our organization consists of the following functional departments:\n${deptList}\n\nYou can explore the full interactive hierarchy on the Organization Chart page (/organization).`,
      sources: ["Company Organization Guide", "Employee Directory"]
    };
  }

  // HR Contact / Help
  if (
    lowerQuery.includes("contact hr") ||
    lowerQuery.includes("hr email") ||
    lowerQuery.includes("human resources contact")
  ) {
    return {
      answer: `You can reach the Human Resources team directly at ${COMPANY_KNOWLEDGE.support.hrEmail}. Priya Sharma is our Chief Human Resources Officer and Sneha Nair is the HR Manager.`,
      sources: ["HR Contact Directory"]
    };
  }

  // -------------------------------------------------------------
  // 6. DEFAULT / FALLBACK HELPFUL GUIDANCE
  // -------------------------------------------------------------
  return {
    answer: `I am your HRIS Company Assistant. I can help answer questions regarding:
• Your Reporting Hierarchy: "Who is my manager?" or "Who reports to the Engineering Manager?"
• Your Leave Balance: "How many leaves do I have?" or "How do I apply for leave?"
• Leadership & Directory: "Who is the CTO?" or "Who works in Engineering?"
• Company Policies: "What are the working hours?" or "What documents can I upload?"
• Payroll Schedule: "When is salary credited?"

Please let me know how I can assist you!`,
    sources: ["Company Assistant Knowledge Base"]
  };
}

module.exports = {
  processAssistantQuery
};

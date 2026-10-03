require("dotenv").config();

const bcrypt = require("bcryptjs");
const prisma = require("./lib/prisma");

async function main() {
  const seedPassword = process.env.SEED_EMPLOYEE_PASSWORD;

  if (!seedPassword || !seedPassword.trim()) {
    console.error(
      "ERROR: SEED_EMPLOYEE_PASSWORD environment variable is missing. It must be provided to seed the demo employee accounts."
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(seedPassword.trim(), 10);

  console.log("Starting realistic organization seeding...");

  // 18 Fictional demo employees defined in hierarchical order
  const employeesData = [
    // --- Level 1: Executive Leadership ---
    {
      key: "arjun",
      email: "arjun.mehta@hris.com",
      firstName: "Arjun",
      lastName: "Mehta",
      employeeCode: "EMP003",
      designation: "Chief Executive Officer",
      department: "Executive",
      role: "ADMIN",
      phone: "+91 98200 11001",
      dateOfJoining: new Date("2024-01-15"),
      managerKey: null
    },

    // --- Level 2: C-Suite & Department Heads (Report to Arjun Mehta) ---
    {
      key: "rohan",
      email: "rohan.kapoor@hris.com",
      firstName: "Rohan",
      lastName: "Kapoor",
      employeeCode: "EMP004",
      designation: "Chief Technology Officer",
      department: "Technology",
      role: "EMPLOYEE",
      phone: "+91 98200 11002",
      dateOfJoining: new Date("2024-02-01"),
      managerKey: "arjun"
    },
    {
      key: "priya",
      email: "priya.sharma@hris.com",
      firstName: "Priya",
      lastName: "Sharma",
      employeeCode: "EMP005",
      designation: "Chief Human Resources Officer",
      department: "Human Resources",
      role: "HR",
      phone: "+91 98200 11003",
      dateOfJoining: new Date("2024-02-15"),
      managerKey: "arjun"
    },
    {
      key: "neha",
      email: "neha.iyer@hris.com",
      firstName: "Neha",
      lastName: "Iyer",
      employeeCode: "EMP006",
      designation: "Chief Financial Officer",
      department: "Finance",
      role: "EMPLOYEE",
      phone: "+91 98200 11004",
      dateOfJoining: new Date("2024-03-01"),
      managerKey: "arjun"
    },
    {
      key: "ananya",
      email: "ananya.reddy@hris.com",
      firstName: "Ananya",
      lastName: "Reddy",
      employeeCode: "EMP007",
      designation: "Product Manager",
      department: "Product",
      role: "EMPLOYEE",
      phone: "+91 98200 11005",
      dateOfJoining: new Date("2024-04-01"),
      managerKey: "arjun"
    },
    {
      key: "armaan",
      email: "armaan.khan@hris.com",
      firstName: "Armaan",
      lastName: "Khan",
      employeeCode: "EMP008",
      designation: "Sales Executive",
      department: "Sales",
      role: "EMPLOYEE",
      phone: "+91 98200 11006",
      dateOfJoining: new Date("2024-08-15"),
      managerKey: "arjun"
    },
    {
      key: "divya",
      email: "divya.patel@hris.com",
      firstName: "Divya",
      lastName: "Patel",
      employeeCode: "EMP009",
      designation: "Marketing Executive",
      department: "Marketing",
      role: "EMPLOYEE",
      phone: "+91 98200 11007",
      dateOfJoining: new Date("2024-09-01"),
      managerKey: "arjun"
    },

    // --- Level 3: Mid Management ---
    {
      key: "vikram",
      email: "vikram.rao@hris.com",
      firstName: "Vikram",
      lastName: "Rao",
      employeeCode: "EMP010",
      designation: "Engineering Manager",
      department: "Engineering",
      role: "EMPLOYEE",
      phone: "+91 98200 11008",
      dateOfJoining: new Date("2024-03-15"),
      managerKey: "rohan"
    },
    {
      key: "sneha",
      email: "sneha.nair@hris.com",
      firstName: "Sneha",
      lastName: "Nair",
      employeeCode: "EMP011",
      designation: "HR Manager",
      department: "Human Resources",
      role: "HR",
      phone: "+91 98200 11009",
      dateOfJoining: new Date("2024-04-15"),
      managerKey: "priya"
    },

    // --- Level 4: Specialized Roles ---
    {
      key: "rahul",
      email: "rahul.verma@hris.com",
      firstName: "Rahul",
      lastName: "Verma",
      employeeCode: "EMP012",
      designation: "Recruiter",
      department: "Human Resources",
      role: "EMPLOYEE",
      phone: "+91 98200 11010",
      dateOfJoining: new Date("2024-05-01"),
      managerKey: "sneha"
    },
    {
      key: "pooja",
      email: "pooja.singh@hris.com",
      firstName: "Pooja",
      lastName: "Singh",
      employeeCode: "EMP013",
      designation: "Finance Executive",
      department: "Finance",
      role: "EMPLOYEE",
      phone: "+91 98200 11011",
      dateOfJoining: new Date("2024-08-01"),
      managerKey: "neha"
    },
    {
      key: "nikhil",
      email: "nikhil.jain@hris.com",
      firstName: "Nikhil",
      lastName: "Jain",
      employeeCode: "EMP014",
      designation: "UI/UX Designer",
      department: "Product",
      role: "EMPLOYEE",
      phone: "+91 98200 11012",
      dateOfJoining: new Date("2024-07-15"),
      managerKey: "ananya"
    },

    // --- Level 4: Engineering Team (Report to Vikram Rao) ---
    {
      key: "karthik",
      email: "karthik.rao@hris.com",
      firstName: "Karthik",
      lastName: "Rao",
      employeeCode: "EMP015",
      designation: "Senior Software Engineer",
      department: "Engineering",
      role: "EMPLOYEE",
      phone: "+91 98200 11013",
      dateOfJoining: new Date("2024-05-15"),
      managerKey: "vikram"
    },
    {
      key: "meera",
      email: "meera.shah@hris.com",
      firstName: "Meera",
      lastName: "Shah",
      employeeCode: "EMP016",
      designation: "Software Engineer",
      department: "Engineering",
      role: "EMPLOYEE",
      phone: "+91 98200 11014",
      dateOfJoining: new Date("2024-06-01"),
      managerKey: "vikram"
    },
    {
      key: "aditya",
      email: "aditya.kumar@hris.com",
      firstName: "Aditya",
      lastName: "Kumar",
      employeeCode: "EMP017",
      designation: "Software Engineer",
      department: "Engineering",
      role: "EMPLOYEE",
      phone: "+91 98200 11015",
      dateOfJoining: new Date("2024-06-15"),
      managerKey: "vikram"
    },
    {
      key: "ishita",
      email: "ishita.menon@hris.com",
      firstName: "Ishita",
      lastName: "Menon",
      employeeCode: "EMP018",
      designation: "QA Engineer",
      department: "Engineering",
      role: "EMPLOYEE",
      phone: "+91 98200 11016",
      dateOfJoining: new Date("2024-07-01"),
      managerKey: "vikram"
    },

    // --- Existing Test & Demo Accounts (Preserved & linked) ---
    {
      key: "test",
      email: "test.employee@hris.com",
      firstName: "Test",
      lastName: "Employee",
      employeeCode: "EMP002",
      designation: "Software Engineer",
      department: "Engineering",
      role: "EMPLOYEE",
      phone: "+91 98200 11017",
      dateOfJoining: new Date("2024-09-15"),
      managerKey: "vikram"
    },
    {
      key: "demo",
      email: "employee@hris.com",
      firstName: "Demo",
      lastName: "Employee",
      employeeCode: "EMP001",
      designation: "Software Trainee",
      department: "Technology",
      role: "EMPLOYEE",
      phone: "+91 99999 99999",
      dateOfJoining: new Date("2026-01-01"),
      managerKey: "vikram"
    }
  ];

  // Map to store created employee ID by key for linking managers
  const employeeIdMap = new Map();

  // Step 1: Create or update User & Employee records (without managerId first)
  for (const item of employeesData) {
    const user = await prisma.user.upsert({
      where: { email: item.email },
      update: {
        role: item.role,
        passwordHash
      },
      create: {
        email: item.email,
        passwordHash,
        role: item.role
      }
    });

    const employee = await prisma.employee.upsert({
      where: { userId: user.id },
      update: {
        firstName: item.firstName,
        lastName: item.lastName,
        employeeCode: item.employeeCode,
        email: item.email,
        phone: item.phone,
        department: item.department,
        designation: item.designation,
        dateOfJoining: item.dateOfJoining
      },
      create: {
        userId: user.id,
        firstName: item.firstName,
        lastName: item.lastName,
        employeeCode: item.employeeCode,
        email: item.email,
        phone: item.phone,
        department: item.department,
        designation: item.designation,
        dateOfJoining: item.dateOfJoining
      }
    });

    employeeIdMap.set(item.key, employee.id);

    // Upsert leave balance for year 2026
    await prisma.leaveBalance.upsert({
      where: {
        employeeId_year: {
          employeeId: employee.id,
          year: 2026
        }
      },
      update: {
        casualLeave: 12,
        sickLeave: 12,
        earnedLeave: 15
      },
      create: {
        employeeId: employee.id,
        year: 2026,
        casualLeave: 12,
        sickLeave: 12,
        earnedLeave: 15
      }
    });
  }

  // Step 2: Update manager relationships
  for (const item of employeesData) {
    const employeeId = employeeIdMap.get(item.key);
    const managerId = item.managerKey ? employeeIdMap.get(item.managerKey) : null;

    await prisma.employee.update({
      where: { id: employeeId },
      data: { managerId }
    });
  }

  console.log(`Successfully seeded ${employeesData.length} employees with reporting hierarchy and leave balances.`);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
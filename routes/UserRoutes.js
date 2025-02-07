const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: "benithalouange@gmail.com",
    pass: "pewa uhlk ydil sods",
  },
});




function generateRandomPassword(length = 12) {
  // Define character sets
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = '0123456789';
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  // Combine character sets
  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;

  // Ensure at least one character from each set
  const password = [
    uppercaseChars[crypto.randomInt(uppercaseChars.length)],
    lowercaseChars[crypto.randomInt(lowercaseChars.length)],
    numberChars[crypto.randomInt(numberChars.length)],
    specialChars[crypto.randomInt(specialChars.length)]
  ];

  // Fill the rest of the password with random characters
  while (password.length < length) {
    password.push(allChars[crypto.randomInt(allChars.length)]);
  }

  // Shuffle the password array
  for (let i = password.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [password[i], password[j]] = [password[j], password[i]];
  }

  return password.join('');
};

const authenticateUser = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

router.post('/employee/bulk-upload', async (req, res) => {
  try {
    const employeesData = req.body;
    const departments = await prisma.department.findMany();
    const failedEntries = [];

    const processedEmployees = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const employeeInput of employeesData) {
        try {
          // Find department by name
          const department = departments.find(d => d.name === employeeInput.department);

          // Check if user already exists
          let existingUser = await tx.user.findUnique({
            where: { email: employeeInput.email }
          });

          // If user doesn't exist, create user
          if (!existingUser) {
            const randomPassword = generateRandomPassword();
            const hashedPassword = await bcrypt.hash(randomPassword, 10);

            existingUser = await tx.user.create({
              data: {
                email: employeeInput.email,
                password: hashedPassword,
                firstName: employeeInput.firstName,
                lastName: employeeInput.lastName,
                role: 'EMPLOYEE'
              }
            });
          }

          // Check if employee already exists for this user
          let existingEmployee = await tx.employee.findUnique({
            where: { userId: existingUser.id }
          });

          // Prepare employee data
          const employeeData = {
            userId: existingUser.id,
            employeeNumber: existingEmployee?.employeeNumber || `RCF-${existingUser.id}`,
            departmentId: department?.id,
            designation: employeeInput.designation,
            dateOfBirth: employeeInput.dateOfBirth ? new Date(employeeInput.dateOfBirth) : undefined,
            gender: employeeInput.gender,
            phoneNumber: employeeInput.phoneNumber,
            address: employeeInput.address,
            status: employeeInput.status || 'ACTIVE'
          };

          if (existingEmployee) {
            // Update existing employee
            const updatedEmployee = await tx.employee.update({
              where: { id: existingEmployee.id },
              data: employeeData
            });
            results.push({ user: existingUser, employee: updatedEmployee });
          } else {
            // Create new employee
            const newEmployee = await tx.employee.create({
              data: employeeData
            });
            results.push({ user: existingUser, employee: newEmployee });
          }
        } catch (error) {
          failedEntries.push({ 
            data: employeeInput, 
            error: error.message 
          });
        }
      }

      return results;
    });

    res.status(201).json({
      success: processedEmployees.length,
      failed: failedEntries.length,
      failedEntries
    });
  } catch (error) {
    console.error('Bulk employee upload error:', error);
    res.status(400).json({ error: error.message });
  }
});

// register an employee

router.post('/register-employee', async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      // Employee-specific fields
      // employeeNumber,
      departmentId,  // Changed from department to departmentId
      designation,
      dateOfBirth,
      gender,
      phoneNumber,
      address,
      // joinDate,
      // salaryGrade,
      // emergencyContactName,
      // emergencyContactPhone,
      // bankAccountNumber,
      // panNumber,
      status = 'ACTIVE', // Default status if not provided
      // New field for reporting manager
      reportsToId
    } = req.body;

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate a random password
    const randomPassword = generateRandomPassword();
    console.log(randomPassword);

    // Hash the random password
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // Create user and employee in a transaction
    const newUser = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: 'EMPLOYEE'
        }
      });

      // Create employee
      const employee = await prisma.employee.create({
        data: {
          userId: user.id,
          employeeNumber: "RCF-"+user.id,
          departmentId: departmentId ? parseInt(departmentId) : undefined,  // Added departmentId
          designation,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          gender,
          phoneNumber,
          address,
          // joinDate: joinDate ? new Date(joinDate) : undefined,
          // salaryGrade,
          // emergencyContactName,
          // emergencyContactPhone,
          // bankAccountNumber,
          // panNumber,
          status,
          reportsToId: reportsToId ? parseInt(reportsToId) : undefined
        }
      });

      return { user, employee, tempPassword: randomPassword };
    });

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your New Employee Account Credentials',
        html: `
          <h1>Welcome ${firstName} ${lastName}!</h1>
          <p>Your account has been created. Please find your login credentials below:</p>
          <p>Email: ${email}</p>
          <p>Temporary Password: ${newUser.tempPassword}</p>
          <strong>Please change your password upon first login.</strong>
          <p>If you have any issues, please contact the HR department.</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Note: We'll still return a successful response even if email fails
    }

    // Remove sensitive information before sending response
    const { password: _, ...userResponse } = newUser.user;
    const { userId: __, ...employeeResponse } = newUser.employee;

    res.status(201).json({
      user: userResponse,
      employee: employeeResponse,
      emailSent: true
    });
  } catch (error) {
    console.error('Employee registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update employee details
router.put('/employee/:id', async (req, res) => {
  try {
    const requestedId = parseInt(req.params.id);
    

    const { 
      // User fields
      email,
      firstName,
      lastName,

      // Employee fields
      departmentId,  // Changed from department to departmentId
      designation,
      dateOfBirth,
      gender,
      phoneNumber,
      address,
      // joinDate,
      // salaryGrade,
      // emergencyContactName,
      // emergencyContactPhone,
      // bankAccountNumber,
      // panNumber,
      status,
      reportsToId
    } = req.body;

    // Update in a transaction
    const updatedData = await prisma.$transaction(async (tx) => {
      // Update user details
      // const updatedUser = await tx.user.update({
      //   where: { id: requestedId },
      //   data: { 
      //     email, 
      //     firstName, 
      //     lastName 
      //   }
      // });

      // Update employee details
      const updatedEmployee = await tx.employee.update({
        where: { id: requestedId },
        data: {
          departmentId: departmentId ? parseInt(departmentId) : undefined,
          designation,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          gender,
          phoneNumber,
          address,
          // joinDate: joinDate ? new Date(joinDate) : undefined,
          // salaryGrade,
          // emergencyContactName,
          // emergencyContactPhone,
          // bankAccountNumber,
          // panNumber,
          status,
          reportsToId: reportsToId ? parseInt(reportsToId) : undefined
        }
      });

      return {employee: updatedEmployee };
    });

    // Remove sensitive information before sending response
    // const { password: _, ...userResponse } = updatedData.user;
    const { userId: __, ...employeeResponse } = updatedData.employee;

    res.json({
      // user: userResponse,
      employee: employeeResponse
    });
  } catch (error) {
    console.error('Employee update error:', error);
    res.status(400).json({ error: error.message });
  }
});


// Get employee details (updated to include manager information)
router.get('/employee/:id', authenticateUser, async (req, res) => {
  try {
    // Check if the user is an admin or requesting their own details
    const requestedId = parseInt(req.params.id);
    if (req.user.role !== 'ADMIN' || 'Admin' && req.user.userId !== requestedId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: requestedId },
      include: { 
        user: {
          select: { 
            id: true, 
            email: true, 
            firstName: true, 
            lastName: true, 
            role: true 
          } 
        },
        // Include manager details
        reportsTo: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        // Optionally include direct reports
        directReports: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    res.json(employee);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// List all employees (updated to include manager information)
router.get('/employees', authenticateUser, isAdmin, async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        user: {
          select: { 
            id: true, 
            email: true, 
            firstName: true, 
            lastName: true 
          }
        },
        // Include manager details
        reportsTo: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    res.json(employees);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Check if JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Please set it in your .env file.');
  process.exit(1);
}

// Create a new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, firstName, lastName, role },
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user by ID
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update user details
router.put('/:id', authenticateUser, async (req, res) => {

  try {
    const { firstName, lastName, email } = req.body;
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { firstName, lastName, email },
    });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete user
router.delete('/:id', authenticateUser, isAdmin, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// List all users (admin only)
router.get('/all', authenticateUser, isAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// User login
router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) return res.status(401).json({ error: 'Invalid credentials' });
  
      const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ token, role: user.role,firstName:user.firstName,lastName:user.lastName,email:user.email,id:user.id });  // Include role in the response
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

// User logout (optional, as JWT is stateless)
router.post('/logout', authenticateUser, (req, res) => {
  // In a stateless JWT setup, you typically don't need server-side logout
  // The client should discard the token
  res.json({ message: 'Logged out successfully' });
});



module.exports = router;
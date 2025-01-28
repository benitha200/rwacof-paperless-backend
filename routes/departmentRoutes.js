const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new department
router.post('/', async (req, res, next) => {
  try {
    const department = await prisma.department.create({
      data: {
        ...req.body,
        headOfDepartmentId: req.body.headOfDepartmentId ? parseInt(req.body.headOfDepartmentId) : null
      },
      include: {
        headOfDepartment: true,
        employees: true
      }
    });
    res.json(department);
  } catch (error) {
    next(error);
  }
});

// Get all departments
router.get('/', async (req, res, next) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        headOfDepartment: true,
        employees: true
      }
    });
    res.json(departments);
  } catch (error) {
    next(error);
  }
});

// Get a single department by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const department = await prisma.department.findUnique({
      where: { id: parseInt(id) },
      include: {
        headOfDepartment: true,
        employees: true
      }
    });
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.json(department);
  } catch (error) {
    next(error);
  }
});

// Update a department
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedDepartment = await prisma.department.update({
      where: { id: parseInt(id) },
      data: {
        ...req.body,
        headOfDepartmentId: req.body.headOfDepartmentId ? parseInt(req.body.headOfDepartmentId) : null
      },
      include: {
        headOfDepartment: true,
        employees: true
      }
    });
    res.json(updatedDepartment);
  } catch (error) {
    next(error);
  }
});

// Delete a department
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.department.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Get employees in a department
router.get('/:id/employees', async (req, res, next) => {
  try {
    const { id } = req.params;
    const employees = await prisma.employee.findMany({
      where: { departmentId: parseInt(id) },
      include: {
        user: true,
        department: true
      }
    });
    res.json(employees);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
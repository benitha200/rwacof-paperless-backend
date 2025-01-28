const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all employees
router.get('/', async (req, res, next) => {
    try {
        const employees = await prisma.employee.findMany({
            include: {
                user: true,
                department: true,
                reportsTo: {
                    include: {
                        user: true
                    }
                }
            }
        });
        res.json(employees);
    } catch (error) {
        next(error);
    }
});

// Get employees by department
router.get('/department/:departmentId', async (req, res, next) => {
    try {
        const { departmentId } = req.params;
        const employees = await prisma.employee.findMany({
            where: {
                departmentId: parseInt(departmentId)
            },
            include: {
                user: true,
                department: true,
                reportsTo: {
                    include: {
                        user: true
                    }
                }
            }
        });
        res.json(employees);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new trip request
router.post('/', async (req, res, next) => {
  try {
    const { employeeId, ...tripData } = req.body;
    
    // Find the employee and their reporting manager
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { reportsTo: true }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Create trip request
    const tripRequest = await prisma.tripRequest.create({
      data: {
        ...tripData,
        employee: { connect: { id: employeeId } },
        status: 'PENDING',
        supervisorApproval: false,
        adminApproval: false
      }
    });

    res.status(201).json(tripRequest);
  } catch (error) {
    next(error);
  }
});

// Approve trip request by supervisor (reporting manager)
router.patch('/:id/supervisor-approve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body; // ID of the supervisor approving

    // Find the user and their associated employee
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true }
    });

    if (!user || !user.employee) {
      return res.status(403).json({ error: 'Unauthorized or Invalid User' });
    }

    // Find the trip request
    const tripRequest = await prisma.tripRequest.findUnique({
      where: { id: parseInt(id) },
      include: { employee: true }
    });

    // Check if the current user is the reporting manager of the trip request creator
    if (tripRequest.employee.reportsToId !== user.employee.id) {
      return res.status(403).json({ error: 'Not authorized to approve this trip' });
    }

    // Update trip request
    const updatedTripRequest = await prisma.tripRequest.update({
      where: { id: parseInt(id) },
      data: { 
        supervisorApproval: true,
        status: 'SUPERVISOR_APPROVED'
      }
    });

    res.json(updatedTripRequest);
  } catch (error) {
    next(error);
  }
});

// Approve trip request by admin
router.patch('/:id/admin-approve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body; // ID of the admin user

    // Find the user and verify admin role
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.role !== 'ADMINISTRATOR') {
      return res.status(403).json({ error: 'Unauthorized or Invalid Admin' });
    }

    // Find the trip request
    const tripRequest = await prisma.tripRequest.findUnique({
      where: { id: parseInt(id) }
    });

    // Ensure supervisor has already approved
    if (!tripRequest.supervisorApproval) {
      return res.status(400).json({ error: 'Supervisor approval required first' });
    }

    // Update trip request
    const updatedTripRequest = await prisma.tripRequest.update({
      where: { id: parseInt(id) },
      data: { 
        adminApproval: true,
        status: 'APPROVED'
      }
    });

    res.json(updatedTripRequest);
  } catch (error) {
    next(error);
  }
});

// Get all trip requests
router.get('/', async (req, res, next) => {
  try {
    const tripRequests = await prisma.tripRequest.findMany({
      include: { 
        employee: {
          include: {
            reportsTo: true,
            user: true
          }
        },
        car: true
      }
    });
    res.json(tripRequests);
  } catch (error) {
    next(error);
  }
});

// Get a specific trip request
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const tripRequest = await prisma.tripRequest.findUnique({
      where: { id: parseInt(id) },
      include: { 
        employee: {
          include: {
            reportsTo: true,
            user: true
          }
        },
        car: true
      }
    });

    if (!tripRequest) {
      return res.status(404).json({ error: 'Trip request not found' });
    }
    res.json(tripRequest);
  } catch (error) {
    next(error);
  }
});

// Update a trip request
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedTripRequest = await prisma.tripRequest.update({
      where: { id: parseInt(id) },
      data: {
        ...req.body,
        // Reset approvals if significant changes are made
        ...(Object.keys(req.body).length > 0 && {
          supervisorApproval: false,
          adminApproval: false,
          status: 'PENDING'
        })
      }
    });
    res.json(updatedTripRequest);
  } catch (error) {
    next(error);
  }
});

// Delete a trip request
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.tripRequest.delete({
      where: { id: parseInt(id) }
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
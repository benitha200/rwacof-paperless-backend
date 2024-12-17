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

        // Check if the employee has a reporting manager
        if (!employee.reportsToId) {
            return res.status(400).json({ error: 'No reporting manager assigned' });
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

// Reject a trip request
router.patch('/:id/reject', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { userId } = req.body; // ID of the user rejecting the trip

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
            return res.status(403).json({ error: 'Not authorized to reject this trip' });
        }

        // Update trip request
        const updatedTripRequest = await prisma.tripRequest.update({
            where: { id: parseInt(id) },
            data: {
                status: 'REJECTED',
                supervisorApproval: false,
                adminApproval: false
            }
        });

        res.json(updatedTripRequest);
    } catch (error) {
        next(error);
    }
});

// Assign car and driver to a trip request
router.patch('/:id/assign', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { carId, driverId, userId } = req.body;

        // Verify user's role and permissions
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { employee: true }
        });

        if (!user) {
            return res.status(403).json({ error: 'Unauthorized User' });
        }

        // Check if the user is a supervisor (specifically the reporting manager) or an admin
        const tripRequest = await prisma.tripRequest.findUnique({
            where: { id: parseInt(id) },
            include: { employee: true }
        });

        // Check supervisor approval and authorization
        if (!tripRequest.supervisorApproval) {
            return res.status(400).json({ error: 'Supervisor approval required before assignment' });
        }

        // Additional check for supervisor
        if (user.employee && tripRequest.employee.reportsToId !== user.employee.id) {
            // If not the direct reporting manager, check if they are an admin
            const isAdmin = user.role === 'ADMINISTRATOR';
            if (!isAdmin) {
                return res.status(403).json({ error: 'Not authorized to assign trips' });
            }
        }

        // Verify car is available
        const car = await prisma.car.findUnique({
            where: { id: carId }
        });

        if (!car || car.status !== 'AVAILABLE') {
            return res.status(400).json({ error: 'Selected car is not available' });
        }

        // Verify driver is active
        const driver = await prisma.driver.findUnique({
            where: { id: driverId }
        });

        if (!driver || driver.status !== 'ACTIVE') {
            return res.status(400).json({ error: 'Selected driver is not active' });
        }

        // Update trip request with car and driver
        const updatedTripRequest = await prisma.tripRequest.update({
            where: { id: parseInt(id) },
            data: {
                carId,
                driverId,
                status: 'ASSIGNED',
                adminApproval: true
            },
            include: {
                car: true,
                driver: true,
                employee: {
                    include: {
                        user: true,
                        reportsTo: true
                    }
                }
            }
        });

        // Update car and driver status
        await prisma.car.update({
            where: { id: carId },
            data: { status: 'IN_USE' }
        });

        await prisma.driver.update({
            where: { id: driverId },
            data: { status: 'ASSIGNED' }
        });

        res.json(updatedTripRequest);
    } catch (error) {
        next(error);
    }
});

// Get all trip requests with detailed includes
router.get('/', async (req, res, next) => {
    try {
        const tripRequests = await prisma.tripRequest.findMany({
            include: {
                employee: {
                    include: {
                        reportsTo: {
                            include: {
                                user: true
                            }
                        },
                        user: true
                    }
                },
                car: true,
                driver: true
            },
            orderBy: {
                createdAt: 'desc'
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
                        reportsTo: {
                            include: {
                                user: true
                            }
                        },
                        user: true
                    }
                },
                car: true,
                driver: true
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

router.patch('/:id/finish', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { 
            userId, 
            kmAtArrival, 
            returnDate
        } = req.body;

        // Verify user's role and permissions
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { employee: true }
        });

        if (!user) {
            return res.status(403).json({ error: 'Unauthorized User' });
        }

        // Find the trip request
        const tripRequest = await prisma.tripRequest.findUnique({
            where: { id: parseInt(id) }
        });

        if (!tripRequest) {
            return res.status(404).json({ error: 'Trip request not found' });
        }

        // Validate input
        if (!kmAtArrival || !returnDate) {
            return res.status(400).json({ error: 'Missing required trip details' });
        }

        // Update trip request with finish details
        const updatedTripRequest = await prisma.tripRequest.update({
            where: { id: parseInt(id) },
            data: {
                kmAtArrival: parseInt(kmAtArrival),
                returnDate: new Date(returnDate),
                status: 'COMPLETED',
                // notes: notes || null
            },
            include: {
                car: true,
                employee: {
                    include: {
                        user: true
                    }
                }
            }
        });

        // Update car status back to AVAILABLE
        if (updatedTripRequest.car) {
            await prisma.car.update({
                where: { id: updatedTripRequest.car.id },
                data: { status: 'AVAILABLE' }
            });
        }

        res.json(updatedTripRequest);
    } catch (error) {
        next(error);
    }
});

// Get all trip requests for a specific employee by user ID
router.get('/user/:userId', async (req, res, next) => {
    try {
        const { userId } = req.params;

        // Find the employee associated with the user ID
        const employee = await prisma.employee.findFirst({
            where: { userId: parseInt(userId) }
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Fetch all trip requests for this employee
        const tripRequests = await prisma.tripRequest.findMany({
            where: { employeeId: employee.id },
            include: {
                employee: {
                    include: {
                        reportsTo: {
                            include: {
                                user: true
                            }
                        },
                        user: true
                    }
                },
                car: true,
                driver: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json(tripRequests);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
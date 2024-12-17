// const express = require('express');
// const router = express.Router();
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();

// // Create a new car
// router.post('/', async (req, res, next) => {
//   try {
//     // Ensure required fields are present
//     const { make, model, year, licensePlate,mileage } = req.body;

//     // Validate required fields
//     if (!make) {
//       return res.status(400).json({ error: 'Make is required' });
//     }

//     const car = await prisma.car.create({
//       data: {
//         make,
//         model,
//         year,
//         licensePlate,
//         mileage,
//         // Optional: Connect driver if provided
//         ...(req.body.driverId && {
//           driver: {
//             connect: { id: req.body.driverId }
//           }
//         })
//       }
//     });

//     res.status(201).json(car);
//   } catch (error) {
//     next(error);
//   }
// });

// // Get all cars
// router.get('/', async (req, res, next) => {
//   try {
//     const cars = await prisma.car.findMany({
//       include: { 
//         driver: true,
//         tripRequests: true 
//       }
//     });
//     res.json(cars);
//   } catch (error) {
//     next(error);
//   }
// });

// // Get a specific car
// router.get('/:id', async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const car = await prisma.car.findUnique({
//       where: { id: parseInt(id) },
//       include: { 
//         driver: true,
//         tripRequests: true 
//       }
//     });

//     if (!car) {
//       return res.status(404).json({ error: 'Car not found' });
//     }
//     res.json(car);
//   } catch (error) {
//     next(error);
//   }
// });

// // Update a car
// router.put('/:id', async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const updatedCar = await prisma.car.update({
//       where: { id: parseInt(id) },
//       data: {
//         ...req.body,
//         // Optional: Connect/disconnect driver
//         ...(req.body.driverId !== undefined && { 
//           driver: req.body.driverId 
//             ? { connect: { id: req.body.driverId } } 
//             : { disconnect: true } 
//         })
//       },
//       include: { 
//         driver: true 
//       }
//     });
//     res.json(updatedCar);
//   } catch (error) {
//     next(error);
//   }
// });

// // Delete a car
// router.delete('/:id', async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     await prisma.car.delete({
//       where: { id: parseInt(id) }
//     });
//     res.status(204).send();
//   } catch (error) {
//     next(error);
//   }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new car
router.post('/', async (req, res, next) => {
  try {
    // Destructure and validate required fields
    const { 
      make, 
      model, 
      year, 
      licensePlate, 
      mileage,
      driverId 
    } = req.body;

    // Comprehensive validation
    if (!make) {
      return res.status(400).json({ error: 'Make is required' });
    }
    if (!model) {
      return res.status(400).json({ error: 'Model is required' });
    }
    if (!year) {
      return res.status(400).json({ error: 'Year is required' });
    }
    if (!licensePlate) {
      return res.status(400).json({ error: 'License plate is required' });
    }

    // Check if license plate already exists
    const existingCar = await prisma.car.findUnique({
      where: { licensePlate }
    });

    if (existingCar) {
      return res.status(409).json({ error: 'A car with this license plate already exists' });
    }

    // Create car with optional driver connection
    const car = await prisma.car.create({
      data: {
        make,
        model,
        year: parseInt(year),
        licensePlate,
        mileage: parseInt(mileage) || 0,
        ...(driverId && {
          driver: {
            connect: { id: parseInt(driverId) }
          }
        })
      },
      include: {
        driver: true,
        tripRequests: true
      }
    });

    res.status(201).json(car);
  } catch (error) {
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A car with this unique identifier already exists' });
    }
    next(error);
  }
});

// Get all cars with pagination and filtering
router.get('/', async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status,
      make,
      model 
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const where = {
      ...(status && { status }),
      ...(make && { make: { contains: make } }),
      ...(model && { model: { contains: model } })
    };

    const [total, cars] = await Promise.all([
      prisma.car.count({ where }),
      prisma.car.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: { 
          driver: true,
          tripRequests: {
            include: {
              employee: {
                include: {
                  user: true
                }
              }
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      })
    ]);

    res.json({
      cars,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalCars: total
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get a specific car
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const car = await prisma.car.findUnique({
      where: { id: parseInt(id) },
      include: { 
        driver: true,
        tripRequests: {
          include: {
            employee: {
              include: {
                user: true
              }
            },
            driver: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!car) {
      return res.status(404).json({ error: 'Car not found' });
    }
    res.json(car);
  } catch (error) {
    next(error);
  }
});

// Update a car
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      make, 
      model, 
      year, 
      licensePlate, 
      mileage, 
      status,
      driverId 
    } = req.body;

    // Validate input
    const updateData = {
      ...(make && { make }),
      ...(model && { model }),
      ...(year && { year: parseInt(year) }),
      ...(licensePlate && { licensePlate }),
      ...(mileage && { mileage: parseInt(mileage) }),
      ...(status && { status }),
    };

    // Handle driver connection/disconnection
    if (driverId !== undefined) {
      updateData.driver = driverId 
        ? { connect: { id: parseInt(driverId) } } 
        : { disconnect: true };
    }

    const updatedCar = await prisma.car.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: { 
        driver: true,
        tripRequests: true
      }
    });

    res.json(updatedCar);
  } catch (error) {
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A car with this unique identifier already exists' });
    }
    next(error);
  }
});

// Delete a car
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if car exists and has no active trip requests
    const existingCar = await prisma.car.findUnique({
      where: { id: parseInt(id) },
      include: { 
        tripRequests: {
          where: {
            OR: [
              { status: 'PENDING' },
              { status: 'IN_PROGRESS' }
            ]
          }
        }
      }
    });

    if (!existingCar) {
      return res.status(404).json({ error: 'Car not found' });
    }

    if (existingCar.tripRequests.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete car with active trip requests',
        activeTripRequests: existingCar.tripRequests.length
      });
    }

    await prisma.car.delete({
      where: { id: parseInt(id) }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
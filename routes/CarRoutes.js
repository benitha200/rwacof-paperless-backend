const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new car
router.post('/', async (req, res, next) => {
  try {
    // Ensure required fields are present
    const { make, model, year, licensePlate,mileage } = req.body;

    // Validate required fields
    if (!make) {
      return res.status(400).json({ error: 'Make is required' });
    }

    const car = await prisma.car.create({
      data: {
        make,
        model,
        year,
        licensePlate,
        mileage,
        // Optional: Connect driver if provided
        ...(req.body.driverId && {
          driver: {
            connect: { id: req.body.driverId }
          }
        })
      }
    });

    res.status(201).json(car);
  } catch (error) {
    next(error);
  }
});

// Get all cars
router.get('/', async (req, res, next) => {
  try {
    const cars = await prisma.car.findMany({
      include: { 
        driver: true,
        tripRequests: true 
      }
    });
    res.json(cars);
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
        tripRequests: true 
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
    const updatedCar = await prisma.car.update({
      where: { id: parseInt(id) },
      data: {
        ...req.body,
        // Optional: Connect/disconnect driver
        ...(req.body.driverId !== undefined && { 
          driver: req.body.driverId 
            ? { connect: { id: req.body.driverId } } 
            : { disconnect: true } 
        })
      },
      include: { 
        driver: true 
      }
    });
    res.json(updatedCar);
  } catch (error) {
    next(error);
  }
});

// Delete a car
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.car.delete({
      where: { id: parseInt(id) }
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
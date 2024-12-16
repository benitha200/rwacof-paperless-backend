const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new driver
router.post('/', async (req, res, next) => {
  try {
    const driver = await prisma.driver.create({ 
      data: {
        ...req.body,
       
      },
      
    });
    res.status(201).json(driver);
  } catch (error) {
    next(error);
  }
});

// Get all drivers
router.get('/', async (req, res, next) => {
  try {
    const drivers = await prisma.driver.findMany({
      include: { 
        car: true,
        tripRequests: true 
      }
    });
    res.json(drivers);
  } catch (error) {
    next(error);
  }
});

// Get a specific driver
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const driver = await prisma.driver.findUnique({
      where: { id: parseInt(id) },
      include: { 
        car: true,
        tripRequests: true 
      }
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json(driver);
  } catch (error) {
    next(error);
  }
});

// Update a driver
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedDriver = await prisma.driver.update({
      where: { id: parseInt(id) },
      data: req.body,
     
    });
    res.json(updatedDriver);
  } catch (error) {
    next(error);
  }
});

// Delete a driver
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.driver.delete({
      where: { id: parseInt(id) }
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
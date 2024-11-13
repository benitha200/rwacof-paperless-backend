const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.post('/', async (req, res, next) => {
  try {
    const { containers, ...vgmData } = req.body;

    // Extract container details from the first container
    const containerNumber = containers[0]?.containerNumber || '';
    const containerTypeSize = containers[0]?.containerTypeSize || '';
    const vgmKgs = containers[0]?.vgmKgs || '';
    const cargoGwKgs = containers[0]?.cargoGwKgs || '';
    const method = containers[0]?.method || '';

    try {
      // First try to create new VGM
      const vgm = await prisma.vGM.create({
        data: {
          ...vgmData,
          containerNumber,
          containerTypeSize,
          vgmKgs,
          cargoGwKgs,
          method,
          containers: {
            create: containers
          }
        },
        include: {
          containers: true
        }
      });
      
      res.json(vgm);
    } catch (error) {
      // If unique constraint error (P2002), then update instead
      if (error.code === 'P2002') {
        const updatedVGM = await prisma.vGM.update({
          where: {
            shipmentId: vgmData.shipmentId
          },
          data: {
            ...vgmData,
            containerNumber,
            containerTypeSize,
            vgmKgs,
            cargoGwKgs,
            method,
            containers: {
              deleteMany: {},  // Delete existing containers
              create: containers  // Create new containers
            }
          },
          include: {
            containers: true
          }
        });
        
        res.json(updatedVGM);
      } else {
        // If it's not a P2002 error, throw it to be caught by outer catch
        throw error;
      }
    }
  } catch (error) {
    console.error('Error processing VGM:', error);
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const vgms = await prisma.vGM.findMany();
    res.json(vgms);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const vgm = await prisma.vGM.findUnique({
      where: { id: parseInt(id) },
    });
    if (!vgm) {
      return res.status(404).json({ error: 'VGM not found' });
    }
    res.json(vgm);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedVGM = await prisma.vGM.update({
      where: { id: parseInt(id) },
      data: req.body,
    });
    res.json(updatedVGM);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.vGM.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
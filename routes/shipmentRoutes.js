// const express = require('express');
// const router = express.Router();
// // const { prisma, AppError, prismaOperation } = require('../prisma');
// const { PrismaClient,AppError } = require('@prisma/client');
// const prisma = new PrismaClient();

// router.post('/', async (req, res) => {
//     try {
//       const {
//         containerNo,
//         truckNo,
//         lotNo,
//         description,
//         quantity,
//         quantityUnit,
//         netWeight,
//         netWeightUnit,
//         amount,
//         price,
//         consignee,
//         date
//       } = req.body;
  
//       // Convert string values to appropriate types
//       const shipmentData = {
//         containerNo,
//         truckNo,
//         lotNo,
//         description,
//         quantity: parseInt(quantity, 10),
//         netWeight: parseFloat(netWeight),
//         amount: parseFloat(amount),
//         consignee,
//         date: new Date(date),
//         // Add status field if needed
//         status: 'Pending',
//       };
  
//       const newShipment = await prisma.shipment.create({
//         data: shipmentData,
//       });
  
//       res.status(201).json(newShipment);
//     } catch (error) {
//       console.error('Error creating shipment:', error);
//       res.status(500).json({ error: 'Failed to create shipment' });
//     }
//   });

// router.get('/', async (req, res, next) => {
//   try {
//     const shipments = await prismaOperation(
//       () => prisma.shipment.findMany({ orderBy: { id: 'desc' } }),
//       'Failed to fetch shipments'
//     );
//     res.json(shipments);
//   } catch (error) {
//     next(error);
//   }
// });

// router.get('/:id', async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const shipment = await prismaOperation(
//       () => prisma.shipment.findUnique({
//         where: { id: parseInt(id) },
//         include: {
//           loadingTallySheet: true,
//           invoice: true,
//           vgm: true,
//           stuffingReport: true,
//         },
//       }),
//       'Failed to fetch shipment'
//     );
//     if (!shipment) {
//       throw new AppError('Shipment not found', 404);
//     }
//     res.json(shipment);
//   } catch (error) {
//     next(error);
//   }
// });

// router.put('/:id', async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const updatedShipment = await prismaOperation(
//       () => prisma.shipment.update({
//         where: { id: parseInt(id) },
//         data: req.body,
//       }),
//       'Failed to update shipment'
//     );
//     res.json(updatedShipment);
//   } catch (error) {
//     next(error);
//   }
// });

// router.delete('/:id', async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     await prismaOperation(
//       () => prisma.shipment.delete({
//         where: { id: parseInt(id) },
//       }),
//       'Failed to delete shipment'
//     );
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

router.post('/', async (req, res) => {
    try {
      const {
        containerNo,
        truckNo,
        lotNo,
        description,
        quantity,
        quantityUnit,
        netWeight,
        netWeightUnit,
        amount,
        price,
        consignee,
        date,
        userId
      } = req.body;
  
      const shipmentData = {
        containerNo,
        truckNo,
        lotNo,
        description,
        quantity: parseInt(quantity, 10),
        quantityUnit,
        netWeight: parseFloat(netWeight),
        netWeightUnit,
        amount: parseFloat(amount),
        price: parseFloat(price),
        consignee,
        date: date ? new Date(date) : new Date(),
        status: 'Pending',
        user: {
          connect: { id: parseInt(userId, 10) }
        }
      };
  
      const newShipment = await prisma.shipment.create({
        data: shipmentData,
      });
  
      res.status(201).json(newShipment);
    } catch (error) {
      console.error('Error creating shipment:', error);
      res.status(500).json({ error: 'Failed to create shipment' });
    }
  });

router.get('/', async (req, res, next) => {
  try {
    const shipments = await prisma.shipment.findMany({ orderBy: { id: 'desc' } });
    res.json(shipments);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const shipment = await prisma.shipment.findUnique({
      where: { id: parseInt(id) },
      include: {
        loadingTallySheet: true,
        invoice: true,
        vgm: true,
        stuffingReport: true,
      },
    });
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    res.json(shipment);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedShipment = await prisma.shipment.update({
      where: { id: parseInt(id) },
      data: req.body,
    });
    res.json(updatedShipment);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.shipment.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
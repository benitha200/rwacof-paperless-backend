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
      const shipments = await prisma.shipment.findMany({
        orderBy: { id: 'desc' },
        include: {
          loadingTallySheet: true,
          invoice: true,
          vgm: true,
          stuffingReport: true,
          contract:true,
        },
      });
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
        contract:true,
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
      userId,
      status
    } = req.body;

    const updatedShipment = await prisma.shipment.update({
      where: {
        id: parseInt(id, 10)
      },
      data: {
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
        userId,
        status
      }
    });

    res.json(updatedShipment);
  } catch (error) {
    next(error);
  }
});


router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Delete related records first
    await prisma.loadingTallySheet.deleteMany({
      where: { shipmentId: parseInt(id) },
    });

    await prisma.invoice.deleteMany({
      where: { shipmentId: parseInt(id) },
    });

    // await prisma.vGM.deleteMany({
    //   where: { shipmentId: parseInt(id) },
    // });

    await prisma.stuffingReport.deleteMany({
      where: { shipmentId: parseInt(id) },
    });

    // await prisma.contract.deleteMany({
    //   where: { shipmentId: parseInt(id) },
    // });

    // Delete the shipment
    await prisma.shipment.delete({
      where: { id: parseInt(id) },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});


module.exports = router;
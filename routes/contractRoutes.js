const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new contract
router.post('/', async (req, res) => {
  try {
    const {
      contractNumber,
      clientName,
      startDate,
      endDate,
      totalQuantity,
      quantityUnit,
      price,
      currency,
      terms,
      status
    } = req.body;

    const contractData = {
      contractNumber,
      clientName,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : new Date(),
      totalQuantity: parseInt(totalQuantity, 10),
      quantityUnit,
      price: parseFloat(price),
      currency,
      terms,
      status: status
    };

    const newContract = await prisma.contract.create({
      data: contractData,
    });

    res.status(201).json(newContract);
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(500).json({ error: 'Failed to create contract' });
  }
});

// Get all contracts with their associated shipments
router.get('/', async (req, res, next) => {
  try {
    const contracts = await prisma.contract.findMany({
      orderBy: { id: 'desc' },
      include: {
        shipments: true,
      },
    });
    res.json(contracts);
  } catch (error) {
    next(error);
  }
});

// Get a single contract by ID with its shipments
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const contract = await prisma.contract.findUnique({
      where: { id: parseInt(id) },
      include: {
        shipments: {
          include: {
            loadingTallySheet: true,
            invoice: true,
            vgm: true,
            stuffingReport: true,
          },
        },
      },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    res.json(contract);
  } catch (error) {
    next(error);
  }
});

// Update a contract
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      contractNumber,
      clientName,
      startDate,
      endDate,
      totalQuantity,
      quantityUnit,
      price,
      currency,
      terms,
      status
    } = req.body;

    const updatedContract = await prisma.contract.update({
      where: {
        id: parseInt(id, 10)
      },
      data: {
        contractNumber,
        clientName,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        totalQuantity: totalQuantity ? parseInt(totalQuantity, 10) : undefined,
        quantityUnit,
        price: price ? parseFloat(price) : undefined,
        currency,
        terms,
        status
      }
    });

    res.json(updatedContract);
  } catch (error) {
    next(error);
  }
});

// Delete a contract
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.contract.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Get all shipments for a specific contract
router.get('/:id/shipments', async (req, res, next) => {
  try {
    const { id } = req.params;
    const shipments = await prisma.shipment.findMany({
      where: {
        contractId: parseInt(id)
      },
      include: {
        loadingTallySheet: true,
        invoice: true,
        vgm: true,
        stuffingReport: true,
        contract:true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(shipments);
  } catch (error) {
    next(error);
  }
});

// Add a shipment to a contract
router.post('/:id/shipments', async (req, res, next) => {
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
      },
      contract: {
        connect: { id: parseInt(id, 10) }
      }
    };

    const newShipment = await prisma.shipment.create({
      data: shipmentData,
    });

    res.status(201).json(newShipment);
  } catch (error) {
    console.error('Error adding shipment to contract:', error);
    res.status(500).json({ error: 'Failed to add shipment to contract' });
  }
});

module.exports = router;
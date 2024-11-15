const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { validationResult, check } = require('express-validator');
const prisma = new PrismaClient();

const router = express.Router();

// Middleware to validate the request body
const validateInvoice = [
  check('shipmentId').isInt().withMessage('Shipment ID must be an integer.'),
  check('seller').notEmpty().withMessage('Seller is required.'),
  check('sellerAddress').notEmpty().withMessage('Seller address is required.'),
  check('consignee').notEmpty().withMessage('Consignee is required.'),
  check('consigneeAddress').notEmpty().withMessage('Consignee address is required.'),
  check('billOfLadingNo').notEmpty().withMessage('Bill of Lading number is required.'),
  check('authorizedSignature').notEmpty().withMessage('Authorized signature is required.'),
  check('InvoiceDate').notEmpty().withMessage('Invoice date is required.'),
];

router.post('/', validateInvoice, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Extract data from request body
    const { 
      shipmentId, 
      seller, 
      sellerAddress, 
      consignee, 
      consigneeAddress, 
      billOfLadingNo, 
      authorizedSignature,
      InvoiceDate 
    } = req.body;

    // First, verify that the shipment exists
    const shipment = await prisma.shipment.findUnique({
      where: { id: parseInt(shipmentId) }
    });

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Try to find existing invoice
    const existingInvoice = await prisma.invoice.findUnique({
      where: { shipmentId: parseInt(shipmentId) }
    });

    let invoice;
    if (existingInvoice) {
      // Update existing invoice
      invoice = await prisma.invoice.update({
        where: { shipmentId: parseInt(shipmentId) },
        data: {
          seller,
          sellerAddress,
          consignee,
          consigneeAddress,
          billOfLadingNo,
          authorizedSignature,
          InvoiceDate: new Date(InvoiceDate),
        },
      });
      return res.status(200).json(invoice);
    } else {
      // Create new invoice
      invoice = await prisma.invoice.create({
        data: {
          shipmentId: parseInt(shipmentId),
          seller,
          sellerAddress,
          consignee,
          consigneeAddress,
          billOfLadingNo,
          authorizedSignature,
          // contractReference,
          InvoiceDate: new Date(InvoiceDate),
        },
      });
      return res.status(201).json(invoice);
    }
  } catch (error) {
    console.error('Error in invoice creation/update:', error);
    return res.status(500).json({ 
      error: 'Failed to process invoice',
      details: error.message 
    });
  }
});

router.get('/', async (req, res, next) => {
  try {
    const invoices = await prisma.invoice.findMany();
    res.json(invoices);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(id) },
    });
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedInvoice = await prisma.invoice.update({
      where: { id: parseInt(id) },
      data: req.body,
    });
    res.json(updatedInvoice);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.invoice.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { body, validationResult } = require('express-validator');

// Validation middleware
const validateGRN = [
  body('receivedDate').isISO8601().toDate().withMessage('Invalid date format'),
  body('supplierName').notEmpty().withMessage('Supplier name is required'),
  body('supplierAddress').notEmpty().withMessage('Supplier address is required'),
  body('productDescription').notEmpty().withMessage('Product description is required'),
  body('quantity').isInt().withMessage('Quantity must be an integer'),
  body('quantityUnit').notEmpty().withMessage('Quantity unit is required'),
  body('totalWeight').isFloat().withMessage('Total weight must be a number'),
  body('weightUnit').notEmpty().withMessage('Weight unit is required'),
  body('qualityGrade').notEmpty().withMessage('Quality grade is required'),
  body('preparedById').isInt().withMessage('Prepared by ID must be an integer'),
  body('checkedById').isInt().withMessage('Checked by ID must be an integer'),
  body('authorizedById').isInt().withMessage('Authorized by ID must be an integer'),
  body('receivedById').isInt().withMessage('Received by ID must be an integer'),
];

// Create GRN
router.post('/', validateGRN, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const grn = await prisma.gRN.create({
      data: {
        receivedDate: new Date(req.body.receivedDate),
        supplierName: req.body.supplierName,
        supplierAddress: req.body.supplierAddress,
        productDescription: req.body.productDescription,
        quantity: parseInt(req.body.quantity),
        quantityUnit: req.body.quantityUnit,
        totalWeight: parseFloat(req.body.totalWeight),
        weightUnit: req.body.weightUnit,
        qualityGrade: req.body.qualityGrade,
        preparedById: parseInt(req.body.preparedById),
        checkedById: parseInt(req.body.checkedById),
        authorizedById: parseInt(req.body.authorizedById),
        receivedById: parseInt(req.body.receivedById),
        remarks: req.body.remarks,
      },
    });
    res.status(201).json(grn);
  } catch (error) {
    console.error('Error creating GRN:', error);
    res.status(500).json({ message: 'Error creating GRN', error: error.message });
  }
});

// Get all GRNs
router.get('/', async (req, res) => {
  try {
    const grns = await prisma.gRN.findMany();
    res.json(grns);
  } catch (error) {
    console.error('Error fetching GRNs:', error);
    res.status(500).json({ message: 'Error fetching GRNs', error: error.message });
  }
});

// Get a single GRN by ID
router.get('/:id', async (req, res) => {
  try {
    const grn = await prisma.gRN.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (grn) {
      res.json(grn);
    } else {
      res.status(404).json({ message: 'GRN not found' });
    }
  } catch (error) {
    console.error('Error fetching GRN:', error);
    res.status(500).json({ message: 'Error fetching GRN', error: error.message });
  }
});

// Update a GRN
router.put('/:id', validateGRN, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const updatedGrn = await prisma.gRN.update({
      where: { id: parseInt(req.params.id) },
      data: {
        receivedDate: new Date(req.body.receivedDate),
        supplierName: req.body.supplierName,
        supplierAddress: req.body.supplierAddress,
        productDescription: req.body.productDescription,
        quantity: parseInt(req.body.quantity),
        quantityUnit: req.body.quantityUnit,
        totalWeight: parseFloat(req.body.totalWeight),
        weightUnit: req.body.weightUnit,
        qualityGrade: req.body.qualityGrade,
        preparedById: parseInt(req.body.preparedById),
        checkedById: parseInt(req.body.checkedById),
        authorizedById: parseInt(req.body.authorizedById),
        receivedById: parseInt(req.body.receivedById),
        remarks: req.body.remarks,
      },
    });
    res.json(updatedGrn);
  } catch (error) {
    console.error('Error updating GRN:', error);
    res.status(500).json({ message: 'Error updating GRN', error: error.message });
  }
});

// Delete a GRN
router.delete('/:id', async (req, res) => {
  try {
    await prisma.gRN.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: 'GRN deleted successfully' });
  } catch (error) {
    console.error('Error deleting GRN:', error);
    res.status(500).json({ message: 'Error deleting GRN', error: error.message });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { body,validationResult  } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Validation for LoadingTallySheet
const validateLoadingTallySheet = [
  body('shipmentId').isInt().withMessage('Shipment ID must be an integer'),
  body('loadingDay').isISO8601().toDate().withMessage('Invalid loading day format'),
  body('sl').notEmpty().withMessage('SL is required'),
  body('forwarder').notEmpty().withMessage('Forwarder is required'),
  body('rssSsrwSprw').notEmpty().withMessage('RSS/SSRW/SPRW is required'),
  body('plateNo').notEmpty().withMessage('Plate number is required'),
  body('tare').isDecimal().withMessage('Tare must be a decimal number'),
];

// Use the validation in the POST route
router.post('/', validateLoadingTallySheet, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const loadingTallySheet = await prisma.loadingTallySheet.create({ data: req.body });
    res.json(loadingTallySheet);
  } catch (error) {
    console.error('Error creating loading tally sheet:', error);
    if (error.code === 'P2002') {
      next(new AppError('A unique constraint violation occurred. This record may already exist.', 400));
    } else if (error.code === 'P2003') {
      next(new AppError('A foreign key constraint failed. Please check the shipmentId.', 400));
    } else {
      next(new AppError(`Failed to create loading tally sheet: ${error.message}`, 500));
    }
  }
});

// router.post('/', async (req, res, next) => {
//   try {
//     const loadingTallySheet = await prisma.loadingTallySheet.create({ data: req.body });
//     res.json(loadingTallySheet);
//   } catch (error) {
//     next(new AppError('Failed to create loading tally sheet', 500));
//   }
// });

router.get('/', async (req, res, next) => {
  try {
    const loadingTallySheets = await prisma.loadingTallySheet.findMany();
    res.json(loadingTallySheets);
  } catch (error) {
    next(new AppError('Failed to fetch loading tally sheets', 500));
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const loadingTallySheet = await prisma.loadingTallySheet.findUnique({
      where: { id: parseInt(id) },
    });
    if (!loadingTallySheet) {
      throw new AppError('Loading tally sheet not found', 404);
    }
    res.json(loadingTallySheet);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedLoadingTallySheet = await prisma.loadingTallySheet.update({
      where: { id: parseInt(id) },
      data: req.body,
    });
    res.json(updatedLoadingTallySheet);
  } catch (error) {
    next(new AppError('Failed to update loading tally sheet', 500));
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.loadingTallySheet.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    next(new AppError('Failed to delete loading tally sheet', 500));
  }
});

module.exports = router;
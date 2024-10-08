const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

router.post('/', async (req, res, next) => {
  try {
    const loadingTallySheet = await prisma.loadingTallySheet.create({ data: req.body });
    res.json(loadingTallySheet);
  } catch (error) {
    next(new AppError('Failed to create loading tally sheet', 500));
  }
});

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
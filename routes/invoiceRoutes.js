// const express = require('express');
// const router = express.Router();
// // const { prisma, AppError, prismaOperation } = require('../prisma');
// const { PrismaClient,AppError } = require('@prisma/client');
// const prisma = new PrismaClient();

// router.post('/', async (req, res, next) => {
//   try {
//     const invoice = await prismaOperation(
//       () => prisma.invoice.create({ data: req.body }),
//       'Failed to create invoice'
//     );
//     res.json(invoice);
//   } catch (error) {
//     next(error);
//   }
// });

// router.get('/', async (req, res, next) => {
//   try {
//     const invoices = await prismaOperation(
//       () => prisma.invoice.findMany(),
//       'Failed to fetch invoices'
//     );
//     res.json(invoices);
//   } catch (error) {
//     next(error);
//   }
// });

// router.get('/:id', async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const invoice = await prismaOperation(
//       () => prisma.invoice.findUnique({
//         where: { id: parseInt(id) },
//       }),
//       'Failed to fetch invoice'
//     );
//     if (!invoice) {
//       throw new AppError('Invoice not found', 404);
//     }
//     res.json(invoice);
//   } catch (error) {
//     next(error);
//   }
// });

// router.put('/:id', async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const updatedInvoice = await prismaOperation(
//       () => prisma.invoice.update({
//         where: { id: parseInt(id) },
//         data: req.body,
//       }),
//       'Failed to update invoice'
//     );
//     res.json(updatedInvoice);
//   } catch (error) {
//     next(error);
//   }
// });

// router.delete('/:id', async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     await prismaOperation(
//       () => prisma.invoice.delete({
//         where: { id: parseInt(id) },
//       }),
//       'Failed to delete invoice'
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

router.post('/', async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.create({ data: req.body });
    res.json(invoice);
  } catch (error) {
    next(error);
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
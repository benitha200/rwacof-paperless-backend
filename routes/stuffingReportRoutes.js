// const express = require('express');
// const router = express.Router();
// // const { prisma, AppError, prismaOperation } = require('../prisma');
// const { PrismaClient,AppError } = require('@prisma/client');
// const prisma = new PrismaClient();

// router.post('/', async (req, res, next) => {
//     try {
//       const { shipmentId, ...stuffingReportData } = req.body;
      
//       const stuffingReport = await prismaOperation(
//         () => prisma.stuffingReport.create({
//           data: {
//             ...stuffingReportData,
//             shipment: {
//               connect: { id: shipmentId }
//             }
//           },
//           include: { shipment: true }
//         }),
//         'Failed to create stuffing report'
//       );
//       res.json(stuffingReport);
//     } catch (error) {
//       next(error);
//     }
//   });

// router.get('/', async (req, res, next) => {
//   try {
//     const stuffingReports = await prismaOperation(
//       () => prisma.stuffingReport.findMany(),
//       'Failed to fetch stuffing reports'
//     );
//     res.json(stuffingReports);
//   } catch (error) {
//     next(error);
//   }
// });

// router.get('/:id', async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const stuffingReport = await prismaOperation(
//       () => prisma.stuffingReport.findUnique({
//         where: { id: parseInt(id) },
//       }),
//       'Failed to fetch stuffing report'
//     );
//     if (!stuffingReport) {
//       throw new AppError('Stuffing report not found', 404);
//     }
//     res.json(stuffingReport);
//   } catch (error) {
//     next(error);
//   }
// });

// router.put('/:id', async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const updatedStuffingReport = await prismaOperation(
//       () => prisma.stuffingReport.update({
//         where: { id: parseInt(id) },
//         data: req.body,
//       }),
//       'Failed to update stuffing report'
//     );
//     res.json(updatedStuffingReport);
//   } catch (error) {
//     next(error);
//   }
// });

// router.delete('/:id', async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     await prismaOperation(
//       () => prisma.stuffingReport.delete({
//         where: { id: parseInt(id) },
//       }),
//       'Failed to delete stuffing report'
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
    const { shipmentId, ...stuffingReportData } = req.body;
    const stuffingReport = await prisma.stuffingReport.create({
      data: {
        ...stuffingReportData,
        shipment: {
          connect: { id: shipmentId }
        }
      },
      include: { shipment: true }
    });
    res.json(stuffingReport);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const stuffingReports = await prisma.stuffingReport.findMany();
    res.json(stuffingReports);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const stuffingReport = await prisma.stuffingReport.findUnique({
      where: { id: parseInt(id) },
    });
    if (!stuffingReport) {
      return res.status(404).json({ error: 'Stuffing report not found' });
    }
    res.json(stuffingReport);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedStuffingReport = await prisma.stuffingReport.update({
      where: { id: parseInt(id) },
      data: req.body,
    });
    res.json(updatedStuffingReport);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.stuffingReport.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
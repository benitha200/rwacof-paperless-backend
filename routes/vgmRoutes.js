// const express = require('express');
// const router = express.Router();
// // const { prisma, AppError, prismaOperation } = require('../prisma');
// const { PrismaClient,AppError } = require('@prisma/client');
// const prisma = new PrismaClient();

// router.post('/', async (req, res, next) => {
//   try {
//     const vgm = await prismaOperation(
//       () => prisma.vGM.create({ data: req.body }),
//       'Failed to create VGM'
//     );
//     res.json(vgm);
//   } catch (error) {
//     next(error);
//   }
// });

// router.get('/', async (req, res, next) => {
//   try {
//     const vgms = await prismaOperation(
//       () => prisma.vGM.findMany(),
//       'Failed to fetch VGMs'
//     );
//     res.json(vgms);
//   } catch (error) {
//     next(error);
//   }
// });

// router.get('/:id', async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const vgm = await prismaOperation(
//       () => prisma.vGM.findUnique({
//         where: { id: parseInt(id) },
//       }),
//       'Failed to fetch VGM'
//     );
//     if (!vgm) {
//       throw new AppError('VGM not found', 404);
//     }
//     res.json(vgm);
//   } catch (error) {
//     next(error);
//   }
// });

// router.put('/:id', async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const updatedVGM = await prismaOperation(
//       () => prisma.vGM.update({
//         where: { id: parseInt(id) },
//         data: req.body,
//       }),
//       'Failed to update VGM'
//     );
//     res.json(updatedVGM);
//   } catch (error) {
//     next(error);
//   }
// });

// router.delete('/:id', async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     await prismaOperation(
//       () => prisma.vGM.delete({
//         where: { id: parseInt(id) },
//       }),
//       'Failed to delete VGM'
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
    const vgm = await prisma.vGM.create({ data: req.body });
    res.json(vgm);
  } catch (error) {
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
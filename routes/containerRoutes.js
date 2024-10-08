// const express = require('express');
// const router = express.Router();
// // const { prisma, AppError, prismaOperation } = require('../prisma');
// const { PrismaClient,AppError } = require('@prisma/client');
// const prisma = new PrismaClient();

// router.post('/', async (req, res, next) => {
//   try {
//     const container = await prismaOperation(
//       () => prisma.container.create({ data: req.body }),
//       'Failed to create container'
//     );
//     res.json(container);
//   } catch (error) {
//     next(error);
//   }
// });

// router.get('/', async (req, res, next) => {
//   try {
//     const containers = await prismaOperation(
//       () => prisma.container.findMany(),
//       'Failed to fetch containers'
//     );
//     res.json(containers);
//   } catch (error) {
//     next(error);
//   }
// });

// router.get('/:id', async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const container = await prismaOperation(
//       () => prisma.container.findUnique({
//         where: { id: parseInt(id) },
//       }),
//       'Failed to fetch container'
//     );
//     if (!container) {
//       throw new AppError('Container not found', 404);
//     }
//     res.json(container);
//   } catch (error) {
//     next(error);
//   }
// });

// router.put('/:id', async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const updatedContainer = await prismaOperation(
//       () => prisma.container.update({
//         where: { id: parseInt(id) },
//         data: req.body,
//       }),
//       'Failed to update container'
//     );
//     res.json(updatedContainer);
//   } catch (error) {
//     next(error);
//   }
// });

// router.delete('/:id', async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     await prismaOperation(
//       () => prisma.container.delete({
//         where: { id: parseInt(id) },
//       }),
//       'Failed to delete container'
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
    const container = await prisma.container.create({ data: req.body });
    res.json(container);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const containers = await prisma.container.findMany();
    res.json(containers);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const container = await prisma.container.findUnique({
      where: { id: parseInt(id) },
    });
    if (!container) {
      return res.status(404).json({ error: 'Container not found' });
    }
    res.json(container);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedContainer = await prisma.container.update({
      where: { id: parseInt(id) },
      data: req.body,
    });
    res.json(updatedContainer);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.container.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
require('dotenv').config();
const authenticateUser=require('./UserRoutes');


const validateGRN = [
  body('receivedDate').isISO8601().toDate().withMessage('Invalid date format'),
  body('supplierName').notEmpty().withMessage('Supplier name is required'),
  body('supplierAddress').notEmpty().withMessage('Supplier address is required'),
  body('quantity').isInt().withMessage('Quantity must be an integer'),
  body('quantityUnit').notEmpty().withMessage('Quantity unit is required'),
  body('totalWeight').isFloat().withMessage('Total weight must be a number'),
  body('weightUnit').notEmpty().withMessage('Weight unit is required'),
  body('qualityGrade').notEmpty().withMessage('Quality grade is required'),
  body('status').isIn(['pending','Recieved', 'approved', 'rejected', 'completed']).withMessage('Invalid status'),
  body('currentStep').isInt({ min: 0, max: 4 }).withMessage('Invalid current step'),
];

// router.use(authenticateUser);

// Create or update GRN
// router.post('/',authenticateUser, async (req, res) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ errors: errors.array() });
//   }

//   try {
//     const { id, ...grnData } = req.body;
//     let grn;

//     const commonData = {
//       receivedDate: new Date(grnData.receivedDate),
//       supplierName: grnData.supplierName,
//       supplierAddress: grnData.supplierAddress,
//       plate_no: grnData.plate_no,
//       wbridgeRef: grnData.wbridgeRef,
//       moisture: parseFloat(grnData.moisture),
//       parch: grnData.parch ? parseFloat(grnData.parch) : null,
//       coffee_type: grnData.coffee_type,
//       bags: parseInt(grnData.bags),
//       quantity: parseInt(grnData.quantity),
//       totalWeight: parseFloat(grnData.totalWeight),
//       weightUnit: grnData.weightUnit,
//       quantityUnit: grnData.quantityUnit,
//       lessNoOfBags: parseInt(grnData.lessNoOfBags) || 0,
//       subGrossKg: parseInt(grnData.subGrossKg),
//       lessMoistureKg: parseInt(grnData.lessMoistureKg) || 0,
//       lessQualityKg: parseInt(grnData.lessQualityKg) || 0,
//       netWeightKg: parseInt(grnData.netWeightKg),
//       cheque_in_favor_of: grnData.cheque_in_favor_of,
//       payment_weight: grnData.payment_weight,
//       payment_quantity: parseInt(grnData.payment_quantity),
//       payment_rate: parseInt(grnData.payment_rate),
//       payment_amount: parseInt(grnData.payment_amount),
//       paymentDate: new Date(grnData.paymentDate),
//       drAc: grnData.drAc ? parseInt(grnData.drAc) : null,
//       qualityGrade: grnData.qualityGrade,
//       rate: parseInt(grnData.rate),
//       remarks: grnData.remarks,
//       status: grnData.status,
//       currentStep: parseInt(grnData.currentStep),
//     };

//     if (id) {
//       // Update existing GRN
//       grn = await prisma.grns.update({
//         where: { id: parseInt(id) },
//         data: {
//           ...commonData,
//           [getCurrentStepField(grnData.currentStep)]: { connect: { id: req.user.id } },
//         },
//       });
//     } else {
//       grn = await prisma.grns.create({
//         data: {
//          ...commonData,
//           preparedBy: { connect: { id: req.user.id } },
//         },
//       })
//     }

//     // Send email to next person in workflow if not the last step
//     if (grnData.currentStep < 4) {
//       await sendEmailToNextPerson(grnData.currentStep + 1, grn.id);
//     }

//     res.status(201).json(grn);
//   } catch (error) {
//     console.error('Error creating/updating GRN:', error);
//     res.status(500).json({ message: 'Error creating/updating GRN', error: error.message });
//   }
// });

router.post('/', authenticateUser, validateGRN, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id, ...grnData } = req.body;
    let grn;

    const commonData = {
      receivedDate: new Date(grnData.receivedDate),
      supplierName: grnData.supplierName,
      supplierAddress: grnData.supplierAddress,
      plate_no: grnData.plate_no,
      wbridgeRef: grnData.wbridgeRef,
      moisture: parseFloat(grnData.moisture),
      parch: grnData.parch ? parseFloat(grnData.parch) : null,
      coffee_type: grnData.coffee_type,
      bags: parseInt(grnData.bags),
      quantity: parseInt(grnData.quantity),
      totalWeight: parseFloat(grnData.totalWeight),
      weightUnit: grnData.weightUnit,
      quantityUnit: grnData.quantityUnit,
      lessNoOfBags: parseInt(grnData.lessNoOfBags) || 0,
      subGrossKg: parseInt(grnData.subGrossKg),
      lessMoistureKg: parseInt(grnData.lessMoistureKg) || 0,
      lessQualityKg: parseInt(grnData.lessQualityKg) || 0,
      netWeightKg: parseInt(grnData.netWeightKg),
      cheque_in_favor_of: grnData.cheque_in_favor_of,
      payment_weight: grnData.payment_weight,
      payment_quantity: parseInt(grnData.payment_quantity),
      payment_rate: parseInt(grnData.payment_rate),
      payment_amount: parseInt(grnData.payment_amount),
      paymentDate: new Date(grnData.paymentDate),
      drAc: grnData.drAc ? parseInt(grnData.drAc) : null,
      qualityGrade: grnData.qualityGrade,
      rate: parseInt(grnData.rate),
      remarks: grnData.remarks,
      status: grnData.status,
      currentStep: parseInt(grnData.currentStep),
      preparedBy: { connect: { id: parseInt(grnData.preparedById) } },
      checkedBy: grnData.checkedById ? { connect: { id: parseInt(grnData.checkedById) } } : undefined,
      authorizedBy: grnData.authorizedById ? { connect: { id: parseInt(grnData.authorizedById) } } : undefined,
      receivedBy: grnData.receivedById ? { connect: { id: parseInt(grnData.receivedById) } } : undefined,
    };

    if (id) {
      // Update existing GRN
      grn = await prisma.grns.update({
        where: { id: parseInt(id) },
        data: commonData,
      });
    } else {
      // Create new GRN
      grn = await prisma.grns.create({
        data: commonData,
      });
    }

    // Send email to next person in workflow if not the last step
    if (grnData.currentStep < 4) {
      await sendEmailToNextPerson(grnData.currentStep + 1, grn.id);
    }

    res.status(201).json(grn);
  } catch (error) {
    console.error('Error creating/updating GRN:', error);
    res.status(500).json({ message: 'Error creating/updating GRN', error: error.message });
  }
});


// Get GRN by ID
router.get('/:id',  async (req, res) => {
  try {
    const grn = await prisma.grns.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        preparedBy: true,
        checkedBy: true,
        authorizedBy: true,
        receivedBy: true,
      },
    });
    if (!grn) return res.status(404).json({ error: 'GRN not found' });
    res.json(grn);
  } catch (error) {
    console.error('Error fetching GRN:', error);
    res.status(500).json({ message: 'Error fetching GRN', error: error.message });
  }
});

// List all GRNs (with optional filtering)
router.get('/',  async (req, res) => {
  try {
    const grns = await prisma.grns.findMany();
    res.json(grns);
  } catch (error) {
    console.error('Error fetching GRNs:', error);
    res.status(500).json({ message: 'Error fetching GRNs', error: error.message });
  }
});

// Delete a GRN
router.delete('/:id',  async (req, res) => {
  try {
    await prisma.grns.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: 'GRN deleted successfully' });
  } catch (error) {
    console.error('Error deleting GRN:', error);
    res.status(500).json({ message: 'Error deleting GRN', error: error.message });
  }
});

// Helper function to get the current step field name
function getCurrentStepField(currentStep) {
  const stepFields = ['preparedBy', 'checkedBy', 'authorizedBy', 'receivedBy'];
  return stepFields[currentStep];
}

// Helper function to send email to next person in workflow
async function sendEmailToNextPerson(nextStep, grnId) {
  const roles = ['WeightBridgeManager', 'QualityManager', 'COO', 'ManagingDirector', 'Finance'];
  const nextRole = roles[nextStep];

  try {
    const user = await prisma.user.findFirst({
      where: { role: nextRole },
    });

    if (!user) {
      console.error(`User with role ${nextRole} not found`);
      return;
    }

    console.log('Attempting to create transporter...');
    console.log('EMAIL_NAME:', process.env.EMAIL_NAME);
    console.log('EMAIL_PASSWORD length:', process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.length : 0);

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: "benithalouange@gmail.com",
        pass: "evzc oezs lslz mhoc",
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log('Transporter created, attempting to verify...');

    try {
      await transporter.verify();
      console.log('Transporter verified successfully');
    } catch (verifyError) {
      console.error('Transporter verification failed:', verifyError);
      throw verifyError;
    }

    console.log('Attempting to send email...');

    const info = await transporter.sendMail({
      from: `"GRN System" <${process.env.EMAIL_NAME}>`,
      to: user.email,
      subject: `GRN ${grnId} Ready for Your Approval`,
      text: `Please review and approve GRN ${grnId} in the system.`,
      html: `<p>Please review and approve GRN ${grnId} in the system.</p>`,
    });

    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('Detailed error in sendEmailToNextPerson:', error);
    throw error;
  }
}


module.exports = router;
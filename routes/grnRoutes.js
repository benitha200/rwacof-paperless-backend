const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
require('dotenv').config();
const authenticateUser=require('./UserRoutes');
const GRNApprovalEmail = require('../src/components/ui/GRNApprovalEmail');

const validateGRN = [
  body('receivedDate').isISO8601().toDate().withMessage('Invalid date format'),
  body('supplierName').notEmpty().withMessage('Supplier name is required'),
  body('supplierAddress').notEmpty().withMessage('Supplier address is required'),
  body('quantity').isInt().withMessage('Quantity must be an integer'),
  body('quantityUnit').notEmpty().withMessage('Quantity unit is required'),
  body('totalWeight').isFloat().withMessage('Total weight must be a number'),
  body('weightUnit').notEmpty().withMessage('Weight unit is required'),
  body('qualityGrade').notEmpty().withMessage('Quality grade is required'),
  body('status').isIn(['Received','QualityApproved','PriceSet','MDApproved','Paid']).withMessage('Invalid status'),
  body('currentStep').isInt({ min: 0, max: 4 }).withMessage('Invalid current step'),
];



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
      status: grnData.status || 'pending',
      currentStep: grnData.currentStep || 0,
      preparedBy: { connect: { id: parseInt(grnData.preparedById) } },
      // checkedBy: grnData.checkedById ? { connect: { id: parseInt(grnData.checkedById) } } : undefined,
      // authorizedBy: grnData.authorizedById ? { connect: { id: parseInt(grnData.authorizedById) } } : undefined,
      // receivedBy: grnData.receivedById ? { connect: { id: parseInt(grnData.receivedById) } } : undefined,
    };

    if (id) {
      // Update existing GRN
      grn = await prisma.gRN.update({
        where: { id: parseInt(id) },
        data: commonData,
      });
    } else {
      // Create new GRN
      grn = await prisma.gRN.create({
        data: commonData,
      });
    }


    // Send email to next person in workflow
    await sendEmailToNextPerson(grn.currentStep, grn.id);

    res.status(201).json(grn);
  } catch (error) {
    console.error('Error creating/updating GRN:', error);
    res.status(500).json({ message: 'Error creating/updating GRN', error: error.message });
  }
});


// Get GRN by ID
router.get('/:id',  async (req, res) => {
  try {
    const grn = await prisma.gRN.findUnique({
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
    const grns = await prisma.gRN.findMany({orderBy:{id:'desc'}});
    res.json(grns);
  } catch (error) {
    console.error('Error fetching GRNs:', error);
    res.status(500).json({ message: 'Error fetching GRNs', error: error.message });
  }
});

// Delete a GRN
router.delete('/:id',  async (req, res) => {
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

async function sendEmailToNextPerson(currentStep, grnId) {
  const roles = ['WeightBridgeManager', 'QualityManager', 'COO', 'ManagingDirector', 'Finance'];
  const nextRole = roles[currentStep + 1];

  if (!nextRole) {
    console.log('GRN process completed');
    return;
  }

  try {
    const user = await prisma.user.findFirst({
      where: { role: nextRole },
    });

    if (!user) {
      console.error(`User with role ${nextRole} not found`);
      return;
    }

    const emailHtml = GRNApprovalEmail({
      grnId: grnId,
      recipientName: user.name,
      role: nextRole
    });

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: "benithalouange@gmail.com",
        pass: "pewa uhlk ydil sods",
      },
    });

    await transporter.sendMail({
      from: '"GRN System" <benithalouange@gmail.com>',
      to: user.email,
      subject: `GRN ${grnId} Ready for Your Approval`,
      html: emailHtml,
    });

    console.log(`Email sent to ${user.email} for GRN ${grnId}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}



module.exports = router;
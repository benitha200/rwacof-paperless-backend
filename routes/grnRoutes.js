const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
require('dotenv').config();
const authenticateUser=require('./UserRoutes');
const GRNApprovalEmail = require('../src/components/ui/GRNApprovalEmail');
const { ClientSecretCredential } = require('@azure/identity');

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

const tenantId = process.env.AZURE_TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;
const senderEmail = process.env.EMAIL_USER;

// Create an OAuth2 credential instance
const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

async function getAccessToken() {
  const tokenResponse = await credential.getToken("https://graph.microsoft.com/.default");
  return tokenResponse.token;
}


async function sendEmailGraph(to, subject, htmlContent) {
  try {
    const accessToken = await getAccessToken();

    const emailData = {
      message: {
        subject: subject,
        body: {
          contentType: "HTML",
          content: htmlContent,
        },
        toRecipients: [
          {
            emailAddress: {
              address: to,
            },
          },
        ],
      },
    };

    const response = await fetch(`https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      throw new Error(`Failed to send email: ${await response.text()}`);
    }

    console.log(`✅ Email sent successfully to ${to}`);
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
  }
}


// router.post('/', authenticateUser, validateGRN, async (req, res) => {
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
//       status: grnData.status || 'pending',
//       currentStep: grnData.currentStep || 0,
//       contractRef: grnData.contractRef,
//       price: grnData.price ? parseFloat(grnData.price) : null,
//       preparedBy: { connect: { id: parseInt(grnData.preparedById) } },
//       // checkedBy: grnData.checkedById ? { connect: { id: parseInt(grnData.checkedById) } } : undefined,
//       // authorizedBy: grnData.authorizedById ? { connect: { id: parseInt(grnData.authorizedById) } } : undefined,
//       // receivedBy: grnData.receivedById ? { connect: { id: parseInt(grnData.receivedById) } } : undefined,
//     };

//     if (grnData.price && grnData.contractRef) {
//       commonData = {
//           ...commonData,
//           price: parseFloat(grnData.price),
//           contractRef: grnData.contractRef,
//           status: 'PriceSet',
//           currentStep: 2
//       };
//   }

//   // Handle payment details by Finance
//   if (grnData.exchange_rate) {
//       const payment_quantity = grnData.netWeightKg;
//       const payment_rate = grnData.price * parseFloat(grnData.exchange_rate);
//       const payment_amount = payment_quantity * payment_rate;

//       commonData = {
//           ...commonData,
//           exchange_rate: parseInt(grnData.exchange_rate),
//           payment_quantity,
//           payment_rate,
//           payment_amount,
//           status: 'Paid',
//           currentStep: 4
//       };
//   }

//     if (id) {
//       // Update existing GRN
//       grn = await prisma.gRN.update({
//         where: { id: parseInt(id) },
//         data: commonData,
//       });
//     } else {
//       // Create new GRN
//       grn = await prisma.gRN.create({
//         data: commonData,
//       });
//     }


//     // Send email to next person in workflow
//     await sendEmailToNextPerson(grn.currentStep, grn.id);

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

    // Base common data with only required fields
    let commonData = {
      receivedDate: new Date(grnData.receivedDate),
      supplierName: grnData.supplierName,
      supplierAddress: grnData.supplierAddress,
      plate_no: grnData.plate_no,
      wbridgeRef: grnData.wbridgeRef || '',
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
      qualityGrade: grnData.qualityGrade,
      remarks: grnData.remarks || '',
      price: grnData.price ? parseFloat(grnData.price) : null,
      contractRef: grnData.contractRef || null,
      status: grnData.status,
      currentStep: grnData.currentStep
    };

    // Add optional fields if they exist
    if (grnData.cheque_in_favor_of) {
      commonData.cheque_in_favor_of = grnData.cheque_in_favor_of;
    }

    if (grnData.rate) {
      commonData.rate = parseInt(grnData.rate);
    }

    if (grnData.drAc) {
      commonData.drAc = parseInt(grnData.drAc);
    }

    // Handle exchange rate and payment details
    if (grnData.exchange_rate) {
      const payment_quantity = grnData.netWeightKg;
      const payment_rate = grnData.price * parseFloat(grnData.exchange_rate);
      const payment_amount = payment_quantity * payment_rate;
      
      commonData = {
        ...commonData,
        exchange_rate: parseFloat(grnData.exchange_rate),
        payment_quantity,
        payment_rate,
        payment_amount,
        paymentDate: grnData.paymentDate ? new Date(grnData.paymentDate) : new Date(),
        status: 'Paid',
        currentStep: 4
      };
    }

    // Connect preparedBy relation
    commonData.preparedBy = { connect: { id: parseInt(grnData.preparedById) } };

    if (id) {
      // Update existing GRN
      grn = await prisma.gRN.update({
        where: { id: parseInt(id) },
        data: commonData,
        include: {
          preparedBy: true,
          checkedBy: true,
          authorizedBy: true,
          receivedBy: true,
        },
      });
    } else {
      // Create new GRN
      grn = await prisma.gRN.create({
        data: commonData,
        include: {
          preparedBy: true,
          checkedBy: true,
          authorizedBy: true,
          receivedBy: true,
        },
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

// router.post('/', authenticateUser, validateGRN, async (req, res) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ errors: errors.array() });
//   }

//   try {
//     const { id, ...grnData } = req.body;
//     let grn;

//     // Base common data with only required fields
//     let commonData = {
//       receivedDate: new Date(grnData.receivedDate),
//       supplierName: grnData.supplierName,
//       supplierAddress: grnData.supplierAddress,
//       plate_no: grnData.plate_no,
//       wbridgeRef: grnData.wbridgeRef || '',
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
//       qualityGrade: grnData.qualityGrade,
//       remarks: grnData.remarks || '',
//       status: grnData.status || 'Received',
//       currentStep: grnData.currentStep || 0,
//       preparedBy: { connect: { id: parseInt(grnData.preparedById) } }
//     };

//     // Add optional fields only if they exist and are valid
//     if (grnData.cheque_in_favor_of) {
//       commonData.cheque_in_favor_of = grnData.cheque_in_favor_of;
//     }

//     if (grnData.rate) {
//       commonData.rate = parseInt(grnData.rate);
//     }

//     if (grnData.drAc) {
//       commonData.drAc = parseInt(grnData.drAc);
//     }

//     // Add contract-related fields only if price and contractRef exist
//     if (grnData.price && grnData.contractRef) {
//       commonData = {
//         ...commonData,
//         price: parseFloat(grnData.price),
//         contractRef: grnData.contractRef,
//         status: 'PriceSet',
//         currentStep: 2
//       };
//     }

//     // Add payment-related fields only if exchange_rate exists
//     if (grnData.exchange_rate) {
//       const payment_quantity = grnData.netWeightKg;
//       const payment_rate = grnData.price * parseFloat(grnData.exchange_rate);
//       const payment_amount = payment_quantity * payment_rate;
//       const paymentDate = grnData.paymentDate ? new Date(grnData.paymentDate) : new Date();

//       commonData = {
//         ...commonData,
//         exchange_rate: parseFloat(grnData.exchange_rate),
//         payment_quantity,
//         payment_rate,
//         payment_amount,
//         paymentDate,
//         status: 'Paid',
//         currentStep: 4
//       };
//     }

//     if (id) {
//       // Update existing GRN
//       grn = await prisma.gRN.update({
//         where: { id: parseInt(id) },
//         data: commonData,
//       });
//     } else {
//       // Create new GRN
//       grn = await prisma.gRN.create({
//         data: commonData,
//       });
//     }

//     // Send email to next person in workflow
//     await sendEmailToNextPerson(grn.currentStep, grn.id);

//     res.status(201).json(grn);
//   } catch (error) {
//     console.error('Error creating/updating GRN:', error);
//     res.status(500).json({ message: 'Error creating/updating GRN', error: error.message });
//   }
// });



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

    await sendEmailGraph(
      user.email,
      `GRN ${grnId} Ready for Your Approval`,
      emailHtml
    );

    console.log(`Email sent to ${user.email} for GRN ${grnId}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}


// async function sendEmailToNextPerson(currentStep, grnId) {
//   const roles = ['WeightBridgeManager', 'QualityManager', 'COO', 'ManagingDirector', 'Finance'];
//   const nextRole = roles[currentStep + 1];

//   if (!nextRole) {
//     console.log('GRN process completed');
//     return;
//   }

//   try {
//     const user = await prisma.user.findFirst({
//       where: { role: nextRole },
//     });

//     if (!user) {
//       console.error(`User with role ${nextRole} not found`);
//       return;
//     }

//     const emailHtml = GRNApprovalEmail({
//       grnId: grnId,
//       recipientName: user.name,
//       role: nextRole
//     });

//     const transporter = nodemailer.createTransport({
//       host: 'smtp.gmail.com',
//       port: 587,
//       secure: false,
//       auth: {
//         user: "benithalouange@gmail.com",
//         pass: "pewa uhlk ydil",
//       },
//     });

//     await transporter.sendMail({
//       from: '"GRN System" <benithalouange@gmail.com>',
//       to: user.email,
//       subject: `GRN ${grnId} Ready for Your Approval`,
//       html: emailHtml,
//     });

//     console.log(`Email sent to ${user.email} for GRN ${grnId}`);
//   } catch (error) {
//     console.error('Error sending email:', error);
//   }
// }



module.exports = router;
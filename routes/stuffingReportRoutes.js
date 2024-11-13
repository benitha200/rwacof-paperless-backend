const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Helper function to validate and format dates
const formatDate = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format for: ${dateString}`);
  }
  return date.toISOString();
};

router.post('/', upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 },
  { name: 'image5', maxCount: 1 },
  { name: 'image6', maxCount: 1 },
  { name: 'image7', maxCount: 1 },
  { name: 'image8', maxCount: 1 }
]), async (req, res, next) => {
  try {
    const { shipmentId, ...stuffingReportData } = req.body;

    // Validate shipmentId
    if (!shipmentId || isNaN(parseInt(shipmentId))) {
      return res.status(400).json({ error: 'Valid shipmentId is required' });
    }

    // Parse and validate numberOfBags
    const numberOfBags = parseInt(stuffingReportData.numberOfBags);
    if (isNaN(numberOfBags)) {
      return res.status(400).json({ error: 'Valid numberOfBags is required' });
    }

    // Format the datetime fields
    const formattedData = {
      ...stuffingReportData,
      numberOfBags,
      stuffingStart: formatDate(stuffingReportData.stuffingStart),
      stuffingEnd: formatDate(stuffingReportData.stuffingEnd),
      tempSealTime: formatDate(stuffingReportData.tempSealTime),
      finalSealTime: formatDate(stuffingReportData.finalSealTime),
      signatureDate: formatDate(stuffingReportData.signatureDate),
    };

    // Handle image uploads
    const files = req.files;
    if (files) {
      Object.keys(files).forEach((key) => {
        formattedData[key] = files[key][0].path;
      });
    }

    // Check if a StuffingReport already exists for this shipment
    const existingReport = await prisma.stuffingReport.findUnique({
      where: {
        shipmentId: parseInt(shipmentId)
      }
    });

    let stuffingReport;
    if (existingReport) {
      // Update existing report
      stuffingReport = await prisma.stuffingReport.update({
        where: { id: existingReport.id },
        data: formattedData,
        include: { shipment: true }
      });
    } else {
      // Create new report
      stuffingReport = await prisma.stuffingReport.create({
        data: {
          ...formattedData,
          shipment: {
            connect: { 
              id: parseInt(shipmentId)
            }
          }
        },
        include: { shipment: true }
      });
    }

    res.status(201).json(stuffingReport);

  } catch (error) {
    console.error('Error creating/updating stuffing report:', error);
    
    if (error.message.includes('Invalid date format')) {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        error: 'Shipment not found' 
      });
    }

    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const stuffingReports = await prisma.stuffingReport.findMany({include:{shipment:true}});
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

router.put('/:id', upload.array('images', 8), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { shipmentId, ...stuffingReportData } = req.body;

    // Format the datetime fields
    const formattedData = {
      ...stuffingReportData,
      numberOfBags: parseInt(stuffingReportData.numberOfBags),
      stuffingStart: formatDate(stuffingReportData.stuffingStart),
      stuffingEnd: formatDate(stuffingReportData.stuffingEnd),
      tempSealTime: formatDate(stuffingReportData.tempSealTime),
      finalSealTime: formatDate(stuffingReportData.finalSealTime),
      signatureDate: formatDate(stuffingReportData.signatureDate),
    };

    // Add new image paths to formattedData
    req.files.forEach((file, index) => {
      formattedData[`image${index + 1}`] = file.path;
    });

    const updatedStuffingReport = await prisma.stuffingReport.update({
      where: { id: parseInt(id) },
      data: formattedData,
    });

    res.json(updatedStuffingReport);
  } catch (error) {
    console.error('Error updating stuffing report:', error);
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Fetch the stuffing report to get image paths
    const stuffingReport = await prisma.stuffingReport.findUnique({
      where: { id: parseInt(id) },
    });

    if (!stuffingReport) {
      return res.status(404).json({ error: 'Stuffing report not found' });
    }

    // Delete associated images
    for (let i = 1; i <= 8; i++) {
      const imagePath = stuffingReport[`image${i}`];
      if (imagePath) {
        fs.unlink(imagePath, (err) => {
          if (err) console.error(`Failed to delete image: ${imagePath}`, err);
        });
      }
    }

    // Delete the stuffing report
    await prisma.stuffingReport.delete({
      where: { id: parseInt(id) },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting stuffing report:', error);
    next(error);
  }
});

module.exports = router;
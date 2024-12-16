// const express = require('express');
// const cors = require('cors');
// const morgan = require('morgan');
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();
// const app = express();
// require('dotenv').config();

// // Middleware
// app.use(cors());
// app.use(morgan('dev'));
// app.use(express.json());

// const logRequest = (req, res, next) => {
//   console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
//   console.log('Request Body:', req.body);
//   next();
// };

// app.use(logRequest);

// // Routes
// const shipmentRoutes = require('./routes/shipmentRoutes');
// const loadingTallySheetRoutes = require('./routes/loadingTallySheetRoutes');
// const invoiceRoutes = require('./routes/invoiceRoutes');
// const vgmRoutes = require('./routes/vgmRoutes');
// const stuffingReportRoutes = require('./routes/stuffingReportRoutes');
// const containerRoutes = require('./routes/containerRoutes');
// const userRoutes = require('./routes/UserRoutes');
// const grnRoutes = require('./routes/grnRoutes');

// app.use('/api/shipments', shipmentRoutes);
// app.use('/api/loading-tally-sheets', loadingTallySheetRoutes);
// app.use('/api/invoices', invoiceRoutes);
// app.use('/api/vgms', vgmRoutes);
// app.use('/api/stuffing-reports', stuffingReportRoutes);
// app.use('/api/containers', containerRoutes);
// app.use('/api/users',userRoutes );
// app.use('/api/grn',grnRoutes);
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// // Error handling middleware
// const errorHandler = (err, req, res, next) => {
//   console.error('Error:', err);
//   const statusCode = err.statusCode || 500;
//   const message = err.message || 'Internal server error';
//   res.status(statusCode).json({ error: message });
// };

// app.use(errorHandler);

// const PORT = process.env.PORT || 3001;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const app = express();
require('dotenv').config();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

const logRequest = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Request Body:', req.body);
  next();
};

app.use(logRequest);

// Routes
const shipmentRoutes = require('./routes/shipmentRoutes');
const loadingTallySheetRoutes = require('./routes/loadingTallySheetRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const vgmRoutes = require('./routes/vgmRoutes');
const stuffingReportRoutes = require('./routes/stuffingReportRoutes');
const containerRoutes = require('./routes/containerRoutes');
const userRoutes = require('./routes/UserRoutes');
const grnRoutes = require('./routes/grnRoutes');
const contractRoutes = require('./routes/contractRoutes');
const driverRoutes = require('./routes/DriverRoutes');
const carRoutes = require('./routes/CarRoutes');
const tripsRoutes = require('./routes/TripsRoutes');

app.use('/api/shipments', shipmentRoutes);
app.use('/api/loading-tally-sheets', loadingTallySheetRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/vgms', vgmRoutes);
app.use('/api/stuffing-reports', stuffingReportRoutes);
app.use('/api/containers', containerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/grn', grnRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/car', carRoutes);
app.use('/api/trips', tripsRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  res.status(statusCode).json({ error: message });
};

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
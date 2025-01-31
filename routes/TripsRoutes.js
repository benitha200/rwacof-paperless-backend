// use GMAIL TO SEND EMAILS

// const express = require('express');
// const router = express.Router();
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();
// const nodemailer = require('nodemailer');

// const transporter = nodemailer.createTransport({
//     host: 'smtp.gmail.com',
//     port: 587,
//     secure: false,
//     auth: {
//         user: "benithalouange@gmail.com",
//         pass: "pewa uhlk ydil sods",
//     },
// });

// async function sendEmail(to, subject, text, html) {
//     try {
//         await transporter.sendMail({
//             from: {
//                 name: "Rwacof Paperless Project",
//                 address: "benithalouange@gmail.com"
//             },
//             to,
//             subject,
//             text,
//             html
//         });
//     } catch (error) {
//         console.error('Email sending error:', error);
//     }
// }

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fetch = require("node-fetch");
const { ClientSecretCredential } = require("@azure/identity");

// Azure AD credentials from environment variables
const tenantId = process.env.AZURE_TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;
const userEmail = process.env.EMAIL_USER;

// Create an OAuth2 credential instance
const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

// Function to get access token
async function getAccessToken() {
    const tokenResponse = await credential.getToken("https://graph.microsoft.com/.default");
    return tokenResponse.token;
}

// Updated sendEmail function using Microsoft Graph API
async function sendEmail(to, subject, text, html) {
    try {
        const accessToken = await getAccessToken();

        const emailData = {
            message: {
                subject: subject,
                body: {
                    contentType: "HTML",
                    content: html || text,
                },
                toRecipients: Array.isArray(to) 
                    ? to.map(email => ({ emailAddress: { address: email } }))
                    : to.split(',').map(email => ({ emailAddress: { address: email.trim() } })),
            },
        };

        const response = await fetch(`https://graph.microsoft.com/v1.0/users/${userEmail}/sendMail`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(emailData),
        });

        if (!response.ok) {
            console.error('Email sending error:', await response.text());
            throw new Error(`Failed to send email: ${response.statusText}`);
        }

        console.log("✅ Email sent successfully using Microsoft Graph API!");
    } catch (error) {
        console.error('Failed to send email:', error);
        throw error;
    }
}

// create a new trip request
router.post('/', async (req, res, next) => {
    try {
        const { employeeId, ...tripData } = req.body;

        // Find the employee and their reporting manager
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            include: {
                reportsTo: {
                    include: { user: true }
                },
                user: true
            }
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

      

        // Create trip request
        const tripRequest = await prisma.tripRequest.create({
            data: {
                ...tripData,
                employee: { connect: { id: employeeId } },
                status: 'PENDING',
                supervisorApproval: true,
                adminApproval: false
            }
        });

        console.log(employee);
        console.log(tripData);

        // Send response immediately
        res.status(201).json(tripRequest);

        // Send email asynchronously after response is sent
        sendEmail(
            employee.user.email,
            'Trip Request Submitted Successfully',
            `Your trip request has been submitted and is awaiting approval.`,
            `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333333;
                        max-width: 600px;
                        margin: 0 auto;
                    }
                    .email-container {
                        padding: 20px;
                        background-color: #f9f9f9;
                    }
                    .header {
                        background-color: #008080;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 5px 5px 0 0;
                    }
                    .content {
                        background-color: white;
                        padding: 20px;
                        border-radius: 0 0 5px 5px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .info-section {
                        margin: 15px 0;
                        padding: 15px;
                        background-color: #f5f5f5;
                        border-left: 4px solid #008080;
                    }
                    .footer {
                        margin-top: 20px;
                        text-align: center;
                        color: #666666;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">
                        <h1 style="margin: 0;">Trip Request Submitted</h1>
                    </div>
                    
                    <div class="content">
                        <p>Dear ${employee.user.firstName},</p>
                        
                        <p>Your trip request has been successfully submitted and is now awaiting approval.</p>
                        
                        <div class="info-section">
                            <strong>Trip Details:</strong><br>
                            Destination: ${tripData.itinerary || 'Not specified'}<br>
                            Departure Date: ${tripData.departureDate || 'Not specified'}
                        </div>
                        
                        <p>You will be notified once your trip is approved and car is assigened to you.</p>
                    </div>
                    
                    <div class="footer">
                        <p>This is an automated message. Please do not reply to this email.</p>
                        <p>© ${new Date().getFullYear()} Rwacof Exports Ltd. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            `
        ).catch(error => {
            console.error('Failed to send email:', error);
            // You might want to log this error to your error tracking service
        });

    } catch (error) {
        next(error);
    }
});


router.patch('/:id/supervisor-approve', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        // Find the user and their associated employee
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { employee: true }
        });

        if (!user || !user.employee) {
            return res.status(403).json({ error: 'Unauthorized or Invalid User' });
        }

        // Find the trip request with full details
        const tripRequest = await prisma.tripRequest.findUnique({
            where: { id: parseInt(id) },
            include: {
                employee: {
                    include: {
                        user: true,
                        reportsTo: {
                            include: { user: true }
                        }
                    }
                }
            }
        });

        // Check if the current user is the reporting manager of the trip request creator
        if (tripRequest.employee.reportsToId !== user.employee.id) {
            return res.status(403).json({ error: 'Not authorized to approve this trip' });
        }

        // Update trip request
        const updatedTripRequest = await prisma.tripRequest.update({
            where: { id: parseInt(id) },
            data: {
                supervisorApproval: true,
                status: 'SUPERVISOR_APPROVED'
            },
            include: {
                employee: {
                    include: {
                        user: true,
                        reportsTo: {
                            include: { user: true }
                        }
                    }
                }
            }
        });


        console.log(tripRequest)
        await sendEmail(
            tripRequest.employee.user.email,
            'Trip Request Progress Update',
            `Your trip request has been approved by your supervisor ${tripRequest.employee.reportsTo.user.firstName} and is now pending administrative review.`,
            `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333333;
                        max-width: 600px;
                        margin: 0 auto;
                    }
                    .email-container {
                        padding: 20px;
                        background-color: #f9f9f9;
                    }
                    .header {
                        background-color: #008080;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 5px 5px 0 0;
                    }
                    .content {
                        background-color: white;
                        padding: 20px;
                        border-radius: 0 0 5px 5px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .status-box {
                        margin: 15px 0;
                        padding: 15px;
                        background-color: #e8f5e9;
                        border-left: 4px solid #4caf50;
                        border-radius: 4px;
                    }
                    .next-step {
                        margin: 15px 0;
                        padding: 15px;
                        background-color: #fff3e0;
                        border-left: 4px solid #ff9800;
                        border-radius: 4px;
                    }
                    .footer {
                        margin-top: 20px;
                        text-align: center;
                        color: #666666;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">
                        <h1 style="margin: 0;">Trip Request Update</h1>
                    </div>
                    
                    <div class="content">
                        <p>Dear ${tripRequest.employee.user.firstName},</p>
                        
                        <p>Your trip request has been approved by your supervisor.</p>
                        
                        <div class="status-box">
                            <strong>Current Status:</strong> Supervisor Approved<br>
                            <em>Approved by: ${tripRequest.employee.reportsTo.user.firstName}</em>
                        </div>
                        
                        <div class="next-step">
                            <strong>Next Step:</strong> Awaiting Administrative Review
                        </div>
                        
                        <p>We will notify you once the administrative review is complete.</p>
                    </div>
                    
                    <div class="footer">
                        <p>This is an automated message. Please do not reply to this email.</p>
                        <p>© ${new Date().getFullYear()} Rwacof Exports Ltd. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            `
        );


        res.json(updatedTripRequest);
    } catch (error) {
        next(error);
    }
});


// Reject a trip request
router.patch('/:id/reject', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { userId } = req.body; // ID of the user rejecting the trip

        // Find the user and their associated employee
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { employee: true }
        });

        if (!user || !user.employee) {
            return res.status(403).json({ error: 'Unauthorized or Invalid User' });
        }

        // Find the trip request
        const tripRequest = await prisma.tripRequest.findUnique({
            where: { id: parseInt(id) },
            include: { employee: true }
        });

        // Check if the current user is the reporting manager of the trip request creator
        if (tripRequest.employee.reportsToId !== user.employee.id) {
            return res.status(403).json({ error: 'Not authorized to reject this trip' });
        }

        // Update trip request
        const updatedTripRequest = await prisma.tripRequest.update({
            where: { id: parseInt(id) },
            data: {
                status: 'REJECTED',
                supervisorApproval: false,
                adminApproval: false
            }
        });

        res.json(updatedTripRequest);
    } catch (error) {
        next(error);
    }
});


router.patch('/:id/assign', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { carId, driverId, userId, kmAtDeparture } = req.body;

        // Verify user's role and permissions
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { employee: true }
        });

        if (!user) {
            return res.status(403).json({ error: 'Unauthorized User' });
        }

        // Check if the user is a supervisor (specifically the reporting manager) or an admin
        const tripRequest = await prisma.tripRequest.findUnique({
            where: { id: parseInt(id) },
            include: {
                employee: {
                    include: {
                        user: true,
                        reportsTo: true
                    }
                },
                car: true,
                driver: true
            }
        });

        // Check supervisor approval and authorization
        if (!tripRequest.supervisorApproval) {
            return res.status(400).json({ error: 'Supervisor approval required before assignment' });
        }

        // Additional check for supervisor
        if (user.employee && tripRequest.employee.reportsToId !== user.employee.id) {
            // If not the direct reporting manager, check if they are an admin
            const isAdmin = user.role === 'ADMINISTRATION';
            if (!isAdmin) {
                return res.status(403).json({ error: 'Not authorized to assign trips' });
            }
        }

        // Verify car is available
        const car = await prisma.car.findUnique({
            where: { id: carId }
        });

        if (!car || car.status !== 'AVAILABLE') {
            return res.status(400).json({ error: 'Selected car is not available' });
        }

        // Verify driver is active
        const driver = await prisma.driver.findUnique({
            where: { id: driverId }
        });

        if (!driver || driver.status !== 'ACTIVE') {
            return res.status(400).json({ error: 'Selected driver is not active' });
        }

        // Update trip request with car and driver
        const updatedTripRequest = await prisma.tripRequest.update({
            where: { id: parseInt(id) },
            data: {
                carId,
                driverId,
                status: 'ASSIGNED',
                adminApproval: true,
                kmAtDeparture,
            },
            include: {
                car: true,
                driver: true,
                employee: {
                    include: {
                        user: true,
                        reportsTo: true
                    }
                }
            }
        });

        // Send response immediately
        res.json(updatedTripRequest);

        // Handle email sending asynchronously after response
        const sendEmails = async () => {
            try {
                // Send email to employee
                await sendEmail(
                    tripRequest.employee.user.email,
                    'Trip Request Car and Driver Assigned',
                    `Your trip request has been assigned a car and driver.`,
                    `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333333;
                            max-width: 600px;
                            margin: 0 auto;
                        }
                        .email-container {
                            padding: 20px;
                            background-color: #f9f9f9;
                        }
                        .header {
                            background-color: #008080;
                            color: white;
                            padding: 20px;
                            text-align: center;
                            border-radius: 5px 5px 0 0;
                        }
                        .content {
                            background-color: white;
                            padding: 20px;
                            border-radius: 0 0 5px 5px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        .detail-item {
                            margin: 15px 0;
                            padding: 10px;
                            background-color: #f5f5f5;
                            border-left: 4px solid #008080;
                        }
                        .footer {
                            margin-top: 20px;
                            text-align: center;
                            color: #666666;
                            font-size: 14px;
                        }
                        .important-note {
                            background-color: #fff3cd;
                            border-left: 4px solid #ffc107;
                            padding: 10px;
                            margin-top: 20px;
                        }
                    </style>
                </head>
                <body>
                    <div class="email-container">
                        <div class="header">
                            <h1 style="margin: 0;">Trip Request Approved & Assigned</h1>
                        </div>
                        
                        <div class="content">
                            <p>Dear ${tripRequest.employee.user.firstName},</p>
                            
                            <p>Your trip request has been approved and the necessary resources have been assigned. Please review the following details for your upcoming trip:</p>
                            
                            <div class="detail-item">
                                <strong>Trip Details:</strong><br>
                                Destination: ${tripRequest.itinerary}<br>
                                Departure Date: ${new Date(tripRequest.departureDate).toLocaleDateString()}<br>
                                Initial Km Reading: ${kmAtDeparture} km
                            </div>

                            <div class="detail-item">
                                <strong>Assigned Vehicle:</strong><br>
                                Make/Model: ${car.model}<br>
                                License Plate: ${car.licensePlate}<br>
                            </div>
                            
                            <div class="detail-item">
                                <strong>Assigned Driver:</strong><br>
                                Name: ${driver.firstName} ${driver.lastName}<br>
                                Contact Number: ${driver.phoneNumber}<br>
                            </div>
                            
                            <div class="important-note">
                                <strong>Important Reminders:</strong>
                                <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                                    <li>Please be ready 15 minutes before your scheduled departure time</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="footer">
                            <p>For any questions or changes, please go to the reception for more info.</p>
                            <p>© ${new Date().getFullYear()} Rwacof Exports Ltd. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
                `
                );

                // Send email to management
                const managementEmails = [
                    'md@sucafina1.com',
                    'coo@sucafina1.com',
                    'finance@sucafina1.com',
                    'ibl@sucafina.com'
                ];

                console.log('Sending email to management:', managementEmails);
                console.log(tripRequest);
                console.log(updatedTripRequest);

                await sendEmail(
                    managementEmails.join(','),
                    'Trip Request Approved by Supervisor',
                    `A trip request by ${tripRequest.employee.user.firstName} ${tripRequest.employee.user.lastName} has been approved by their supervisor.`,
                    `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333333;
                            max-width: 600px;
                            margin: 0 auto;
                        }
                        .email-container {
                            padding: 20px;
                            background-color: #f9f9f9;
                        }
                        .header {
                            background-color: #008080;
                            color: white;
                            padding: 20px;
                            text-align: center;
                            border-radius: 5px 5px 0 0;
                        }
                        .content {
                            background-color: white;
                            padding: 20px;
                            border-radius: 0 0 5px 5px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        .info-section {
                            margin: 15px 0;
                            padding: 15px;
                            background-color: #f5f5f5;
                            border-left: 4px solid #008080;
                        }
                        .footer {
                            margin-top: 20px;
                            text-align: center;
                            color: #666666;
                            font-size: 14px;
                        }
                    </style>
                </head>
                <body>
                    <div class="email-container">
                        <div class="header">
                            <h1 style="margin: 0;">Trip Request Management Notification</h1>
                        </div>
                        
                        <div class="content">
                            <p>This is to notify you that a new trip request has been approved and assigned.</p>
                            
                            <div class="info-section">
                                <strong>Employee Information:</strong><br>
                                Name: ${tripRequest.employee.user.firstName} ${tripRequest.employee.user.lastName}<br>
                                Department: ${tripRequest.unitDepartment || 'Not specified'}<br>
                            </div>
                            
                            <div class="info-section">
                                <strong>Trip Details:</strong><br>
                                Destination: ${updatedTripRequest.itinerary}<br>
                                Purpose: ${updatedTripRequest.reason || 'Not specified'}<br>
                                Departure Date: ${new Date(updatedTripRequest.departureDate).toLocaleDateString()}<br>
                                Expected Return: ${new Date(updatedTripRequest.returnDate).toLocaleDateString()}<br>
                                Initial Km: ${kmAtDeparture} km
                            </div>

                            <div class="info-section">
                                <strong>Resource Assignment:</strong><br>
                                Vehicle: ${car.model} (${car.licensePlate})<br>
                                Driver: ${driver.firstName} ${driver.lastName}<br>
                            </div>
                        </div>
                        
                        <div class="footer">
                            <p>This notification is for your records. The trip has been approved and resources have been assigned.</p>
                            <p>© ${new Date().getFullYear()} Rwacof Exports Ltd. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
                `
                );
            } catch (error) {
                console.error('Error sending emails:', error);
                // Log to error tracking service if available
            }
        };

        // Fire and forget emails
        sendEmails().catch(error => {
            console.error('Failed to send emails:', error);
        });

    } catch (error) {
        next(error);
    }
});

router.get('/', async (req, res, next) => {
    try {
        const tripRequests = await prisma.tripRequest.findMany({
            include: {
                employee: {
                    include: {
                        reportsTo: {
                            include: {
                                user: true
                            }
                        },
                        user: true
                    }
                },
                car: true,
                driver: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(tripRequests);
    } catch (error) {
        next(error);
    }
});

// Get a specific trip request
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const tripRequest = await prisma.tripRequest.findUnique({
            where: { id: parseInt(id) },
            include: {
                employee: {
                    include: {
                        reportsTo: {
                            include: {
                                user: true
                            }
                        },
                        user: true
                    }
                },
                car: true,
                driver: true
            }
        });

        if (!tripRequest) {
            return res.status(404).json({ error: 'Trip request not found' });
        }
        res.json(tripRequest);
    } catch (error) {
        next(error);
    }
});

// Update a trip request
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const updatedTripRequest = await prisma.tripRequest.update({
            where: { id: parseInt(id) },
            data: {
                ...req.body,
                // Reset approvals if significant changes are made
                ...(Object.keys(req.body).length > 0 && {
                    supervisorApproval: true,
                    adminApproval: false,
                    status: 'PENDING'
                })
            }
        });
        res.json(updatedTripRequest);
    } catch (error) {
        next(error);
    }
});

// Delete a trip request
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.tripRequest.delete({
            where: { id: parseInt(id) }
        });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

router.patch('/:id/finish', async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            userId,
            kmAtArrival,
            returnDate
        } = req.body;

        // Verify user's role and permissions
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { employee: true }
        });

        if (!user) {
            return res.status(403).json({ error: 'Unauthorized User' });
        }

        // Find the trip request
        const tripRequest = await prisma.tripRequest.findUnique({
            where: { id: parseInt(id) }
        });

        if (!tripRequest) {
            return res.status(404).json({ error: 'Trip request not found' });
        }

        // Validate input
        if (!kmAtArrival || !returnDate) {
            return res.status(400).json({ error: 'Missing required trip details' });
        }

        // Update trip request with finish details
        const updatedTripRequest = await prisma.tripRequest.update({
            where: { id: parseInt(id) },
            data: {
                kmAtArrival: parseInt(kmAtArrival),
                returnDate: new Date(returnDate),
                status: 'COMPLETED',
                // notes: notes || null
            },
            include: {
                car: true,
                employee: {
                    include: {
                        user: true
                    }
                }
            }
        });

        // Update car status back to AVAILABLE
        if (updatedTripRequest.car) {
            await prisma.car.update({
                where: { id: updatedTripRequest.car.id },
                data: { status: 'AVAILABLE' }
            });
        }

        res.json(updatedTripRequest);
    } catch (error) {
        next(error);
    }
});

// Get all trip requests for a specific employee by user ID
router.get('/user/:userId', async (req, res, next) => {
    try {
        const { userId } = req.params;

        // Find the employee associated with the user ID
        const employee = await prisma.employee.findFirst({
            where: { userId: parseInt(userId) }
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Fetch all trip requests for this employee
        const tripRequests = await prisma.tripRequest.findMany({
            where: { employeeId: employee.id },
            include: {
                employee: {
                    include: {
                        reportsTo: {
                            include: {
                                user: true
                            }
                        },
                        user: true
                    }
                },
                car: true,
                driver: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json(tripRequests);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
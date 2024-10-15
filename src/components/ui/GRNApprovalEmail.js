const GRNApprovalEmail = ({ grnId, recipientName, role }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>GRN Approval Request</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e0e0e0;">
        <tr>
          <td style="padding: 40px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="text-transform: uppercase; font-size: 14px; color: #14b8a6; font-weight: bold; padding-bottom: 10px;">
                  GRN Approval Request
                </td>
              </tr>
              <tr>
                <td style="font-size: 18px; font-weight: bold; color: #333333; padding-bottom: 20px;">
                  GRN ${grnId} Ready for Your Approval
                </td>
              </tr>
              <tr>
                <td style="color: #666666; padding-bottom: 20px;">
                  Hello ${role},
                  <br><br>
                  A new Goods Receipt Note (GRN) requires your attention and approval.
                </td>
              </tr>
              <tr>
                <td>
                  <table cellpadding="5" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td width="20" valign="top">📄</td>
                      <td style="color: #444444;">GRN ID: ${grnId}</td>
                    </tr>
                    <tr>
                      <td width="20" valign="top">👤</td>
                      <td style="color: #444444;">Required Approval From ${role}</td>
                    </tr>
                    <tr>
                      <td width="20" valign="top">⏰</td>
                      <td style="color: #444444;">Action Required: Review and Approve</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding-top: 30px; padding-bottom: 30px;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="background-color: #14b8a6; border-radius: 4px;">
                        <a href="http://localhost:5173/grn/${grnId}" style="display: inline-block; padding: 12px 20px; color: #ffffff; text-decoration: none; font-weight: bold;">
                          View and Approve GRN
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="color: #888888; font-size: 14px; padding-bottom: 20px;">
                  If you have any questions or concerns, please contact the IT department.
                </td>
              </tr>
              <tr>
                <td style="border-top: 1px solid #e0e0e0; padding-top: 20px; color: #888888; font-size: 14px;">
                  Best regards,
                  <br>
                  GRN System
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

module.exports = GRNApprovalEmail;
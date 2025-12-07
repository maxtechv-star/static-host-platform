const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.fromEmail = process.env.EMAIL_FROM || 'noreply@statichost.dev';
        this.adminEmail = process.env.ADMIN_EMAIL || 'verondev@example.com';
        this.appName = process.env.APP_NAME || 'StaticHost';
        this.appUrl = process.env.APP_URL || 'http://localhost:3000';
        
        // Initialize SendGrid if API key is provided
        if (process.env.SENDGRID_API_KEY) {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            this.useSendGrid = true;
        } else {
            // Fallback to nodemailer for development
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'localhost',
                port: process.env.SMTP_PORT || 1025,
                secure: false,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });
            this.useSendGrid = false;
        }
    }
    
    // Send email using configured service
    async sendEmail(to, subject, html, text = '') {
        const mailOptions = {
            from: `${this.appName} <${this.fromEmail}>`,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject: subject,
            html: html,
            text: text || this.htmlToText(html)
        };
        
        try {
            if (this.useSendGrid) {
                await sgMail.send(mailOptions);
            } else {
                await this.transporter.sendMail(mailOptions);
            }
            
            console.log(`✅ Email sent to ${to} - ${subject}`);
            return { success: true, messageId: Date.now().toString() };
        } catch (error) {
            console.error('❌ Email sending failed:', error);
            throw new Error(`Failed to send email: ${error.message}`);
        }
    }
    
    // Send verification email
    async sendVerificationEmail(userEmail, userName, verificationToken) {
        const verificationUrl = `${this.appUrl}/auth/verify-email?token=${verificationToken}`;
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to ${this.appName}!</h1>
                    </div>
                    <div class="content">
                        <h2>Hi ${userName},</h2>
                        <p>Thank you for signing up for ${this.appName}. To complete your registration, please verify your email address by clicking the button below:</p>
                        
                        <p style="text-align: center;">
                            <a href="${verificationUrl}" class="button">Verify Email Address</a>
                        </p>
                        
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #4F46E5;">${verificationUrl}</p>
                        
                        <p>This verification link will expire in 24 hours.</p>
                        
                        <p>If you didn't create an account with ${this.appName}, you can safely ignore this email.</p>
                        
                        <div class="footer">
                            <p>This email was sent by ${this.appName} - Static site hosting platform by <strong>VeronDev</strong></p>
                            <p>Need help? Contact our support team at <a href="mailto:${this.adminEmail}">${this.adminEmail}</a></p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const text = `Welcome to ${this.appName}!\n\nHi ${userName},\n\nPlease verify your email by visiting: ${verificationUrl}\n\nThis link expires in 24 hours.\n\nThank you,\nThe ${this.appName} Team`;
        
        return this.sendEmail(userEmail, `Verify Your ${this.appName} Account`, html, text);
    }
    
    // Send site activation email
    async sendSiteActivationEmail(userEmail, userName, siteName, siteUrl) {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .button { display: inline-block; padding: 12px 24px; background: #10B981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Your Site is Live!</h1>
                    </div>
                    <div class="content">
                        <h2>Hi ${userName},</h2>
                        <p>Great news! Your site <strong>"${siteName}"</strong> has been successfully activated and is now live on ${this.appName}.</p>
                        
                        <p style="text-align: center;">
                            <a href="${siteUrl}" class="button" target="_blank">Visit Your Site</a>
                        </p>
                        
                        <p><strong>Site URL:</strong> <a href="${siteUrl}" target="_blank">${siteUrl}</a></p>
                        
                        <h3>📊 Analytics Tracking</h3>
                        <p>To track visitors on your site, add this script to your HTML:</p>
                        <pre style="background: #f0f0f0; padding: 15px; border-radius: 5px; overflow-x: auto;">
&lt;script src="${this.appUrl}/analytics-script.js" data-site-id="YOUR_SITE_ID"&gt;&lt;/script&gt;</pre>
                        
                        <p>Replace YOUR_SITE_ID with your actual site ID (available in your dashboard).</p>
                        
                        <h3>🔧 Next Steps</h3>
                        <ul>
                            <li>Share your site URL with others</li>
                            <li>Monitor analytics in your dashboard</li>
                            <li>Upload new versions when needed</li>
                            <li>Check your storage usage</li>
                        </ul>
                        
                        <div class="footer">
                            <p>This email was sent by ${this.appName} - Static site hosting platform</p>
                            <p>Platform owner: <strong>VeronDev</strong> | Admin contact: <a href="mailto:${this.adminEmail}">${this.adminEmail}</a></p>
                            <p><a href="${this.appUrl}/dashboard">Go to Dashboard</a></p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const text = `Your Site is Live!\n\nHi ${userName},\n\nYour site "${siteName}" is now live at: ${siteUrl}\n\nTo track analytics, add this script to your HTML:\n<script src="${this.appUrl}/analytics-script.js" data-site-id="YOUR_SITE_ID"></script>\n\nThank you for using ${this.appName}!\n\n- The ${this.appName} Team`;
        
        return this.sendEmail(userEmail, `🎉 Your Site "${siteName}" is Now Live!`, html, text);
    }
    
    // Send password reset email
    async sendPasswordResetEmail(userEmail, userName, resetToken) {
        const resetUrl = `${this.appUrl}/auth/reset-password?token=${resetToken}`;
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #EF4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .button { display: inline-block; padding: 12px 24px; background: #EF4444; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .warning { background: #FEF3C7; border-left: 4px solid #D97706; padding: 10px; margin: 15px 0; }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Reset Your Password</h1>
                    </div>
                    <div class="content">
                        <h2>Hi ${userName},</h2>
                        <p>We received a request to reset your password for your ${this.appName} account.</p>
                        
                        <p style="text-align: center;">
                            <a href="${resetUrl}" class="button">Reset Password</a>
                        </p>
                        
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #EF4444;">${resetUrl}</p>
                        
                        <div class="warning">
                            <p><strong>⚠️ Important:</strong> This password reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
                        </div>
                        
                        <div class="footer">
                            <p>This email was sent by ${this.appName} - Static site hosting platform</p>
                            <p>Platform owner: <strong>VeronDev</strong></p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const text = `Reset Your Password\n\nHi ${userName},\n\nReset your password by visiting: ${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\n- The ${this.appName} Team`;
        
        return this.sendEmail(userEmail, `Reset Your ${this.appName} Password`, html, text);
    }
    
    // Send admin notification for new site
    async sendAdminNewSiteNotification(siteData, userData) {
        const adminUrl = `${this.appUrl}/admin/sites/${siteData._id}`;
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #8B5CF6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    .info-table td { padding: 10px; border-bottom: 1px solid #eee; }
                    .info-table tr:last-child td { border-bottom: none; }
                    .button { display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 5px; }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📝 New Site Created</h1>
                    </div>
                    <div class="content">
                        <h2>Admin Notification</h2>
                        <p>A new site has been created on ${this.appName} platform.</p>
                        
                        <table class="info-table">
                            <tr>
                                <td><strong>Site Name:</strong></td>
                                <td>${siteData.name}</td>
                            </tr>
                            <tr>
                                <td><strong>Site ID:</strong></td>
                                <td>${siteData._id}</td>
                            </tr>
                            <tr>
                                <td><strong>Site URL:</strong></td>
                                <td><a href="${siteData.publicUrl}" target="_blank">${siteData.publicUrl}</a></td>
                            </tr>
                            <tr>
                                <td><strong>Status:</strong></td>
                                <td><span style="color: ${siteData.status === 'active' ? '#10B981' : '#F59E0B'}">${siteData.status.toUpperCase()}</span></td>
                            </tr>
                            <tr>
                                <td><strong>Created:</strong></td>
                                <td>${new Date(siteData.createdAt).toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td><strong>User:</strong></td>
                                <td>${userData.name} (${userData.email})</td>
                            </tr>
                            <tr>
                                <td><strong>User ID:</strong></td>
                                <td>${userData._id}</td>
                            </tr>
                        </table>
                        
                        <p style="text-align: center;">
                            <a href="${adminUrl}" class="button" target="_blank">Manage Site in Admin Panel</a>
                        </p>
                        
                        <div class="footer">
                            <p>This is an automated notification from ${this.appName} admin system</p>
                            <p>Platform owner: <strong>VeronDev</strong> (GitHub: VeronDev)</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        return this.sendEmail(this.adminEmail, `📝 New Site: ${siteData.name}`, html);
    }
    
    // Send quota warning email
    async sendQuotaWarningEmail(userEmail, userName, quotaType, usagePercent) {
        const dashboardUrl = `${this.appUrl}/dashboard`;
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #F59E0B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .warning { background: #FEF3C7; border-left: 4px solid #D97706; padding: 15px; margin: 20px 0; }
                    .progress { height: 20px; background: #E5E7EB; border-radius: 10px; overflow: hidden; margin: 15px 0; }
                    .progress-bar { height: 100%; background: ${usagePercent > 90 ? '#EF4444' : usagePercent > 75 ? '#F59E0B' : '#10B981'}; width: ${usagePercent}%; }
                    .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⚠️ Storage Quota Warning</h1>
                    </div>
                    <div class="content">
                        <h2>Hi ${userName},</h2>
                        <p>Your ${this.appName} account is approaching its ${quotaType} limit.</p>
                        
                        <div class="warning">
                            <p><strong>Current Usage:</strong> ${usagePercent}% of ${quotaType} limit</p>
                            <div class="progress">
                                <div class="progress-bar"></div>
                            </div>
                            <p>Once you reach 100%, you won't be able to upload new files until you free up space or upgrade your plan.</p>
                        </div>
                        
                        <h3>💡 Suggestions:</h3>
                        <ul>
                            <li>Delete unused files from your sites</li>
                            <li>Remove old site versions</li>
                            <li>Optimize images and assets</li>
                            <li>Consider upgrading your plan (if available)</li>
                        </ul>
                        
                        <p style="text-align: center;">
                            <a href="${dashboardUrl}" class="button" target="_blank">Manage Your Storage</a>
                        </p>
                        
                        <div class="footer">
                            <p>This is an automated notification from ${this.appName}</p>
                            <p>Platform owner: <strong>VeronDev</strong> | Contact: <a href="mailto:${this.adminEmail}">${this.adminEmail}</a></p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const text = `Quota Warning\n\nHi ${userName},\n\nYour ${this.appName} account is at ${usagePercent}% of ${quotaType} limit.\n\nManage your storage: ${dashboardUrl}\n\n- The ${this.appName} Team`;
        
        const subject = usagePercent > 90 
            ? `🚨 URGENT: ${quotaType} Limit Almost Reached (${usagePercent}%)`
            : `⚠️ ${quotaType} Warning: ${usagePercent}% Used`;
        
        return this.sendEmail(userEmail, subject, html, text);
    }
    
    // Convert HTML to plain text
    htmlToText(html) {
        return html
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim();
    }
    
    // Test email configuration
    async testEmailConfig() {
        try {
            const testEmail = process.env.TEST_EMAIL || this.adminEmail;
            
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .success { color: #10B981; }
                    </style>
                </head>
                <body>
                    <h1 class="success">✅ Email Test Successful</h1>
                    <p>This is a test email from ${this.appName} email service.</p>
                    <p>Timestamp: ${new Date().toISOString()}</p>
                    <p>Platform: ${this.appName} by <strong>VeronDev</strong></p>
                </body>
                </html>
            `;
            
            await this.sendEmail(testEmail, `✅ ${this.appName} Email Test`, html);
            
            return { success: true, message: 'Test email sent successfully' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Singleton instance
const emailService = new EmailService();

module.exports = emailService;
require('dotenv').config();
const puppeteer = require('puppeteer');
const chromium = require('chromium');
const axios = require('axios');
const nodemailer = require('nodemailer');

const getTimeAgo = require('./helpers');

const scrapeJobsAndNotify = async () => {
    const browser = await puppeteer.launch({
        executablePath: chromium.path, // Use the Chromium path from the package
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Required for restricted environments like Render
    });

    const page = await browser.newPage();

    try {
        // Navigate to login page
        console.log(`Navigating to: ${process.env.WEBSITE_URL}`);
        await page.goto(process.env.WEBSITE_URL, { waitUntil: 'networkidle2' });

        // Perform login
        await page.type('#email', process.env.USERNAME);
        await page.type('#password', process.env.PASSWORD);
        await page.click('#__next > div > div.styles_layout__vooAi > div > div > form > button');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        console.log('Logged in successfully!');
        
       
        const authToken = await page.evaluate(() => {
            // Retrieve the raw value
            const rawValue = localStorage.getItem('okta-token-storage');
            
            if (!rawValue) {
                throw new Error('Token storage not found in localStorage');
            }
        
            // Parse the JSON
            const parsedValue = JSON.parse(rawValue);
        
            // Access the nested idToken
            return parsedValue.idToken?.idToken || null;
        });
        
        if (!authToken) {
            throw new Error('Auth token not found in token storage');
        }

        // Close Puppeteer browser
        await browser.close();

        // Fetch jobs via API using Axios
        const apiUrl = process.env.APIURL;
        const response = await axios.get(apiUrl, {
            headers: { Authorization: `Bearer ${authToken}` },
        });

        const jobs = response.data.data;
        console.log(`Fetched ${jobs.length} jobs.`);

    
        // Format job data for email
        const jobList = jobs.map(job => 
            `**${job.title}**\n` +
            `Company: ${job.company_name || 'N/A'}\n` +
            `Location: ${job.location || 'Remote'}\n` +
            `Applicants: ${job.applicants || 'N/A'}\n` +
            `Link: ${job.company_url || 'N/A'}\n` +
            `Recommendation Rank: ${job.recommendation_rank || 'N/A'}\n` +
            `Creation Date: ${getTimeAgo(job.creation_date)}\n\n`
        ).join('');

        if (jobs.length > 0) {
            // Send email notification
            await sendEmailNotification(jobList);
            console.log('Email notification sent successfully!');
        } else {
            console.log('No jobs found to notify.');
        }

        return jobs;
    } catch (error) {
        console.error('Error scraping jobs or sending email:', error);
    } finally {
        await browser.close();
    }
};

const sendEmailNotification = async (jobList) => {
    // Configure email transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL, // Your email
            pass: process.env.EMAIL_PASSWORD, // Your email password or app password
        },
    });

    // Send the email
    const mailOptions = {
        from: `"Job Nest" <${process.env.EMAIL}>`,
        to: process.env.NOTIFY_EMAIL, // Recipient email
        subject: 'New Andela Job Listings Available!',
        text: `Here are the latest job listings specially curated for Ali S. :\n\n${jobList}`,
    };

    await transporter.sendMail(mailOptions);
};

scrapeJobsAndNotify();

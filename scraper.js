require('dotenv').config();
const puppeteer = require('puppeteer');
const axios = require('axios');
const nodemailer = require('nodemailer');
const imaps = require('imap-simple');
const simpleParser = require('mailparser').simpleParser;
const getTimeAgo = require('./helpers');

const getMagicLinkFromYahoo = async () => {
    const config = {
        imap: {
            user: process.env.YAHOO_EMAIL,
            password: process.env.YAHOO_PASSWORD,
            host: 'imap.mail.yahoo.com',
            port: 993,
            tls: true,
            authTimeout: 10000,
        },
    };

    const connection = await imaps.connect(config);
    await connection.openBox('INBOX');

    const delay = 1 * 60 * 1000; // 1 minute
    const formatDateForIMAP = date =>
        date.toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).replace(',', '');
    const since = formatDateForIMAP(new Date(Date.now() - delay));

    const searchCriteria = [
        ['SINCE', since],
        ['FROM', 'hello@andela.com'],
        ['SUBJECT', 'Log in to Andela']
    ];

    const fetchOptions = {
        bodies: [''],
        markSeen: true
    };

    let messages;
    try {
        messages = await connection.search(searchCriteria, fetchOptions);
        console.log(messages);
    } catch (err) {
        console.error('🔴 IMAP search failed:', err.message);
        throw new Error('Failed to search Yahoo inbox.');
    }

    if (!messages.length) {
        throw new Error('📭 No matching messages found in Yahoo inbox.');
    }

    messages.sort((a, b) => new Date(b.attributes.date) - new Date(a.attributes.date)); // newest first


    for (const message of messages) {
        const part = message.parts.find(p => p.which === '');
        if (!part?.body) continue;

        const parsed = await simpleParser(part.body);

        if (parsed.html) {
            // Look for the link with text "Log in to Andela"
            const match = parsed.html.match(/<a[^>]+href="([^"]+)"[^>]*>Log in to Andela<\/a>/i);
            if (match && match[1]) {
                const url = match[1];
                console.log('✅ Found magic link (tracking URL):', url);
                return url;
            }
        }
    }

    throw new Error('Magic link not found in Yahoo inbox');
};

const scrapeJobsAndNotify = async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    try {
        console.log(`Navigating to: ${process.env.WEBSITE_URL}`);
        await page.goto(process.env.WEBSITE_URL, { waitUntil: 'domcontentloaded' });

        // Enter email to request magic link
        await page.waitForSelector('#email', {
          visible: true,
          timeout: 30000,
        });
        await page.type('#email', process.env.USERNAME);
        await page.click('button[type=submit]');
        console.log('Magic link requested. Waiting for email...');

        const delayMs = 1 * 60 * 1000; // 1 minute

        console.log('⏳ Magic link requested. Waiting 1 minute before checking Yahoo inbox...');
        await new Promise(resolve => setTimeout(resolve, delayMs)); // Wait 1 minute

        // Wait and retrieve magic link from Yahoo
        const magicLink = await getMagicLinkFromYahoo();
        

        // Navigate to the magic link to login
        await page.goto(magicLink, { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log('Navigating to magic link...');

        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log('✅ Login redirect complete!');

        // Retrieve token
        console.log('⌛ Waiting for login redirect to complete...');
        await new Promise(resolve => setTimeout(resolve, 20000));// adjust timing if needed

        // Get all open tabs/pages
        const pages = await browser.pages();

        let sessionToken = null;

        for (const page of pages) {
            try {
                console.log(`🔍 Checking page: ${page.url()}`);

                const cookies = await page.cookies();

                const sessionCookie = cookies.find(
                    cookie => cookie.name === '__session'
                );

                if (sessionCookie) {
                    console.log('✅ __session cookie found!');
                    sessionToken = sessionCookie.value;
                    break;
                }
            } catch (error) {
                console.warn(`⚠️ Skipping page: ${error.message}`);
            }
        }

        if (!sessionToken) {
            throw new Error('❌ __session cookie not found');
        }

        await browser.close();

        // Fetch jobs
        const apiUrl = process.env.APIURL;
        const response = await axios.get(apiUrl, {
            headers: { Authorization: `Bearer ${sessionToken}` },
        });

        const { keys, items } = response.data;

        // Convert each item array into an object
        let jobs = items.map(item =>
            Object.fromEntries(
                keys.map((key, index) => [key, item[index]])
            )
        );

        console.log(`Fetched ${jobs.length} jobs.`);

        jobs = jobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const jobList = jobs.map(job => 
            `**${job.title}**\n` +
            `Company: ${job.organization_name || 'N/A'}\n` +
            `Location: ${job.working_location || 'Remote'}\n` +
            `Required Skills: ${job.required_skills?.map(s => s.name).join(', ') || 'N/A'}\n` +
            `Optional Skills: ${job.optional_skills?.map(s => s.name).join(', ') || 'N/A'}\n` +
            `Created: ${getTimeAgo(job.created_at)}\n\n`
        ).join('');

        if (jobs.length > 0) {
            await sendEmailNotification(jobList);
            console.log('Email notification sent!');
        } else {
            console.log('No jobs found.');
        }

        return jobs;

    } catch (error) {
        console.error('Error scraping jobs:', error);
    } finally {
        await browser.close();
    }
};

const sendEmailNotification = async (jobList) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    const mailOptions = {
        from: `"Job Nest" <${process.env.EMAIL}>`,
        to: process.env.NOTIFY_EMAIL,
        subject: 'Latest Andela Jobs',
        text: `Hi Ali,\n\nHere are your latest job leads:\n\n${jobList}`,
    };

    await transporter.sendMail(mailOptions);
};

scrapeJobsAndNotify();

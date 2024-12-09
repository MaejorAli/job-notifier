# Job Notifier with Email Notifications

This project is a **Node.js** application that scrapes job listings from a website and sends periodic email notifications with the latest job listings. The application uses **Puppeteer** for web scraping and **Nodemailer** for sending emails. Additionally, it includes a cron job to execute the scraping process automatically at regular intervals.

## Features

- Scrapes job listings from a specified website.
- Sends email notifications with the scraped job details.
- Automatically executes the scraper every three hours using a cron job.
- Can be deployed on platforms like Heroku or Render.

## Requirements

- Node.js (v18.x.x or higher recommended)
- npm (Node Package Manager)
- Gmail account for sending email notifications (with app password enabled)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/job-scraper.git
   cd job-scraper

2. Install dependencies:
   ```bash
   npm install

3. Configure environment variables: Create a .env file in the root directory and add the following variables:
   ```bash
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-email-app-password
   RECEIVER_EMAIL=receiver-email@gmail.com
   TARGET_URL=https://example.com/login


   - SMTP_USER: Your Gmail address (used to send emails).
   - SMTP_PASS: Gmail app password for the SMTP_USER.
   - RECEIVER_EMAIL: The email address to send the notifications to.
   - TARGET_URL: The URL of the website to scrape jobs from.   

4. Run the application locally:
   ```bash
   node scraper.js


### Deploying on Heroku

1. **Login to Heroku**  
   Open a terminal and log in to your Heroku account:
   ```bash
   heroku login

2. **Create a New Heroku App**
   ```bash
   heroku create

3. **Add the required environment variables to Heroku**
   ```bash
   heroku config:set SMTP_USER=your-email@gmail.com SMTP_PASS=your-email-app-password RECEIVER_EMAIL=receiver-email@gmail.com TARGET_URL=https://example.com/login

4. **Add a Procfile**
   ```bash
   worker: node scraper.js

5. **Push the Code to Heroku**
   ```bash
   git push heroku main

6. **Check Logs**
   ```bash
   heroku logs --tail

7. **Scale the Worker Dyno**
   ```bash
   heroku ps:scale worker=1






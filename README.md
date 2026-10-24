# MERN E-Commerce Application

A full-stack e-commerce application built with MongoDB, Express, React, and Node.js. It supports customer accounts, product browsing, shopping carts, checkout, order management, online payments, and refund processing.

## Features

- User registration and login with cookie-based authentication
- Role-based access for customers and administrators
- Product listing and admin product management
- Product image uploads using Cloudinary
- Shopping cart with quantity updates and item removal
- Checkout with Cash on Delivery (COD) and Razorpay
- Customer order history and order details
- Admin order management and status updates
- Razorpay payment verification and signed webhook handling
- Refund-aware order cancellation and stock restoration after refund confirmation

## Tech Stack

**Frontend:** React, Vite, Tailwind CSS, Axios  
**Backend:** Node.js, Express  
**Database:** MongoDB with Mongoose  
**Authentication:** JWT with HTTP-only cookies  
**Image Storage:** Cloudinary  
**Payments:** Razorpay

## Project Structure

```text
E-Commerce/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   └── .env                 # Local secrets; do not commit
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── App.jsx
│       └── api.js
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js and npm
- A MongoDB database (local or MongoDB Atlas)
- Cloudinary account for product images
- Razorpay account for payment testing

## Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/devanraj1905/E--commerce.git
cd E--commerce
```

### 2. Install and configure the backend

```bash
cd backend
npm install
```

Create `backend/.env` with the environment variables your backend uses. Example placeholders:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET_KEY=replace_with_a_long_random_secret
JWT_EXPIRE=1d
CLOUDINARY_URL=your_cloudinary_connection_url
RAZORPAY_KEY_ID=your_razorpay_test_key_id
RAZORPAY_KEY_SECRET=your_razorpay_test_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

Use the exact environment-variable names expected by the configuration files in this repository. Do not commit real credentials. Never paste secrets into issues, screenshots, or public messages.

Start the backend:

```bash
npm run dev
```

The backend currently listens on port `8000`.

### 3. Install and run the frontend

Open a second terminal from the project root:

```bash
cd frontend
npm install
npm run dev
```

Vite normally serves the frontend at `http://localhost:5173`.

The current frontend API client is configured for the local backend at `http://localhost:8000/api`. Update this configuration for a deployed backend.

## Razorpay Webhooks (Local Testing)

For local webhook testing, expose port `8000` through a secure development tunnel and configure the Razorpay webhook URL as:

```text
https://YOUR_CURRENT_TUNNEL_HOST/api/webhooks/razorpay
```

Enable the events used by this application:

- `payment.captured`
- `refund.created`
- `refund.processed`
- `refund.failed`

The webhook secret configured in Razorpay must match `RAZORPAY_WEBHOOK_SECRET` in `backend/.env`. If the tunnel URL changes, update the webhook URL in Razorpay. Keep Razorpay in Test Mode while testing.

## Security Notes

- Keep all `.env` files and credentials out of Git.
- Use strong, unique secrets and rotate any credentials that may have been exposed.
- Configure CORS for only the frontend origins you trust.
- Use HTTPS and deployment-specific environment variables in production.
- Test duplicate webhook delivery and failed-refund handling before enabling live payments.
- Do not use test credentials for live transactions.

## Current Scope

This README describes local development and testing. Before production deployment, review environment configuration, HTTPS/CORS settings, error handling, webhook retries and idempotency, refund recovery, and deployment-specific URLs.

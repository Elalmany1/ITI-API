# ITI-API

Backend API for the VORA e-commerce platform. Built with Node.js and deployed on Vercel.

## Features

- RESTful API endpoints for products, categories, orders, and inventory
- Support for Neon PostgreSQL database (with local JSON fallback)
- CORS support for storefront and admin frontends
- Order management and inventory tracking
- Store settings configuration

## Quick Start (Local Development)

```bash
npm install
node server.js
```

API will be available at `http://localhost:3000`

## Environment Variables

Create a `.env` file:

```
# Neon PostgreSQL Connection (optional - falls back to JSON if not set)
DATABASE_URL=postgresql://user:password@ep-cool-example.us-east-1.neon.tech/neondb

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174

NODE_ENV=development
```

## Deployment on Vercel

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel project settings
3. Vercel automatically deploys on push to `master`

**Set these environment variables in Vercel:**
- `DATABASE_URL` - Neon PostgreSQL connection string
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)

## API Endpoints

### Products

- `GET /products` - List products with filtering
  - Query params: `search`, `category`, `brand`, `minPrice`, `maxPrice`, `stock`, `sort`, `page`, `limit`, `admin`
- `GET /products/:id` - Get product by ID or slug
- `POST /products` - Create product (admin)
- `PUT /products/:id` - Update product (admin)
- `DELETE /products/:id` - Archive product (admin)

### Categories

- `GET /categories` - List categories
  - Query param: `admin=1` for admin view (includes inactive)
- `GET /categories/:id` - Get category by ID
- `POST /categories` - Create category (admin)
- `PUT /categories/:id` - Update category (admin)
- `DELETE /categories/:id` - Delete category (admin)

### Orders

- `GET /orders` - List orders
  - Query param: `status` to filter by status
- `POST /orders` - Create new order
- `PATCH /orders/:id` - Update order status

### Inventory

- `GET /inventory` - Get inventory overview
  - Returns: products with stock status, summary statistics
- `PATCH /inventory/:id` - Adjust product stock
  - Body: `{delta: number}`

### Dashboard

- `GET /dashboard` - Get dashboard metrics (admin)
  - Returns: revenue, orders count, customers, conversion rate, low stock items, recent orders

### Settings

- `GET /settings` - Get store settings
- `PUT /settings` - Update store settings

### Health Check

- `GET /health` - API health status

## Database

### Using Neon PostgreSQL

1. Create free account at https://neon.tech
2. Create a new project and database
3. Copy the connection string to `DATABASE_URL` environment variable
4. The API will automatically use PostgreSQL when `DATABASE_URL` is set

### Local JSON Storage

If `DATABASE_URL` is not set, the API falls back to local JSON file storage (`data/db.json`).

## Data Structure

The database stores:

```javascript
{
  categories: [
    {
      id: "cat-id",
      name: string,
      slug: string,
      description: string,
      image: string,
      sortOrder: number,
      active: boolean
    }
  ],
  products: [
    {
      id: "prod-id",
      name: string,
      slug: string,
      sku: string,
      brand: string,
      categoryId: string,
      description: string,
      price: number,
      compareAtPrice: number,
      stock: number,
      lowStockThreshold: number,
      status: "draft|published|archived",
      images: array,
      attributes: object,
      createdAt: ISO8601,
      updatedAt: ISO8601
    }
  ],
  orders: [
    {
      id: "ord-id",
      number: string,
      customer: object,
      items: array,
      subtotal: number,
      shipping: number,
      tax: number,
      total: number,
      status: "pending|processing|shipped|delivered",
      paymentStatus: "pending|paid|failed",
      createdAt: ISO8601,
      updatedAt: ISO8601
    }
  ],
  settings: {
    storeName: string,
    supportEmail: string,
    currency: string,
    taxRate: number
  }
}
```

## Related Projects

- [ITI-Storefront](https://github.com/Elalmany1/ITI-Storefront) - Customer-facing e-commerce store
- [ITI-Admin](https://github.com/Elalmany1/ITI-Admin) - Admin dashboard

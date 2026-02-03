# 🧁 Snecc Bar - NECC Snack Bar Management System

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-2.76-green?style=for-the-badge&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38bdf8?style=for-the-badge&logo=tailwind-css)

**A modern, full-stack snack bar management system for NECC (Núcleo de Estudantes de Ciências da Computação) at University of Minho**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Project Structure](#-project-structure)

</div>

---

## 📖 About

Snecc Bar is a comprehensive web application designed to manage the NECC Snack Bar operations. It provides a seamless experience for students to browse and purchase products, while offering administrators powerful tools to manage inventory, users, transactions, and financial operations.

The system supports NECC's student activities by offering affordable snacks, drinks, and merchandise to students while maintaining a complete audit trail of all operations.

---

## ✨ Features

### 🛒 **Customer-Facing Features**

#### Product Catalog
- **Dynamic Product Display**: Real-time product catalog with images, prices, and stock levels
- **Member Pricing**: Automatic price adjustment based on membership status
- **Stock Visibility**: Real-time stock indicators to prevent out-of-stock purchases
- **Responsive Design**: Fully optimized for mobile and desktop devices

#### Shopping Experience
- **Shopping Cart**: Add multiple products with quantity selection
- **Dual Payment Methods**: 
  - Balance-based payments (for registered users)
  - Cash payments (for walk-in customers)
- **Purchase Animations**: Visual feedback when adding products to cart
- **Order History**: Complete purchase history with details and timestamps

#### User Management
- **User Registration**: Simple registration system for new users
- **Authentication**: Secure login with Supabase Auth
- **Balance Tracking**: Real-time balance display and transaction history
- **Deposit History**: Track all balance deposits and methods

---

### 👨‍💼 **Admin Dashboard**

#### User Management
- **User CRUD Operations**: Create, read, update, and manage user accounts
- **User Details View**: Comprehensive user information including:
  - Purchase history
  - Deposit history
  - Balance changes
  - Membership status
- **Balance Management**: Add or remove user balance with multiple methods:
  - Cash deposits
  - MB Way transfers
  - Manual adjustments
- **Membership Toggle**: Enable/disable member pricing per user
- **Pagination**: Efficient user list with customizable items per page (5, 10, 15, 30)
- **Search Functionality**: Quick user search by name or email

#### Transaction Management
- **Unified Transaction View**: All transaction types in one place:
  - **Orders**: Customer purchases with item details
  - **Deposits**: Balance additions with payment method tracking
  - **Cash Adjustments**: Available cash modifications with admin tracking
  - **Theft/Loss Records**: Inventory loss tracking with admin attribution
- **Advanced Filtering**:
  - Filter by transaction type
  - Filter by user
  - Filter by product (for orders and thefts)
- **Transaction Details**: 
  - Previous value, new value, and difference columns
  - Admin attribution for cash adjustments and thefts
  - Timestamp and payment method information
- **Transaction Deletion**: Remove transactions with automatic reversals:
  - Balance restoration for deposits
  - Stock restoration for orders
  - Stock restoration for thefts
- **Pagination**: Efficient transaction list with customizable items per page
- **Transaction Summary**: Total revenue, deposits, cash adjustments, and thefts

#### Inventory Management
- **Product CRUD**: Complete product lifecycle management
- **Stock Management**: 
  - Add stock manually
  - Edit product details (name, prices, stock, image)
  - Track stock changes with automatic logging
- **Theft/Loss Tracking**: 
  - Mark stock reductions as "stolen/lost"
  - Automatic admin attribution
  - Complete audit trail
- **Inactive Products**: Soft delete system to preserve order history
- **Product Restoration**: Restore previously deleted products

#### Financial Management
- **Available Cash Tracking**: Monitor physical cash on hand
- **Cash Adjustment Logs**: Complete history of cash modifications with:
  - Admin attribution
  - Reason tracking
  - Previous/new value tracking
- **Deposit Statistics**: Total deposits tracking
- **Profit Calculation**: Real profit calculation (revenue - purchase costs)
- **Financial Dashboard**: Overview cards with key metrics

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 16**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS 4.1**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **Lucide React**: Beautiful icon library

### Backend & Database
- **Supabase**: 
  - PostgreSQL database
  - Row Level Security (RLS) policies
  - Authentication system
  - Real-time capabilities
- **Database Features**:
  - Triggers for automatic stock updates
  - Foreign key constraints
  - Audit logging tables

### Deployment
- **Vercel**: Hosting and deployment platform
- **Custom Domain**: Configured with CNAME

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account and project
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd snecc-bar
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up the database**
   
   Run the SQL scripts in your Supabase SQL Editor:
   - Create necessary tables (users, products, orders, etc.)
   - Set up RLS policies
   - Create triggers for stock management
   - Add admin_id columns for audit trails

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
snecc-bar/
├── app/
│   ├── admin/              # Admin dashboard
│   │   └── page.tsx        # Main admin interface
│   ├── api/                # API routes
│   ├── config/             # Configuration files
│   ├── login/              # Login page
│   ├── register/           # Registration page
│   ├── page.tsx            # Main vending machine interface
│   ├── layout.tsx          # Root layout
│   └── globals.css          # Global styles
├── components/
│   ├── ui/                 # Reusable UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── tabs.tsx
│   │   └── alert-dialog.tsx
│   └── theme-provider.tsx  # Theme management
├── lib/
│   ├── auth.ts             # Authentication & database functions
│   └── utils.ts            # Utility functions
├── public/                 # Static assets
│   └── [product-images]    # Product images
├── supabase/               # Supabase configuration
└── package.json            # Dependencies
```

---

## 🔐 Security Features

- **Row Level Security (RLS)**: Database-level access control
- **Admin-only Routes**: Protected admin dashboard
- **Authentication**: Secure user authentication via Supabase
- **Audit Trails**: Complete logging of admin actions
- **Input Validation**: Client and server-side validation

---

## 📊 Key Functionalities

### Transaction Types

1. **Orders**: Customer purchases
   - Tracks items, quantities, and payment method
   - Automatic stock deduction
   - Balance deduction for balance payments
   - Cash tracking for cash payments

2. **Deposits**: Balance additions
   - Multiple payment methods (cash, MB Way, adjustment)
   - Automatic balance updates
   - Complete transaction history

3. **Cash Adjustments**: Available cash modifications
   - Admin attribution
   - Reason tracking
   - Complete audit trail

4. **Theft/Loss Records**: Inventory loss tracking
   - Admin attribution
   - Product and quantity tracking
   - Automatic stock deduction
   - Financial impact calculation

### Stock Management

- **Automatic Updates**: Database triggers handle stock changes
- **Movement Types**:
  - `sale`: Customer purchases
  - `add_stock`: Manual stock additions
  - `correction`: Stock corrections
  - `theft`: Stolen/lost items
- **Real-time Sync**: Stock levels update immediately

---

## 🎨 UI/UX Features

- **Dark Theme**: Modern dark interface
- **Responsive Design**: Mobile-first approach
- **Loading States**: Visual feedback during operations
- **Error Handling**: User-friendly error messages
- **Confirmation Dialogs**: Prevent accidental actions
- **Pagination**: Efficient data display
- **Search & Filters**: Quick data access
- **Animations**: Smooth transitions and feedback

---

## 📝 Database Schema

### Main Tables

- **users**: User accounts with balance and membership status
- **products**: Product catalog with pricing and stock
- **orders**: Customer orders with payment information
- **order_items**: Individual items in orders
- **deposits**: Balance deposits with payment methods
- **inventory_movements**: Stock change tracking
- **available_cash_logs**: Cash adjustment history

### Relationships

- Users → Orders (one-to-many)
- Orders → Order Items (one-to-many)
- Order Items → Products (many-to-one)
- Inventory Movements → Products (many-to-one)
- Inventory Movements → Users (admin attribution)

---

## 🚧 Development

### Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

### Code Style

- TypeScript strict mode enabled
- ESLint configuration
- Consistent component structure
- Utility functions for reusability

---

## 👥 Contributing

This is an internal project for NECC. For contributions, please contact the project maintainers.

---

## 📞 Support

For issues or questions, please contact the NECC development team.

---

<div align="center">

**Built with 💙 by NECC - Universidade do Minho**

</div>

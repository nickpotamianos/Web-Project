# Web Project 2023-2024

This repository contains the implementation of a **web-based system** designed for managing resources, requests, and offers in a rescue operation environment. Developed as part of the **Programming & Systems on the Web** course for the academic year 2023-2024, this project integrates database management, server-side operations, and interactive client-side functionalities.

## Table of Contents
- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Database Management](#database-management)
- [Server-Side Implementation](#server-side-implementation)
- [Features](#features)
  - [Admin Panel](#admin-panel)
  - [Rescuer Panel](#rescuer-panel)
  - [Citizen Panel](#citizen-panel)
  - [Map View](#map-view)
  - [Warehouse Management](#warehouse-management)
- [Installation](#installation)
- [Usage](#usage)
- [Contributors](#contributors)

## Overview

This project is a full-stack web application that simulates an environment for managing rescue operations. The system allows **administrators** to manage items, categories, and rescue tasks, **rescuers** to accept and complete tasks, and **citizens** to make requests or offer resources. The system ensures data integrity and smooth operations through its **database**, **server**, and **client-side** interactions.

## Technology Stack

The project is built using the following technologies:

- **Backend**: Node.js, Express.js, MySQL
- **Frontend**: HTML, CSS, JavaScript, Leaflet (for map integration)
- **Database**: MySQL (using the `mysql2` library)
- **Version Control**: Git

## Database Management

The database is managed using MySQL, and all interactions with the database are handled through `db.js`. This file is responsible for establishing the connection to the database, which is hosted remotely to allow team members to collaborate without needing local copies.

### `db.js` Overview:
- Uses `mysql2` library for MySQL integration.
- Connection parameters (e.g., `host`, `user`, `password`, `database`) are configured to connect to the remote database.
- Errors are handled gracefully, ensuring the application can display relevant error messages.

Example connection snippet:

```javascript
const mysql = require('mysql2');
const connection = mysql.createConnection({
    host: '25.36.130.149',
    user: 'root',
    password: 'webproject2024@',
    database: 'drcp'
});
```

## Server-Side Implementation

The server-side of the application is built using **Node.js** and **Express.js**. The server manages user sessions, handles routing, and provides the logic for all backend operations, including authentication and data processing.

### `server.js` Overview:

- Manages sessions using `express-session` and stores them in the MySQL database for persistence.
- Handles all API routes, including user login, logout, and resource management.
- Implements middleware to ensure only authenticated users can access protected routes.

#### Example session setup:

```javascript
const sessionStore = new MySQLStore({}, connection);
app.use(session({
    key: 'session_cookie_name',
    secret: 'session_cookie_secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 } // 1 hour
}));
```
## Features

### Admin Panel

Administrators have the ability to manage the system via the admin dashboard. Key features include:

- **Login and Logout**: Admins can log in with their credentials. Unauthorized users are redirected to the login page.
- **Manage Items and Categories**: Admins can add, update, or delete categories and items. They can also upload data in bulk using a `.json` file.
- **View and Manage Rescue Tasks**: Admins can view all active and completed rescue tasks and assign tasks to rescuers.
- **Map View**: Admins can view the locations of all vehicles, offers, and requests on a map, along with the status of each (see more in [Map View](#map-view)).
- **Warehouse Management**: Admins can manage the inventory of items and view the status of warehouse resources (see more in [Warehouse Management](#warehouse-management)).

### Rescuer Panel

Rescuers can log in and access their dashboard, which allows them to:

- **View Assigned Tasks**: Rescuers can see tasks assigned to them, including requests and offers.
- **Complete Tasks**: Rescuers can mark tasks as complete, which updates the system in real time.
- **Map Integration**: Rescuers can view their location and assigned tasks on the map, with a visual connection between their location and the tasks (see more in [Map View](#map-view)).

### Citizen Panel

Citizens can register and log in to submit their requests or offers. Features include:

- **Create Request**: Citizens can request items from the warehouse, specifying the type and quantity of items needed.
- **Create Offer**: Citizens can offer items to the warehouse for distribution to others.
- **View Tasks**: Citizens can view the status of their requests or offers.

### Map View

The map view, implemented using the **Leaflet** library, is available for both **Admins** and **Rescuers**. It provides real-time tracking of vehicles, requests, and offers. Key features include:

- **Markers**: Displays different markers for vehicles, offers, and requests, color-coded based on status (e.g., pending, completed).
- **Popups**: Clicking on a marker reveals detailed information about the entity, such as vehicle status or request details.
- **Task Lines**: Draws lines between rescuers and their assigned tasks to show real-time task assignments.

### Warehouse Management

The **Warehouse Management** feature is exclusively available for **Admins**. Key features include:

- **Add and Update Items**: Admins can manage the inventory by adding or updating items in the warehouse.
- **View Inventory**: Admins can view the current inventory of items in the warehouse and in vehicles.
- **Category Filters**: Items can be filtered by category to make it easier to find specific items.

## Installation

To install and run the project locally:

1. **Clone the repository**:

    ```bash
    git clone https://github.com/nickpotamianos/Web_Project_2024.git
    cd Web_Project_2024
    ```

2. **Install dependencies**:

    ```bash
    npm install
    ```

3. **Set up MySQL database**:
    - Ensure MySQL is installed and running.
    - Import the provided database schema.
    - Update the `db.js` file with your database connection settings.

4. **Run the server**:

    ```bash
    node server.js
    ```

The application will run on `localhost:3000` by default.

## Usage

- **Admin**: Access the admin panel via `/admin_dashboard.html`. You will be prompted to log in with an admin account.
- **Rescuer**: Access the rescuer dashboard via `/rescuer_dashboard.html`.
- **Citizen**: Access the citizen dashboard via `/citizen_dashboard.html`.

## Contributors

- **Andreas Katsaros** (1084522)
- **Angelos Nikolaos Potamianos** (1084537)
- **Grigoris Tzortzakis** (1084538)

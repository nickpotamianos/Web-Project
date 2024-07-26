-- Users Table
CREATE TABLE Users (
    UserID INT AUTO_INCREMENT PRIMARY KEY,
    Username VARCHAR(255) NOT NULL,
    Password VARCHAR(255) NOT NULL,
    Role ENUM('Admin', 'Rescuer', 'Citizen') NOT NULL,
    Name VARCHAR(255),
    PhoneNumber VARCHAR(20),
    Location POINT NOT NULL
);

-- Categories Table
CREATE TABLE Categories (
    CategoryID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Description TEXT
);

-- Items Table
CREATE TABLE Items (
    ItemID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    CategoryID INT,
    Description TEXT,
    FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID) ON DELETE SET NULL
);

-- Requests Table
CREATE TABLE Requests (
    RequestID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT,
    ItemID INT,
    Quantity INT NOT NULL,
    Status ENUM('Pending', 'Completed', 'Cancelled') NOT NULL,
    RequestDate DATETIME NOT NULL,
    ServeDate DATETIME,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE SET NULL,
    FOREIGN KEY (ItemID) REFERENCES Items(ItemID) ON DELETE SET NULL
);

-- Offers Table
CREATE TABLE Offers (
    OfferID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT,
    ItemID INT,
    Quantity INT NOT NULL,
    Status ENUM('Pending', 'Completed', 'Cancelled') NOT NULL,
    OfferDate DATETIME NOT NULL,
    PickupDate DATETIME,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE SET NULL,
    FOREIGN KEY (ItemID) REFERENCES Items(ItemID) ON DELETE SET NULL
);

-- Vehicles Table
CREATE TABLE Vehicles (
    VehicleID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT,
    LoadCapacity INT NOT NULL,
    Status ENUM('Available', 'OnMission') NOT NULL,
    Location POINT NOT NULL,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE SET NULL
);

-- Announcements Table
CREATE TABLE Announcements (
    AnnouncementID INT AUTO_INCREMENT PRIMARY KEY,
    AdminID INT,
    Content TEXT NOT NULL,
    PublishDate DATETIME NOT NULL,
    FOREIGN KEY (AdminID) REFERENCES Users(UserID) ON DELETE SET NULL
);

-- Tasks Table
CREATE TABLE Tasks (
    TaskID INT AUTO_INCREMENT PRIMARY KEY,
    VehicleID INT,
    RequestID INT,
    OfferID INT,
    Status ENUM('Pending', 'Completed', 'Cancelled') NOT NULL,
    AssignDate DATETIME NOT NULL,
    CompleteDate DATETIME,
    FOREIGN KEY (VehicleID) REFERENCES Vehicles(VehicleID) ON DELETE SET NULL,
    FOREIGN KEY (RequestID) REFERENCES Requests(RequestID) ON DELETE SET NULL,
    FOREIGN KEY (OfferID) REFERENCES Offers(OfferID) ON DELETE SET NULL
);

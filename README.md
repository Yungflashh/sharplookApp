
# Sharplook App

Sharplook is a client-to-vendor booking platform designed to connect clients with trusted service providers. The platform makes it simple for users to discover, book, and manage appointments with vendors across various service categories. It is built with React Native using Expo, offering a fast, responsive, and user-friendly mobile experience.

---

## Overview

The Sharplook App serves as a bridge between clients and vendors. Clients can search for vendors, view their profiles, check availability, and make bookings directly through the app. Vendors, on the other hand, can manage their bookings, respond to client requests, and showcase their services and portfolios.

The goal of Sharplook is to make professional services easily accessible while providing vendors with a modern digital platform to reach and serve their clients more efficiently.

---

## How to Run the App

To start the development server, simply run the following command in your terminal:

npx expo start

This will launch the Expo development environment, allowing you to preview the app on your mobile device or simulator.

---

## Folder Structure

The Sharplook project follows a well-organized folder structure for scalability and clarity. Each folder has a specific purpose to ensure clean, maintainable, and easily understandable code.

* **src/**: Contains all the main source code for the application.

  * **api/**: Handles all API-related logic, including making requests to the server and managing responses.
  * **components/**: Includes reusable UI components that can be used across multiple screens.
  * **constants/**: Stores constant values such as color palettes, font styles, and configuration settings used throughout the app.
  * **hooks/**: Contains custom React hooks that encapsulate shared logic and functionality.
  * **navigation/**: Holds all the navigation setup, including stack navigators, tab navigators, and route configurations.
  * **screens/**: Contains all the screen files organized by feature or user role.

    * **auth/**: Screens related to user authentication, such as login, registration, and password recovery.
    * **client/**: Screens and functionalities available to clients for browsing and booking vendors.
    * **vendor/**: Screens and functionalities for vendors to manage their profiles, bookings, and services.
  * **store/**: Manages the global application state using tools such as Redux, Zustand, or Context API.
  * **types/**: Stores TypeScript type definitions and interfaces used across the application.
  * **utils/**: Includes utility functions and helpers that perform common or repetitive tasks.

* **assets/**: Contains all static assets such as images, fonts, icons, and other media files.

This structure ensures a clear separation of concerns, making it easier for developers to locate and update parts of the project without confusion.

---

## Technology Stack

The Sharplook App is built using modern and reliable technologies to ensure high performance and maintainability.

* Framework: React Native (Expo)
* Language: TypeScript
* Navigation: React Navigation
* State Management: Redux, Zustand, or Context API
* API Handling: Axios or Fetch API
* Styling: Styled Components, Tailwind, or React Native StyleSheet

---

## Development Guidelines

1. Always use reusable components where possible to maintain consistency across screens.
2. Keep API logic separate from UI components by placing all network requests in the **api** folder.
3. Follow a modular approach by organizing code into well-defined folders and subfolders.
4. Use TypeScript interfaces to ensure strong typing and prevent runtime errors.
5. Maintain consistent naming conventions and code formatting for readability.

---

## Contribution Guide

Developers working on the Sharplook App should follow these steps when contributing:

1. Fork the repository to your local workspace.
2. Create a new feature branch named after the feature you are working on (for example, `feature/vendor-dashboard`).
3. Implement your feature or fix the bug.
4. Commit your changes with clear, descriptive messages.
5. Push your branch to the remote repository.
6. Submit a pull request for review before merging into the main branch.

---

## Future Enhancements

* Integration of in-app chat between clients and vendors.
* Push notifications for booking updates and reminders.
* Secure in-app payment system for seamless transactions.
* Review and rating system for vendors.
* Advanced search and filtering options for clients.

---



















# Sharplook App

A client-to-vendor booking platform.

## How to run the app

```bash
npx expo start
```

## Folder Structure

Here is an overview of the project's folder structure:

-   **`src/`**: This directory contains all the source code for the application.
    -   **`api/`**: For API-related logic, such as fetching data from a server.
    -   **`components/`**: For shared, reusable React components used across different screens.
    -   **`constants/`**: For constant values used throughout the app, such as colors, fonts, or configuration variables.
    -   **`hooks/`**: For custom React hooks.
    -   **`navigation/`**: Contains all navigation-related code, including navigators, stacks, and tab bars.
    -   **`screens/`**: Holds all the screens of the application, organized by feature or module.
        -   **`auth/`**: Screens for user authentication (e.g., Login, Register).
        -   **`client/`**: Screens for the client-side of the app.
        -   **`vendor/`**: Screens for the vendor-side of the app.
    -   **`store/`**: For state management logic (e.g., Redux, Zustand).
    -   **`types/`**: Contains TypeScript type definitions and interfaces.
    -   **`utils/`**: For utility functions that can be used anywhere in the app.
-   **`assets/`**: Contains all static assets like images, fonts, and icons.








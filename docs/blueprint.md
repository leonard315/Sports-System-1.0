# **App Name**: ArenaLeader

## Core Features:

- Admin Authentication: Secure admin login and logout functionality using Firebase Email/Password Authentication.
- Team Management (CRUD): Admins can add, edit, and delete team profiles, including name and optional logo, with data stored in the 'teams' Firestore collection.
- Match Data Entry: Interface for recording match results (Team A, Team B, scores, date). The system will automatically compute and update match outcomes (winner/loser/draw) upon entry. Data is stored in the 'matches' Firestore collection.
- Automated Standings Tabulation: Real-time computation and display of tournament standings, including Games Played (GP), Wins (W), Losses (L), Draws (D), Points (W=3, D=1, L=0), Score+ (total points scored), Score- (total points allowed), and Score Difference. This data is derived from the 'matches' collection.
- Dynamic Rankings Display: Presents team rankings in a sortable table, ordered primarily by Points, then by Score Difference, and finally by Wins.
- Dashboard Overview: A summary dashboard showing total teams, total matches played, and the current top 3 teams.
- Real-time UI with Validation: User interface updates in real-time using Firestore listeners for changes. Includes form validation (e.g., no duplicate teams, a team cannot play itself) and confirmation dialogs before deletion operations.

## Style Guidelines:

- The primary color is a vibrant blue (#2489E6), chosen to evoke professionalism and energy, typical of sports-related platforms.
- A subtle, very light gray-blue (#F6F7F9) is used as the background color, ensuring readability and a clean aesthetic across the dashboard.
- An energetic aqua (#26D9D6) serves as the accent color, providing contrast for interactive elements and highlights within the interface.
- The sans-serif font 'Inter' is recommended for both headlines and body text due to its modern, neutral, and highly readable characteristics, ideal for data-intensive applications.
- Utilize clear, functional icons for navigation, CRUD operations (add, edit, delete), and summary statistics, maintaining a professional and intuitive user experience. Team logos, where provided, should be clearly displayed.
- A clean, responsive dashboard layout employing Tailwind CSS to ensure optimal display on both mobile and desktop devices. Tables for standings will feature clear borders and highlighting for top-ranked teams to enhance data readability.
- Subtle animations should provide immediate feedback to user actions, such as form submissions, data updates, and toast notifications for success or error messages, contributing to a smooth user experience.
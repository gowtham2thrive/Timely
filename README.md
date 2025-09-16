# Intelligent Timetable Generator

A powerful, feature-rich web application for automatically generating complex academic timetables. Built with vanilla HTML, CSS, and JavaScript, this tool is designed to be intuitive, robust, and highly customizable to handle real-world scheduling constraints.



## ✨ Key Features

This application is packed with advanced features to make timetable creation seamless and efficient:

### Core Configuration
-   **Dynamic Time Slots**: Easily configure the number of periods per day, the academic start time, and the duration of each period using interactive sliders.
-   **Lunch Breaks**: Automatically insert a lunch break after any specified period.

### Data Management
-   **Faculty & Subjects**: Add an unlimited number of faculty members and assign them multiple subjects. Each subject can be categorized as a **Subject**, **Lab**, or **Activity**.
-   **Sections**: Create and manage multiple class sections (e.g., CSE-A, ECE-B).

### Intelligent Generation Algorithm
-   **Constraint-Based Logic**: The core of the application is a sophisticated algorithm that schedules classes while respecting a multitude of constraints.
-   **Faculty Availability**: The generator ensures that no faculty member is booked for two different classes at the same time.
-   **Split Labs**: Automatically schedules two different labs for the same section at the same time, perfect for handling batches.
-   **Advanced Scheduling Rules**:
    -   Prevents scheduling more than **one lab** per section per day.
    -   Limits subjects to a maximum of **two periods** per section per day.
    -   Limits activities to a maximum of **two** per section per day.
    -   Avoids scheduling back-to-back periods of the same subject.
-   **Period Preferences**: Set preferred days and periods for specific classes, which the algorithm will prioritize.
-   **Unassigned Course Reporting**: If a course cannot be scheduled due to conflicts, it is clearly highlighted in a dedicated "Unassigned Courses" section for manual review.

### Modern User Interface & Experience
-   **Responsive Design**: A clean, two-column layout that adapts perfectly to both desktop and mobile screens.
-   **Scrolling Previews**: The timetable preview is fully scrollable, both horizontally and vertically, preventing UI stretching and ensuring a smooth experience on any device.
-   **Light & Dark Modes**: Switch between light and dark themes to suit your preference.
-   **Interactive Management**: All data is managed through a polished card-based interface with clear inputs and actions.
-   **Keyboard Shortcuts**: Press **Enter** in input fields to quickly add faculty, sections, and subjects without needing to click buttons.
-   **Pre-generation Preview**: See an empty timetable grid for each section as soon as it's created, giving you a clear canvas to work with.

### Persistence & Export
-   **Local Storage**: Your entire configuration—faculty, sections, and assignments—is automatically saved in your browser's local storage. You can close the tab and your data will be there when you return.
-   **PDF Export**: Export any generated timetable as a clean, professional-looking **PDF document**, which includes a formatted table of all faculty and their assigned subjects for that section.

## 🚀 How to Use

No complex setup is required.

1.  Clone the repository or download the ZIP file.
2.  Ensure all three files (`index.html`, `style.css`, and `script.js`) are in the same folder.
3.  Open the `index.html` file in your favorite web browser.

That's it! The application is ready to use.

## 🛠️ Technologies Used

-   **HTML5**
-   **CSS3** (Variables, Flexbox, Grid)
-   **Vanilla JavaScript (ES6+)**
-   **[pdf-lib](https://pdf-lib.js.org/)**: For client-side PDF document creation.
-   **[Google Fonts](https://fonts.google.com/) & [Material Symbols](https://fonts.google.com/icons)**: For typography and icons.

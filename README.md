# Timely - Intelligent Timetable Generator

**Timely** is a powerful, client-side web application designed to automate the complex and time-consuming task of creating academic timetables. Built with pure JavaScript, it uses a sophisticated constraint-based algorithm to generate optimized schedules for multiple sections, respecting a wide array of user-defined rules and preferences.

Website Link:- https://gowtham2thrive.github.io/Timely/

The entire generation process runs in the user's browser, ensuring data privacy and fast performance without any server-side dependency.

-----

## ✨ Key Features

Timely is packed with features to handle the diverse scheduling needs of educational institutions.

### Core Engine & Configuration

  * **Constraint-Based Algorithm**: The intelligent core automatically resolves conflicts and schedules classes based on a series of weighted rules.
  * **Dynamic Timetable Structure**: Easily configure the number of **periods per day**, the **start time**, **period duration**, and the placement of a **lunch break**.
  * **Web Worker Powered**: The generation algorithm runs in a background thread, ensuring the user interface remains **100% responsive** and never freezes, even with complex schedules.
  * **Persistent State**: Your entire configuration—faculty, sections, and assignments—is automatically **saved to your browser's local storage**, so you can pick up where you left off at any time.

### Faculty & Subject Management

  * **Manage Faculty**: Add, edit, and remove faculty members.
  * **Categorize Subjects**: Assign courses to faculty under three distinct types: **Subject**, **Lab**, or **Activity**.
  * **Set Availability**: Define each faculty member's availability with a granular, period-by-period grid for the entire week. The algorithm will never schedule a faculty member during an unavailable slot.

### Scheduling & Assignments

  * **Section Management**: Create and manage multiple class sections (e.g., CSE-A, ECE-B).
  * **Flexible Course Assignments**:
      * **Subjects/Activities**: Assign a specific number of **hours per week**.
      * **Labs**: Customize labs with both **periods per session** (e.g., a 2-period block) and the number of **sessions per week**.
  * **Scheduling Preferences**: For any assigned course, specify a **preferred day and period**. The algorithm will prioritize these preferences to build the ideal schedule.
  * **Daily Workload Rules**: Set global limits on the maximum number of labs, activities, or occurrences of a single subject that can be scheduled on any given day.

### Output & User Interface

  * **Instant Generation**: Create timetables for all sections with a single click.
  * **Modern UI**: A clean, intuitive interface with both **light and dark modes** to reduce eye strain.
  * **Clear Visualization**: View generated timetables in a clean, tabbed layout. The UI provides clear indicators for unassigned classes and partially filled schedules.
  * **One-Click PDF Export**: Download a professional, print-ready **PDF of any timetable**, complete with a list of assigned faculty and subjects for that section.

-----

## 🛠️ Built With

Timely is built with a focus on performance and accessibility, using modern web technologies without the need for frameworks.

  * **HTML5**
  * **CSS3** (with CSS Variables for theming)
  * **Vanilla JavaScript (ES6+)**
  * **PDF-Lib.js** for PDF generation
  * **Web Workers API** for background processing

-----

## 🚀 Getting Started

You can run this project directly in your browser. No installation or build steps are required.

### How to Run

Because this project uses a Web Worker for its generation algorithm, you must serve the files from a local web server. Opening the `index.html` file directly from your file system (`file://...`) will result in a security error.

1.  Clone the repository:
    ```sh
    git clone https://github.com/your-username/timely-timetable-generator.git
    ```
2.  Navigate to the project directory:
    ```sh
    cd timely-timetable-generator
    ```
3.  Serve the files using a local server. A highly recommended and simple way is with the **Live Server** extension for Visual Studio Code.
      * Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension.
      * Right-click on `index.html` in your VS Code explorer and select "Open with Live Server".

Your browser will open, and the application will be ready to use.

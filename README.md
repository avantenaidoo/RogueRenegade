# Rogue Renegade IDE

Rogue Renegade IDE is a desktop development environment designed to bring essential software development workflows together in one application.

Built with Tauri, React, TypeScript and Rust, it combines code editing, workspace management, source control, terminal access, account management and collaboration features within a unified desktop interface.

## The Problem

Software developers often rely on several separate applications to manage their development workflow. Code editing, file management, terminal commands, source control and collaboration can all require switching between different tools.

This fragmentation can interrupt development workflows and make it harder to manage related tasks in one place.

Rogue Renegade IDE aims to address this by bringing these essential development tools together in a single desktop environment.

## Features

### Development Environment

- Monaco Editor integration for code editing.
- Workspace and folder management.
- File browsing and navigation.
- Support for multiple open editor tabs.
- Image previews for supported image formats.
- Diff editor for comparing file changes.
- Workspace session management and restoration.

### Source Control

- Git repository detection and initialization.
- Current branch information.
- Uncommitted file inspection.
- Staging and commit functionality.
- Commit history and commit graph inspection.
- Commit file and diff inspection.

### Integrated Terminal

- Terminal sessions within the desktop application.
- Terminal input, output and resizing.
- Native terminal process management.

### Account and Device Management

- User registration and login interface.
- Account approval workflows.
- Account switching.
- Device identification.
- Cryptographic device key management and request signing.

### Dashboard and Developer Tools

- Dashboard interface.
- Developer insights and metrics.
- Chart-based data visualisation.
- Application settings and workspace controls.

### Collaboration

Rogue Renegade IDE includes a collaboration interface supported by a separately maintained Node.js and TypeScript server using Socket.IO.

The current server implementation supports:

- Joining collaboration rooms.
- Tracking connected collaborators.
- Broadcasting user presence updates.
- Relaying cursor-position events.
- Relaying file-change events.

The collaboration interface also includes chat, typing indicators and file attachment functionality. These features are still being integrated with the server and should not yet be considered fully operational across multiple users.

## Technology Stack

| Area | Technologies |
|---|---|
| Desktop framework | Tauri 2 |
| Frontend | React 19 |
| Programming languages | TypeScript, Rust |
| Build tooling | Vite 7 |
| Code editor | Monaco Editor |
| State management | Zustand |
| Styling | Tailwind CSS 4 |
| Terminal interface | xterm.js |
| Source control | Git integration |
| Real-time communication | Socket.IO |
| Cryptography | Ed25519 |

## Architecture

Rogue Renegade IDE uses a combination of frontend and native desktop technologies.

**Frontend — React and TypeScript**

The frontend provides the application interface, editor, dashboard, workspace management, account interfaces and collaboration panel.

**Native layer — Rust and Tauri**

The Rust backend handles native desktop functionality through Tauri commands. This includes filesystem operations, terminal process management, Git operations, workspace management, device identity and cryptographic functionality.

**Collaboration service — Node.js and Socket.IO**

Real-time collaboration functionality is supported by a separate server repository. The IDE connects to this service through a Socket.IO client.

The collaboration server is not bundled into the desktop application and must be run separately when developing or testing collaboration features.

## Project Structure

```text
RogueRenegade/
├── public/                  # Static assets and branding
├── src/
│   ├── auth/                # Authentication and account interfaces
│   ├── components/          # Main application components
│   ├── dashboard/           # Dashboard interface
│   ├── lib/                 # Frontend libraries and supporting logic
│   ├── pages/               # Application pages
│   ├── store/               # Zustand application state
│   └── utils/               # Filesystem, Git, workspace and other utilities
├── src-tauri/
│   ├── capabilities/        # Tauri application permissions
│   └── src/                 # Native Rust functionality
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

Install the following before setting up the project:

- Node.js and npm.
- Rust and Cargo.
- Tauri 2 system dependencies for your operating system.

Refer to the [Tauri prerequisites documentation](https://v2.tauri.app/start/prerequisites/) for platform-specific installation instructions.

### Clone the Repository

```bash
git clone https://github.com/avantenaidoo/RogueRenegade.git
cd RogueRenegade
```

### Install Dependencies

```bash
npm install
```

### Run the Desktop Application

```bash
npm run tauri:dev
```

This starts the Tauri application in development mode.

### Build the Application

Build the frontend:

```bash
npm run build
```

Build the desktop application:

```bash
npm run tauri:build
```

## Collaboration Server Setup

The collaboration server is maintained separately:

[Collaboration Server — GitHub Repository](https://github.com/avantenaidoo/collab-server)

### Clone the Server

In a separate terminal:

```bash
git clone https://github.com/avantenaidoo/collab-server.git
cd collab-server
```

### Install Dependencies

```bash
npm install
```

### Start the Server in Development Mode

```bash
npm run dev
```

The server uses port `3001` by default.

The IDE's current Socket.IO client connects to:

```text
http://localhost:3001
```

Run the collaboration server separately before testing the IDE's collaboration connection.

### Build and Run the Server

To compile the TypeScript server:

```bash
npm run build
```

To start the compiled server:

```bash
npm start
```

### Current Server Limitations

The collaboration server currently:

- Stores room membership in memory.
- Does not persist collaboration sessions.
- Does not implement user authentication or room access controls.
- Does not resolve simultaneous file-editing conflicts.
- Does not yet handle the client's chat-message or typing-indicator events.

The server's current CORS configuration allows all origins. Authentication, access restrictions and deployment configuration will need further development before exposing the service publicly.

## Development Scripts

The IDE provides the following npm scripts:

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and build the frontend |
| `npm run preview` | Preview the frontend production build |
| `npm run tauri:dev` | Run the Tauri desktop application in development mode |
| `npm run tauri:build` | Build the Tauri desktop application |

## Project Status

Rogue Renegade IDE is an active development project.

The application brings together desktop development tools, native system functionality, source control and workspace management. Additional development is ongoing, particularly around real-time collaboration, synchronised editing, chat integration and server-side security.

Features and functionality may change as the project evolves.

## Contributing

Feedback, suggestions and issue reports are useful for improving the project.

When proposing changes, consider the existing separation between the React frontend, Rust native backend and external collaboration server.

For significant changes, open an issue to discuss the proposed functionality before submitting a pull request.
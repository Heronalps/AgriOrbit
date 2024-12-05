# AG Advisor Map

An interactive agricultural advice application with map visualization capabilities.

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [Python](https://www.python.org/) (v3.8 or later)
- [Poetry](https://python-poetry.org/) for Python dependency management
- [PNPM](https://pnpm.io/) for JavaScript dependency management

### Initial Setup

1. Clone the repository
2. Install dependencies:

```bash
# Install PNPM globally if you don't have it
npm install -g pnpm

# Install all dependencies
pnpm run setup
```

3. Create a `.env` file in the `config` directory with the following:

```
OPENAI_API_KEY=your_openai_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

### Development

To run the entire application (frontend + backend) in development mode:

```bash
pnpm run dev
```

This will start both the backend FastAPI server and the frontend Vite development server in parallel.

To run just the backend:

```bash
pnpm run backend
```

To run just the frontend:

```bash
pnpm run frontend
```

### Building for Production

To build the frontend for production:

```bash
pnpm run build
```

## Project Structure

- `frontend/` - Vue.js frontend application
- `backend/` - Python FastAPI backend server
- `config/` - Configuration files including environment variables

## API Reference

The backend API is available at http://localhost:8157 when running in development mode.

### Endpoints

- `/chat` - POST request to send messages to the chat API

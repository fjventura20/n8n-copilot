# Architecture Recommendation: Secure Local Service Communication

**Author:** Architect Agent
**Date:** 2025-06-10
**Status:** Proposed

## 1. Executive Summary

This document outlines the architectural changes required to resolve the recurring "SSL certificate issue" encountered during local development. The root cause is identified as a **Mixed Content Violation**, where the secure browser extension attempts to communicate with an insecure (`http`) local backend service.

The proposed solution is to introduce a **local reverse proxy with SSL termination**. This will ensure all communication from the extension is performed over a secure channel (`https`), aligning with browser security policies and creating a robust development environment.

## 2. Problem Analysis

The n8n Co-pilot extension, operating in a secure browser context (similar to an `https://` page), is being developed to communicate with a local AI/LLM service running at `http://localhost:11434`.

Modern browsers strictly enforce a **Same-Origin Policy** and block **Mixed Content** requests. A secure context is forbidden from making network requests to an insecure `http` endpoint. This security feature is fundamental and cannot be bypassed programmatically from within the extension. Any attempt to do so results in a network error, which developers may misinterpret as an "SSL issue."

**Current Flaw:** The architecture lacks a secure entry point for the local development server, making direct communication from the extension impossible.

## 3. Proposed Architectural Solution

We will implement a local reverse proxy to act as a secure intermediary between the browser extension and the local backend service.

### 3.1. Architectural Diagram

```
                                  +---------------------------+
                                  |                           |
(Browser Extension)-------------> |   Local Reverse Proxy     |
 (fetch over HTTPS)               |  (e.g., Caddy, Nginx)     |
                                  |                           |
   (e.g., https://localhost:11443)|   Listens on HTTPS        |
                                  |   with a self-signed,     |
                                  |   locally-trusted cert.   |
                                  +-------------+-------------+
                                                |
                                                | (Forwards request over HTTP)
                                                |
                                                v
                                  +-------------+-------------+
                                  |                           |
                                  |   Local LLM Service       |
                                  | (http://localhost:11434)  |
                                  |                           |
                                  +---------------------------+
```

### 3.2. Key Components

1.  **Reverse Proxy Server:**
    *   **Recommendation:** Use **Caddy Server**. It is lightweight, simple to configure, and has built-in support for automatic local HTTPS with self-signed certificates. Nginx or Node.js-based proxies are also viable alternatives.
    *   **Function:** It will listen for incoming `https` traffic on a designated port (e.g., `11443`). It will terminate the SSL (decrypt the traffic) and forward the request to the target `http` service.

2.  **Locally-Trusted SSL Certificate:**
    *   The reverse proxy will use a self-signed SSL certificate.
    *   **Crucial Step:** This certificate **must be added to the developer's operating system's trust store** (e.g., Keychain Access on macOS, Certificate Manager on Windows). This makes the browser trust the certificate, preventing security warnings. Caddy can often handle this process automatically.

3.  **Extension Configuration:**
    *   The extension's configuration (e.g., in the `.env` file or a settings module) must be updated to point to the proxy's secure URL.
    *   **Change:** `LLM_BASE_URL` should be updated from `http://localhost:11434` to `https://localhost:11443` (or the chosen port).

## 4. Implementation Plan & Developer Guidance

The development team should execute the following steps. These should be documented in the project's `README.md` or a dedicated `DEVELOPMENT_SETUP.md` file.

### Step 1: Install Caddy
Install Caddy server on the local development machine.
*   **macOS (Homebrew):** `brew install caddy`
*   **Windows (Scoop/Chocolatey):** `choco install caddy` or `scoop install caddy`

### Step 2: Create a Caddyfile
Create a file named `Caddyfile` in a persistent location (e.g., the project root).

```
# Caddyfile

localhost:11443 {
    # Sets up a reverse proxy to the local LLM service
    reverse_proxy localhost:11434

    # Enables automatic, locally-trusted HTTPS
    tls internal
}
```

### Step 3: Run Caddy
Navigate to the directory containing the `Caddyfile` and run Caddy.

```bash
caddy run
```

Caddy will automatically generate a self-signed certificate and may prompt for a password to install it into the system's trust store.

### Step 4: Update Extension Code
Modify the extension's source code to use the new secure endpoint for all API calls.

**Example (`.env` or config file):**
```
LLM_BASE_URL=https://localhost:11443
```

**Example (JavaScript fetch):**
```javascript
// const baseUrl = process.env.LLM_BASE_URL; // Or however config is loaded
const baseUrl = 'https://localhost:11443';
fetch(`${baseUrl}/api/endpoint`, { ... })
  .then(...)
  .catch(...);
```

## 5. Benefits of this Architecture

*   **Security Compliant:** Eliminates Mixed Content errors by adhering to browser security policies.
*   **Robust & Reliable:** Provides a stable local development environment that mirrors a production-like HTTPS setup.
*   **Scalable:** The proxy can be easily configured to handle multiple local services if the architecture grows.
*   **Developer Efficiency:** Prevents developers from wasting time on unsolvable browser security issues and provides a clear setup path.
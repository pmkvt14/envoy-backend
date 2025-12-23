# Visitor Duration Report – Envoy Integration

This repository contains a custom Envoy integration that tracks how long visitors remain on-site and determines whether they overstayed their allowed duration.

## Overview
- Users configure a maximum allowed visit duration during installation
- Visitor check-in and sign-out events are received via Envoy event hooks
- On sign-out, the backend calculates elapsed time and logs whether the visitor overstayed

This implementation focuses on correctness, clarity, and alignment with Envoy’s integration architecture.

## Architecture
- **Backend**: Node.js + Express
- **Hosting**: Render
- **Envoy Features Used**:
  - Setup validation endpoint
  - Event hooks (visitor sign-in / sign-out)
  - Dynamic content snippet

## Key Endpoints
- `POST /validate`
  - Validates and stores the configured maximum visit duration
- `POST /visitor-sign-in`
  - Stores visitor check-in timestamps
- `POST /visitor-sign-out`
  - Calculates visit duration and determines overstay status
- `GET /envoy/snippets/visitor-duration`
  - Displays visitor duration context within Envoy

## Notes
- State is stored in-memory for demo purposes
- In production, this would be backed by persistent storage
- Overstay evaluation intentionally occurs on sign-out, where complete visit data is available

## Repository
https://github.com/pmkvt14/envoy-backend

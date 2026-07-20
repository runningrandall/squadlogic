#!/bin/bash
# Lambda Web Adapter expects an HTTP server on the configured PORT.
# Next.js standalone output places server.js under frontend/ in monorepo mode.
# The server reads PORT and HOSTNAME from environment variables.
cd "${LAMBDA_TASK_ROOT}/frontend" || cd "$(dirname "$0")/frontend"
exec node server.js

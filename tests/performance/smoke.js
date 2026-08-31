import http from "k6/http"
import { check } from "k6"

http.setResponseCallback(http.expectedStatuses({ min: 200, max: 399 }, 401))

export const options = {
  scenarios: {
    reviewer_edge: {
      executor: "constant-vus",
      vus: 5,
      duration: "10s",
      gracefulStop: "2s",
    },
  },
  thresholds: {
    checks: ["rate>0.99"],
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<750"],
  },
}

const baseUrl = __ENV.BASE_URL || "http://control:3000"

export default function () {
  const login = http.get(`${baseUrl}/login`)
  check(login, { "login is available": (response) => response.status === 200 })

  const openapi = http.get(`${baseUrl}/api/openapi`)
  check(openapi, {
    "OpenAPI is available": (response) => response.status === 200,
    "OpenAPI contract is JSON": (response) => response.headers["Content-Type"]?.includes("application/json"),
  })

  const unsigned = http.post(`${baseUrl}/api/ci/runs`, null, {
    headers: { "Idempotency-Key": `k6-${__VU}-${__ITER}` },
  })
  check(unsigned, { "unsigned CI trigger is rejected": (response) => response.status === 401 })
}

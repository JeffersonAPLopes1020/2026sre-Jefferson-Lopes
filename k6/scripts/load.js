import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '2m', target: 10 },
    { duration: '1m', target: 20 },
    { duration: '3m', target: 20 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://pipeline:8080';

export default function () {
  const res = http.get(`${BASE_URL}/health`);
  check(res, {
    'health status 200': (r) => r.status === 200,
  });
  sleep(Math.random() * 0.5 + 0.5);
}

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '1m', target: 200 },
    { duration: '1m', target: 500 },
    { duration: '2m', target: 500 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000', 'p(99)<5000'],
    http_req_failed: ['rate<0.10'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://pipeline:8080';

export default function () {
  const res = http.get(`${BASE_URL}/health`);
  check(res, {
    'health status 200': (r) => r.status === 200,
  });
  sleep(Math.random() * 0.3 + 0.1);
}

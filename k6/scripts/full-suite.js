import { group } from 'k6';
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    smoke_test: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      exec: 'smoke_test',
      tags: { test_type: 'smoke' },
      startTime: '0s',
    },
    load_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 10 },
        { duration: '30s', target: 0 },
      ],
      exec: 'load_test',
      tags: { test_type: 'load' },
      startTime: '35s',
    },
    stress_peak: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 50 },
        { duration: '30s', target: 100 },
        { duration: '30s', target: 0 },
      ],
      exec: 'stress_test',
      tags: { test_type: 'stress' },
      startTime: '2m30s',
    },
  },
  thresholds: {
    'http_req_duration{test_type:smoke}': ['p(95)<500'],
    'http_req_duration{test_type:load}': ['p(95)<1500'],
    'http_req_duration{test_type:stress}': ['p(95)<3000'],
    http_req_failed: ['rate<0.10'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://pipeline:8080';

export function smoke_test() {
  group('Smoke Test - /health', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
      'health endpoint responde 200': (r) => r.status === 200,
    });
  });
  sleep(1);
}

export function load_test() {
  group('Load Test - /health', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
      'health endpoint responde 200': (r) => r.status === 200,
    });
  });
  sleep(Math.random() * 0.5 + 0.3);
}

export function stress_test() {
  group('Stress Test - /health', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
      'health endpoint responde 200': (r) => r.status === 200,
    });
  });
  sleep(Math.random() * 0.2 + 0.1);
}

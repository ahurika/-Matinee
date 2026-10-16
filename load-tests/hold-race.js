// k6: 500 virtual users try to hold the same 50 seats at the same moment.
// Run: k6 run -e BASE_URL=http://localhost:3000 -e SHOWTIME_ID=<id> load-tests/hold-race.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// 409 SEAT_TAKEN is an expected, correct answer for the losers. Do not count it as a failure.
http.setResponseCallback(http.expectedStatuses(200, 409));

const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const ST = __ENV.SHOWTIME_ID || 'st-dune-sb1-today-1800';
const SCREEN_PREFIX = __ENV.SCREEN_PREFIX || 'screen-sb-1';
const SEATS = [
  ...Array.from({ length: 20 }, (_, i) => `${SCREEN_PREFIX}-A${i + 1}`),
  ...Array.from({ length: 20 }, (_, i) => `${SCREEN_PREFIX}-B${i + 1}`),
  ...Array.from({ length: 10 }, (_, i) => `${SCREEN_PREFIX}-C${i + 1}`),
];

const won = new Counter('holds_won');
const lost = new Counter('holds_lost');
const booked = new Counter('bookings_created');
const holdTime = new Trend('hold_duration', true);

export const options = {
  scenarios: {
    race: { executor: 'per-vu-iterations', vus: 500, iterations: 1, maxDuration: '2m' },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],          // real failures (5xx, network) must be under 1 percent
    hold_duration: ['p(95)<500'],
    holds_won: ['count<=50'],                // never more winners than seats
    bookings_created: ['count<=50'],
  },
};

export default function () {
  const seatIndex = (__VU - 1) % SEATS.length;
  const seat = SEATS[seatIndex];            // deterministic: 10 users per seat

  // Stagger seat groups by 20ms while keeping all 10 competitors for each seat perfectly synchronized
  sleep(seatIndex * 0.02);

  const userId = `user-${__VU}`;
  const headers = { 'Content-Type': 'application/json', 'x-user-id': userId, 'x-request-id': `k6-${__VU}` };
  const res = http.put(`${BASE}/v1/showtimes/${ST}/hold`, JSON.stringify({ seatIds: [seat] }), { headers });
  holdTime.add(res.timings.duration);
  check(res, { 'hold answered 200 or 409': (r) => r.status === 200 || r.status === 409 });
  if (res.status === 200) {
    won.add(1);
    // The winner "pays": the webhook job or book endpoint inserts the booking
    const b = http.post(`${BASE}/v1/test/book`, JSON.stringify({ showtimeId: ST, seatIds: [seat] }), { headers });
    check(b, { 'booking created 200': (r) => r.status === 200 });
    if (b.status === 200) booked.add(1);
  } else {
    lost.add(1);
  }
}

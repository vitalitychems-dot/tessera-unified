import assert from "node:assert/strict";
import test from "node:test";
import {
  forwardedClientIp,
  requestIdentityFromHeaders,
} from "../src/lib/public-abuse.server";

test("trusted proxy chains bind the budget to the nearest untrusted address", () => {
  const headers = new Headers({
    "x-forwarded-for": "198.51.100.44, 35.191.7.8",
  });
  assert.equal(forwardedClientIp(headers), "198.51.100.44");
  assert.equal(requestIdentityFromHeaders(headers), "ip:198.51.100.44");
});

test("a prepended spoofed address cannot replace the trusted client hop", () => {
  const headers = new Headers({
    "x-forwarded-for": "203.0.113.9, 198.51.100.44, 35.191.7.8",
  });
  assert.equal(forwardedClientIp(headers), "198.51.100.44");
});

test("IPv6 interface rotation shares one /64 budget bucket", () => {
  const first = new Headers({
    "x-forwarded-for": "2001:db8:1234:5678::1, 35.191.7.8",
  });
  const rotated = new Headers({
    "x-forwarded-for": "2001:db8:1234:5678:abcd:ef01:2345:6789, 35.191.7.8",
  });
  const otherPrefix = new Headers({
    "x-forwarded-for": "2001:db8:1234:5679::1, 35.191.7.8",
  });
  assert.equal(requestIdentityFromHeaders(first), requestIdentityFromHeaders(rotated));
  assert.notEqual(requestIdentityFromHeaders(first), requestIdentityFromHeaders(otherPrefix));
});

test("IPv4-mapped IPv6 callers share the IPv4 identity", () => {
  const mapped = new Headers({
    "x-forwarded-for": "::ffff:192.0.2.44, 35.191.7.8",
  });
  const native = new Headers({
    "x-forwarded-for": "192.0.2.44, 35.191.7.8",
  });
  assert.equal(requestIdentityFromHeaders(mapped), requestIdentityFromHeaders(native));
});

test("untrusted or missing proxy chains use a stable conservative fallback", () => {
  const untrusted = new Headers({
    "x-forwarded-for": "198.51.100.44",
    cookie: "session=one",
    "user-agent": "one",
  });
  const changed = new Headers({
    "x-forwarded-for": "198.51.100.44",
    cookie: "session=two",
    "user-agent": "two",
  });
  const missing = new Headers({ cookie: "session=three" });
  assert.equal(forwardedClientIp(untrusted), null);
  assert.equal(requestIdentityFromHeaders(untrusted), "untrusted-request");
  assert.equal(requestIdentityFromHeaders(changed), "untrusted-request");
  assert.equal(requestIdentityFromHeaders(missing), "untrusted-request");
});
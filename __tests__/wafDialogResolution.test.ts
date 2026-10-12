import {describe, expect, it} from '@jest/globals';

describe('WAF cookie auto-resolution logic', () => {
  it('detects when an awaited cookie is newly set or updated', () => {
    const cookieName = 'cf_clearance';
    const initialCookies: Record<string, string> = {cf_clearance: 'old_expired_value'};
    const newCookies: Record<string, string> = {cf_clearance: 'new_fresh_value_abc123'};

    const currentVal = newCookies[cookieName];
    const initialVal = initialCookies[cookieName];

    const isUpdated = currentVal && (!initialVal || currentVal !== initialVal);
    expect(Boolean(isUpdated)).toBe(true);
  });

  it('detects when an awaited cookie is initially absent and then received', () => {
    const cookieName = 'cf_clearance';
    const initialCookies: Record<string, string> = {};
    const newCookies: Record<string, string> = {cf_clearance: 'first_clearance_cookie'};

    const currentVal = newCookies[cookieName];
    const initialVal = initialCookies[cookieName];

    const isUpdated = currentVal && (!initialVal || currentVal !== initialVal);
    expect(Boolean(isUpdated)).toBe(true);
  });

  it('does not trigger auto-resolve when the cookie value has not changed', () => {
    const cookieName = 'cf_clearance';
    const initialCookies: Record<string, string> = {cf_clearance: 'same_val'};
    const currentCookies: Record<string, string> = {cf_clearance: 'same_val'};

    const currentVal = currentCookies[cookieName];
    const initialVal = initialCookies[cookieName];

    const isUpdated = currentVal && (!initialVal || currentVal !== initialVal);
    expect(Boolean(isUpdated)).toBe(false);
  });
});

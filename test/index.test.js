const test = require('node:test');
const assert = require('node:assert/strict');

process.env.TOKEN = 'dummy-token';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_KEY = 'dummy-key';

const { createTodayMessage, createTomorrowMessage } = require('../index.js');

test('assignment message helpers are exported', () => {
    assert.equal(typeof createTodayMessage, 'function');
    assert.equal(typeof createTomorrowMessage, 'function');
});

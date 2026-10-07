const test = require('node:test');
const assert = require('node:assert/strict');

process.env.TOKEN = 'dummy-token';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_KEY = 'dummy-key';

const {
    AUTO_SEND_ENABLED,
    ASSIGNEES_PER_SUBJECT,
    POINTS_PER_ASSIGNMENT,
    getSubjects,
    getSubjectsForDate,
    createTodayMessage,
    createTomorrowMessage
} = require('../index.js');

test('assignment message helpers are exported', () => {
    assert.equal(typeof createTodayMessage, 'function');
    assert.equal(typeof createTomorrowMessage, 'function');
});

test('daily 8:30 auto-send is enabled', () => {
    assert.equal(AUTO_SEND_ENABLED, true);
});

test('every subject uses two assignees and awards one point each', () => {
    assert.equal(ASSIGNEES_PER_SUBJECT, 2);
    assert.equal(POINTS_PER_ASSIGNMENT, 1);
});

test('new weekly timetable is configured', () => {
    assert.deepEqual(getSubjects(1), []);
    assert.deepEqual(getSubjects(2), ['VLSI工学']);
    assert.deepEqual(getSubjects(3), ['ソフトウェア工学', '制御工学']);
    assert.deepEqual(getSubjects(4), ['ディジタル信号処理']);
    assert.deepEqual(getSubjects(5), []);
    assert.deepEqual(getSubjects(0), []);
    assert.deepEqual(getSubjects(6), []);
});

test('only control engineering remains on 2026-10-07', () => {
    const date = new Date('2026-10-07T12:00:00+09:00');

    assert.deepEqual(getSubjectsForDate(date), ['制御工学']);
});

test('the temporary exception does not affect the following Wednesday', () => {
    const date = new Date('2026-10-14T12:00:00+09:00');

    assert.deepEqual(
        getSubjectsForDate(date),
        ['ソフトウェア工学', '制御工学']
    );
});

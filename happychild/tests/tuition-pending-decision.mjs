import assert from 'node:assert/strict';
import {classifyTuitionPending} from '../js/tuition-pending-decision.js';
const entry={baseRevision:2,values:{unitFee:'250000',adjustment:'0',note:'Mới'}};
assert.equal(classifyTuitionPending({revision:2,unitFee:200000,adjustment:0,note:'Cũ'},entry),'replay');
assert.equal(classifyTuitionPending({revision:3,unitFee:200000,adjustment:0,note:'Khác'},entry),'conflict');
assert.equal(classifyTuitionPending({revision:3,unitFee:250000,adjustment:0,note:'Mới'},entry),'already-synced');
assert.equal(classifyTuitionPending(undefined,{baseRevision:0,values:{unitFee:'',adjustment:0,note:''}}),'replay');
console.log('Pending tuition decisions: replay, conflict and already-synced passed.');

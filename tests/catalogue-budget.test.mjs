import test from 'node:test';
import assert from 'node:assert/strict';
import {readBudget} from '../scripts/catalogue-budget.mjs';
test('reads Spanish shopping budgets without truncating thousands or accepting partial prices',()=>{
  for(const [input,amount] of [['',null],['0',0],[' 19,95 € ',19.95],['19.95',19.95],['1.200',1200],['1.200,99',1200.99]]) assert.deepEqual(readBudget(input),{valid:true,amount});
  for(const input of ['-5','20abc','€','12,3,4']) assert.equal(readBudget(input).valid,false);
});

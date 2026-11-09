import * as core from './tuition-store.js?v=20261107-sync2';
import {durableDataAction} from './data-outbox.js?v=20261107-sync2';
export * from './tuition-store.js?v=20261107-sync2';
export const linkTuition=(...args)=>durableDataAction('tuition','linkTuition',args,core.linkTuition);
export const createTuitionAccount=(...args)=>durableDataAction('tuition','createTuitionAccount',args,core.createTuitionAccount);

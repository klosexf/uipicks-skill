'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const fixture = require('./reference-report-fixture.cjs');
const script = path.resolve(__dirname, '../skills/uipicks-reference/scripts/validate-report.cjs');
const {validateReport} = require(script);

test('valid record returns derived counts and does not certify image truth', () => {
  const result = validateReport(fixture());
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.deepEqual(result.counts, {sources:1,searches:2,candidates:2,viewedCandidates:2,recommendations:1});
  assert.ok(result.limitations.includes('结构与关联校验，不验证图片内容、工具记录真实性或全网最优。'));
});

const invalid = (name, change, code) => test(name, () => {
  const report = fixture(); change(report);
  const result = validateReport(report);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(item => item.code === code), JSON.stringify(result.errors));
});
invalid('unknown hard condition cannot enter recommendations', r => {r.candidates[0].checks[1].status='unknown';}, 'hard-condition');
invalid('failed hard condition cannot be compensated by aesthetics', r => {r.candidates[0].checks[1].status='fail';}, 'hard-condition');
invalid('omitted hard condition is rejected', r => {r.candidates[0].checks.pop();}, 'hard-condition');
invalid('duplicate passing checks cannot hide a failing check', r => {r.candidates[0].checks.push({...r.candidates[0].checks[1],status:'fail'});}, 'duplicate-check');
invalid('unseen image cannot support a recommendation', r => {r.candidates[0].evidence[0].toolRef='';}, 'evidence');
invalid('page text cannot stand in for a delivered image', r => {r.candidates[0].evidence[0].kind='page';}, 'display-image');
invalid('passing a different screenshot cannot prove delivered screenshot', r => {r.candidates[0].displayEvidenceIds=[];}, 'display-image');
invalid('hard condition proof must occur in delivered images or companion context', r => {
  r.candidates[0].evidence.push({id:'crop',kind:'image',location:'/tmp/crop.png',toolRef:'fixture:crop',observation:'仅裁切出标题'});
  r.candidates[0].displayEvidenceIds=['crop'];
}, 'display-condition');
invalid('evidence from another candidate is not proof', r => {r.candidates[0].checks[1].evidenceIds=['b-image'];}, 'evidence-reference');
invalid('duplicate canonical cases cannot inflate coverage', r => {r.candidates[1].canonicalUrl=r.candidates[0].canonicalUrl+'#screenshot';}, 'duplicate-case');
invalid('candidate search source must agree with its search', r => {r.candidates[0].sourceId='other';}, 'search-reference');
invalid('initial searches cannot be reported as challenge searches', r => {r.challenge.searchIds=['s1'];}, 'challenge');
invalid('an unseen initial candidate cannot be reported as a challenge finding', r => {r.challenge.candidateIds=['a'];}, 'challenge');
invalid('a discovered challenger cannot be hidden behind no-candidate', r => {r.challenge.candidateIds=[];r.challenge.outcome='no-candidate';}, 'challenge');
invalid('a completed challenge must account for every successful challenge path', r => {
  r.searches.push({...r.searches[1],id:'s3',url:'https://example.org/chat?page=3'});
}, 'challenge');
invalid('a newly recommended challenger cannot be described as kept', r => {
  r.candidates[1].decision='recommend';r.candidates[1].checks[1].status='pass';
  r.candidates[1].displayEvidenceIds=['b-image'];
  r.recommendations.push({...r.recommendations[0],candidateId:'b'});
}, 'challenge');
invalid('no better found requires a completed challenge', r => {r.challenge.status='not-performed';r.challenge.searchIds=[];r.challenge.candidateIds=[];}, 'stop-reason');
invalid('global best claim is not accepted', r => {r.scope.claim='global-best';}, 'scope');
invalid('repeating only an initial search does not count as new coverage', r => {
  r.searches[1]={...r.searches[0],id:'s2',round:'challenge'};
  r.candidates.pop();r.challenge.candidateIds=[];r.challenge.outcome='no-candidate';
}, 'challenge');
invalid('main recommendation requires an original-page attempt or disclosed limitation', r => {delete r.candidates[0].originalCheck;}, 'original-check');
invalid('original page success needs page evidence from that case', r => {r.candidates[0].originalCheck.evidenceIds=['a-image'];}, 'original-check');
invalid('blocked original pages must be disclosed in the recommendation', r => {r.candidates[0].originalCheck.status='blocked';}, 'original-check');
invalid('explicit requirements must quote actual user text', r => {r.request.hardConditions[0].basis='必须深色';}, 'provenance');
invalid('inferred hard requirements need a disclosed assumption', r => {r.request.hardConditions[0].origin='inferred';}, 'provenance');
invalid('rejected cases must retain a reason', r => {r.candidates[1].reason='';}, 'candidate');
invalid('credentials and executable URL schemes are rejected', r => {r.candidates[0].canonicalUrl='https://user:secret@example.org/';}, 'url');
invalid('empty recommendation reasons cannot pass', r => {r.recommendations[0].reason='';}, 'recommendation');
invalid('recommend list and candidate decisions must agree', r => {r.recommendations=[];}, 'recommendation');

test('budget-limited search may produce honest partial results with warnings', () => {
  const report=fixture();
  report.scope.stopReason='budget-reached';
  report.scope.stopDetail='用户要求快速查找，当前预算已用完，未补查。';
  report.challenge={status:'not-performed',searchIds:[],candidateIds:[],outcome:'not-performed',reason:'预算耗尽'};
  report.searches.pop();report.candidates.pop();
  const result=validateReport(report);
  assert.equal(result.valid,true,JSON.stringify(result.errors));
  assert.ok(result.warnings.some(item=>item.code==='coverage-limited'));
});
test('no image tools can return zero results without inventing evidence', () => {
  const report=fixture();
  report.scope.stopReason='access-limited';report.scope.stopDetail='当前没有看图工具';
  report.scope.gaps=['所有候选均未完成视觉核验'];
  report.searches=[];report.candidates=[];report.recommendations=[];
  report.challenge={status:'not-performed',searchIds:[],candidateIds:[],outcome:'not-performed',reason:'无看图工具'};
  assert.equal(validateReport(report).valid,true);
});
test('distinct SPA hash routes are distinct cases', () => {
  const report=fixture();
  report.candidates[0].canonicalUrl='https://example.org/#/cases/a';
  report.candidates[0].evidence[1].location=report.candidates[0].canonicalUrl;
  report.candidates[1].canonicalUrl='https://example.org/#/cases/b';
  assert.equal(validateReport(report).valid,true);
});
test('original-page tool absence allows preview-only results with explicit disclosure', () => {
  const report=fixture();
  report.candidates[0].originalCheck={status:'not-checked',evidenceIds:[],note:'无原站浏览工具，仅有已查看的公开预览'};
  report.recommendations[0].unverified.push(report.candidates[0].originalCheck.note);
  const result=validateReport(report);
  assert.equal(result.valid,true,JSON.stringify(result.errors));
  assert.ok(result.warnings.some(item=>item.code==='original-limited'));
});
test('a replacement followed by a further empty challenge can stop honestly', () => {
  const report=fixture();
  report.candidates[1].decision='recommend';report.candidates[1].checks[1].status='pass';
  report.candidates[1].displayEvidenceIds=['b-image'];
  report.candidates[1].evidence.push({id:'b-page',kind:'page',location:report.candidates[1].canonicalUrl,toolRef:'fixture:B-page',observation:'虚构公开详情页'});
  report.candidates[1].originalCheck={status:'opened',evidenceIds:['b-page'],note:'虚构原站已读取'};
  report.recommendations.push({...report.recommendations[0],candidateId:'b'});
  report.searches.push({...report.searches[1],id:'s3',url:'https://example.org/chat?page=3',note:'虚构后续补查没有新候选'});
  report.challenge.searchIds.push('s3');report.challenge.outcome='replaced';
  report.challenge.reason='第一轮加入 B，后续第三页没有新候选。';
  report.scope.stopDetail='最后一轮没有更合适候选；整个补查阶段曾更新推荐。';
  assert.equal(validateReport(report).valid,true);
});
test('malformed records yield errors instead of uncaught exceptions', () => {
  for (const value of [null,[],1,'x',{}, {request:[]}, {...fixture(),candidates:[null,1,[]]}, {...fixture(),challenge:[]}, {...fixture(),searches:[null]}, {...fixture(),recommendations:[null]}]) {
    assert.equal(validateReport(value).valid,false);
  }
});
test('CLI reads JSON without modifying it, exits nonzero on invalid records', () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'uipicks-report-'));
  try {
    const file=path.join(dir,'report.json'), content=JSON.stringify(fixture());fs.writeFileSync(file,content);
    const run=spawnSync(process.execPath,[script,file],{encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);assert.equal(JSON.parse(run.stdout).valid,true);
    assert.equal(fs.readFileSync(file,'utf8'),content);
    fs.writeFileSync(file,'{}');
    assert.equal(spawnSync(process.execPath,[script,file],{encoding:'utf8'}).status,1);
    fs.writeFileSync(file,'{');
    const broken=spawnSync(process.execPath,[script,file],{encoding:'utf8'});
    assert.equal(broken.status,1);assert.equal(JSON.parse(broken.stdout).valid,false);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

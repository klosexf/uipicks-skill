'use strict';

// Read-only structural checks. No network, image recognition or model calls.
function validateReport(input) {
  const errors=[], warnings=[];
  const issue=(code,at,message)=>errors.push({code,path:at,message});
  const warn=(code,message)=>warnings.push({code,message});
  const object=value=>value!==null && typeof value==='object' && !Array.isArray(value);
  const text=value=>typeof value==='string' && value.trim().length>0;
  const list=(value,at)=>{
    if (!Array.isArray(value)) {issue('shape',at,'必须为数组');return [];}
    return value;
  };
  const strings=(value,at)=>{
    const items=list(value,at);
    if (items.some(item=>!text(item))) issue('shape',at,'数组项必须为非空字符串');
    return items.filter(text);
  };
  const url=(value,at,allowLocal=false)=>{
    if (allowLocal && text(value) && (/^\/(?!\/)/.test(value) || /^[A-Za-z]:[\\/]/.test(value))) return value;
    try {
      const parsed=new URL(value);
      if (!['http:','https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error();
      if (!/^#!?\//.test(parsed.hash)) parsed.hash='';
      return parsed.href.replace(/\/$/,'');
    } catch {issue('url',at,'须为无凭据的 HTTP(S) URL；证据另允许本地绝对路径');return '';}
  };
  const index=(items,at)=>{
    const result=new Map();
    items.forEach((item,i)=>{
      if (!object(item) || !text(item.id)) {issue('shape',`${at}[${i}]`,'条目须有非空 id');return;}
      if (result.has(item.id)) issue('duplicate-id',`${at}[${i}].id`,'id 重复');
      else result.set(item.id,item);
    });
    return result;
  };
  const report=object(input)?input:{};
  if (!object(input)) issue('shape','$','记录必须为 JSON 对象');
  if (report.schemaVersion!==1) issue('shape','schemaVersion','只支持 schemaVersion=1');
  const request=object(report.request)?report.request:{};
  if (!text(request.text)) issue('request','request.text','保留用户原话');
  const assumptions=strings(request.assumptions,'request.assumptions');
  const conditions=list(request.hardConditions,'request.hardConditions');
  if (!conditions.length) issue('request','request.hardConditions','至少定义一个可检查的硬条件');
  const conditionById=index(conditions,'request.hardConditions');
  const provenance=(item,at)=>{
    if (!object(item) || !text(item.text) || !text(item.basis) || !['explicit','inferred'].includes(item.origin)) {
      issue('provenance',at,'需填写 text、origin（explicit/inferred）及 basis');return;
    }
    if (item.origin==='explicit' && (!text(request.text) || !request.text.includes(item.basis))) issue('provenance',at,'explicit 的 basis 必须摘自用户原话');
    if (item.origin==='inferred' && !assumptions.includes(item.basis)) issue('provenance',at,'inferred 的依据必须同时列入 assumptions 披露');
  };
  conditions.forEach((item,i)=>{
    provenance(item,`request.hardConditions[${i}]`);
    if (!['visual','access','implementation'].includes(item?.kind)) issue('request',`request.hardConditions[${i}].kind`,'条件类型须为 visual/access/implementation');
  });
  list(request.preferences,'request.preferences').forEach((item,i)=>provenance(item,`request.preferences[${i}]`));

  const scope=object(report.scope)?report.scope:{};
  if (!text(scope.description) || !text(scope.budget) || !text(scope.stopDetail) || scope.claim!=='within-reviewed-scope') issue('scope','scope','需声明搜索范围、预算、停止说明及 within-reviewed-scope');
  if (!['scope-exhausted','no-better-found','budget-reached','access-limited'].includes(scope.stopReason)) issue('stop-reason','scope.stopReason','停止原因无效');
  const gaps=strings(scope.gaps,'scope.gaps');
  if (['budget-reached','access-limited'].includes(scope.stopReason) && !gaps.length) issue('scope','scope.gaps','预算或访问受限时必须披露缺口');

  const searches=list(report.searches,'searches'), searchById=index(searches,'searches');
  searches.forEach((search,i)=>{
    if (!object(search)) return;
    if (!text(search.sourceId) || !text(search.query) || !text(search.note) || !['initial','challenge'].includes(search.round) || !['ok','blocked'].includes(search.status)) issue('search',`searches[${i}]`,'填写来源、实际查询/分类路径、轮次、状态及观察');
    url(search.url,`searches[${i}].url`);
  });
  const candidates=list(report.candidates,'candidates'), candidateById=index(candidates,'candidates');
  const canonicalCases=new Set(), evidenceIds=new Set();
  let viewedCandidates=0;
  candidates.forEach((candidate,i)=>{
    if (!object(candidate)) return;
    const at=`candidates[${i}]`;
    if (!text(candidate.title) || !text(candidate.reason) || !['recommend','reject','alternative','unverified'].includes(candidate.decision)) issue('candidate',at,'候选需名称、结论和具体理由');
    const canonical=url(candidate.canonicalUrl,at+'.canonicalUrl');
    if (canonical && canonicalCases.has(canonical)) issue('duplicate-case',at+'.canonicalUrl','同一原始案例只能记录一次；转载发现路径记入检索记录');
    canonicalCases.add(canonical);
    const search=searchById.get(candidate.searchId);
    if (!search || search.sourceId!==candidate.sourceId || search.status!=='ok') issue('search-reference',at+'.searchId','候选须关联同一来源的成功检索记录');
    const evidence=list(candidate.evidence,at+'.evidence'), evidenceById=index(evidence,at+'.evidence');
    evidence.forEach((item,j)=>{
      if (!object(item)) return;
      if (evidenceIds.has(item.id)) issue('duplicate-id',`${at}.evidence[${j}].id`,'证据 id 在整份记录中须唯一');
      evidenceIds.add(item.id);
      if (!['image','page','interaction','code'].includes(item.kind) || !text(item.toolRef) || !text(item.observation)) issue('evidence',`${at}.evidence[${j}]`,'证据需类型、实际工具引用及可观察描述');
      url(item.location,`${at}.evidence[${j}].location`,true);
    });
    if (evidence.some(item=>object(item) && item.kind==='image' && text(item.toolRef) && text(item.observation))) viewedCandidates++;
    const displayed=strings(candidate.displayEvidenceIds,at+'.displayEvidenceIds');
    for (const id of displayed) {
      if (evidenceById.get(id)?.kind!=='image') issue('display-image',at+'.displayEvidenceIds','交付画面须引用本候选的图片证据');
    }
    const checks=list(candidate.checks,at+'.checks'), checkById=new Map();
    checks.forEach((check,j)=>{
      if (!object(check)) {issue('shape',`${at}.checks[${j}]`,'检查须为对象');return;}
      if (checkById.has(check.conditionId)) issue('duplicate-check',at+'.checks','同一硬条件不可重复检查以掩盖失败');
      else checkById.set(check.conditionId,check);
      if (!conditionById.has(check.conditionId) || !['pass','fail','unknown'].includes(check.status)) issue('hard-condition',`${at}.checks[${j}]`,'硬条件引用或检查状态无效');
      const proof=strings(check.evidenceIds,`${at}.checks[${j}].evidenceIds`);
      if (check.status!=='unknown' && !proof.length) issue('evidence-reference',`${at}.checks[${j}]`,'通过或失败均需实际证据；未核验使用 unknown');
      for (const id of proof) if (!evidenceById.has(id)) issue('evidence-reference',`${at}.checks[${j}]`,'不得引用其他候选或不存在的证据');
    });
    for (const [id,condition] of conditionById) {
      const check=checkById.get(id);
      if (!check) issue('hard-condition',at+'.checks','每个硬条件均须记录 pass/fail/unknown');
      if (candidate.decision!=='recommend') continue;
      if (!check || check.status!=='pass') issue('hard-condition',at+'.checks','主推荐的全部硬条件须通过');
      if (condition.kind==='visual' && (!Array.isArray(check?.evidenceIds) || !check.evidenceIds.length || check.evidenceIds.some(proof=>!displayed.includes(proof) || evidenceById.get(proof)?.kind!=='image'))) issue('display-condition',at+'.checks','视觉硬条件须由交付图或配套上下文图证明');
    }
    if (candidate.decision==='recommend' && !displayed.some(id=>evidenceById.get(id)?.kind==='image')) issue('display-image',at+'.displayEvidenceIds','主推荐必须交付实际看过的图片');
    if (candidate.decision==='recommend') {
      const original=object(candidate.originalCheck)?candidate.originalCheck:{};
      if (!['opened','blocked','not-checked'].includes(original.status) || !text(original.note)) issue('original-check',at+'.originalCheck','主推荐须记录免费匿名原站访问结果，或工具/访问限制');
      const proof=strings(original.evidenceIds,at+'.originalCheck.evidenceIds');
      if (original.status==='not-checked' && proof.length) issue('original-check',at+'.originalCheck','未访问原站不得填写已执行证据');
      if (['opened','blocked'].includes(original.status) && (!proof.length || proof.some(id=>{
        const item=evidenceById.get(id);
        return item?.kind!=='page' || url(item.location,at+'.originalCheck.location')!==canonical;
      }))) issue('original-check',at+'.originalCheck','原站访问结果须关联该原始案例 URL 的页面或失败响应证据');
      if (original.status!=='opened') warn('original-limited','有主推荐未完成原站核验，须逐项披露限制。');
    }
  });

  const recommendations=list(report.recommendations,'recommendations'), recommendedIds=new Set();
  recommendations.forEach((item,i)=>{
    if (!object(item)) {issue('recommendation',`recommendations[${i}]`,'推荐须为对象');return;}
    if (recommendedIds.has(item.candidateId) || candidateById.get(item.candidateId)?.decision!=='recommend' || !text(item.reason) || !text(item.tradeoff)) issue('recommendation',`recommendations[${i}]`,'推荐须唯一、与候选结论一致，且有理由及取舍');
    recommendedIds.add(item.candidateId);
    const unverified=strings(item.unverified,`recommendations[${i}].unverified`);
    const original=candidateById.get(item.candidateId)?.originalCheck;
    if (original && original.status!=='opened' && !unverified.includes(original.note)) issue('original-check',`recommendations[${i}].unverified`,'原站未核验时须原样披露 originalCheck.note');
  });
  for (const [id,candidate] of candidateById) if (candidate.decision==='recommend' && !recommendedIds.has(id)) issue('recommendation','recommendations','入选候选未列入交付清单');
  const challenge=object(report.challenge)?report.challenge:{};
  const challengeSearches=strings(challenge.searchIds,'challenge.searchIds');
  const challengeCandidates=strings(challenge.candidateIds,'challenge.candidateIds');
  if (!['completed','not-performed'].includes(challenge.status) || !text(challenge.reason)) issue('challenge','challenge','须说明补查执行情况与理由');
  if (challenge.status==='completed') {
    if (!challengeSearches.length || !['kept','replaced','no-candidate'].includes(challenge.outcome)) issue('challenge','challenge','完成补查须有实际检索记录与结论');
    if (new Set(challengeSearches).size!==challengeSearches.length || new Set(challengeCandidates).size!==challengeCandidates.length) issue('challenge','challenge','补查引用不可重复');
    for (const id of challengeSearches) {
      const search=searchById.get(id);
      if (search?.round!=='challenge' || search.status!=='ok') issue('challenge','challenge.searchIds','补查只能引用实际成功的 challenge 轮检索');
    }
    const searchKey=search=>JSON.stringify([search.sourceId,url(search.url,'challenge.searchUrl'),String(search.query).trim().replace(/\s+/g,' ').toLowerCase()]);
    const initialKeys=new Set(searches.filter(search=>object(search)&&search.round==='initial'&&search.status==='ok').map(searchKey));
    if (!challengeSearches.some(id=>searchById.has(id)&&!initialKeys.has(searchKey(searchById.get(id))))) issue('challenge','challenge.searchIds','仅重复成功初查路径不能充当新增覆盖；普通重试留在 searches 如实记录');
    for (const id of challengeCandidates) if (!challengeSearches.includes(candidateById.get(id)?.searchId)) issue('challenge','challenge.candidateIds','补查候选须来自本次补查路径');
    for (const [id,search] of searchById) if (search.round==='challenge' && search.status==='ok' && !challengeSearches.includes(id)) issue('challenge','challenge.searchIds','完成摘要不得遗漏已成功的补查路径');
    for (const [id,candidate] of candidateById) if (challengeSearches.includes(candidate.searchId) && !challengeCandidates.includes(id)) issue('challenge','challenge.candidateIds','完成摘要不得隐藏已发现的补查候选');
    if ((challenge.outcome==='no-candidate')!==(!challengeCandidates.length)) issue('challenge','challenge.outcome','没有新候选须写 no-candidate，不能假装比较过');
    if (challenge.outcome==='replaced' && !challengeCandidates.some(id=>recommendedIds.has(id))) issue('challenge','challenge.outcome','替换后须有补查候选进入推荐');
    if (challenge.outcome==='kept' && challengeCandidates.some(id=>recommendedIds.has(id))) issue('challenge','challenge.outcome','有补查候选进入主推荐时须记录 replaced');
  } else if (challengeSearches.length || challengeCandidates.length || challenge.outcome!=='not-performed') issue('challenge','challenge','未完成补查不得填写完成结论');
  if (['no-better-found','scope-exhausted'].includes(scope.stopReason) && challenge.status!=='completed') issue('stop-reason','scope.stopReason','未完成补查不能声称已比较完或未找到更好的');
  if (challenge.status!=='completed' || gaps.length || ['budget-reached','access-limited'].includes(scope.stopReason)) warn('coverage-limited','覆盖存在缺口，请在交付摘要披露补查、预算或访问限制。');
  const sources=new Set(searches.filter(item=>object(item)&&item.status==='ok'&&text(item.sourceId)).map(item=>item.sourceId)).size;
  if (sources<3 || candidates.length<12) warn('below-target','未达到默认 3 个来源、约 12 个候选的覆盖目标；数量不是质量保证，不凑数。');
  if (!recommendations.length) warn('no-recommendations','当前没有可交付主推荐，请说明需求或工具缺口。');
  return {valid:errors.length===0,errors,warnings,counts:{sources,searches:searches.length,candidates:candidates.length,viewedCandidates,recommendations:recommendations.length},
    limitations:['结构与关联校验，不验证图片内容、工具记录真实性或全网最优。','需求是否完整、审美和排序质量仍需实际看图与人工任务评测。']};
}

if (require.main===module) {
  let result;
  try {
    if (process.argv.length!==3) throw new Error('用法：node validate-report.cjs /绝对路径/report.json');
    const fs=require('node:fs'), file=process.argv[2];
    if (fs.statSync(file).size>2*1024*1024) throw new Error('记录超过 2 MiB，请保留本次必要证据。');
    result=validateReport(JSON.parse(fs.readFileSync(file,'utf8')));
  } catch (error) {result={valid:false,errors:[{code:'input',path:'$',message:error instanceof SyntaxError?'JSON 格式无效。':error.message}]};}
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  if (!result.valid) process.exitCode=1;
}
module.exports={validateReport};

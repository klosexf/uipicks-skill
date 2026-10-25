'use strict';

// Synthetic records only: these URLs and observations are not real search evidence.
module.exports = function fixture() {
  return {
    schemaVersion:1,
    request:{text:'找 Web AI 聊天界面，要多轮对话，风格简洁。',
      hardConditions:[{id:'web',text:'Web 页面',kind:'visual',origin:'explicit',basis:'Web'},
        {id:'turns',text:'至少两轮用户提问与 AI 正文回复',kind:'visual',origin:'explicit',basis:'多轮对话'}],
      preferences:[{text:'风格简洁',origin:'explicit',basis:'风格简洁'}],assumptions:[]},
    scope:{description:'受控虚构案例集，不是全网搜索',budget:'测试只提供两个案例的观察',
      claim:'within-reviewed-scope',stopReason:'no-better-found',stopDetail:'补查候选 B 未通过轮次条件，保留 A。',gaps:['仅一个模拟来源，未实测交互']},
    searches:[{id:'s1',sourceId:'demo',url:'https://example.org/chat',query:'AI chat UI',round:'initial',status:'ok',note:'提供 A 的虚构观察'},
      {id:'s2',sourceId:'demo',url:'https://example.org/chat?page=2',query:'multi-turn conversation',round:'challenge',status:'ok',note:'提供 B 的虚构观察'}],
    candidates:[
      {id:'a',title:'模拟多轮界面',canonicalUrl:'https://example.org/cases/a',sourceId:'demo',searchId:'s1',decision:'recommend',reason:'两轮正文齐全',
        evidence:[{id:'a-image',kind:'image',location:'https://example.org/a.png',toolRef:'fixture:A',observation:'桌面浏览器画面中有两轮用户与 AI 正文、继续输入区'},
          {id:'a-page',kind:'page',location:'https://example.org/cases/a',toolRef:'fixture:A-page',observation:'虚构匿名免费详情页已读取'}],
        originalCheck:{status:'opened',evidenceIds:['a-page'],note:'已读取免费匿名原始页面'},
        checks:[{conditionId:'web',status:'pass',evidenceIds:['a-image']},{conditionId:'turns',status:'pass',evidenceIds:['a-image']}],displayEvidenceIds:['a-image']},
      {id:'b',title:'模拟单轮界面',canonicalUrl:'https://example.org/cases/b',sourceId:'demo',searchId:'s2',decision:'reject',reason:'只有一轮对话',
        evidence:[{id:'b-image',kind:'image',location:'https://example.org/b.png',toolRef:'fixture:B',observation:'桌面浏览器画面只见一轮用户与 AI 正文'}],
        checks:[{conditionId:'web',status:'pass',evidenceIds:['b-image']},{conditionId:'turns',status:'fail',evidenceIds:['b-image']}],displayEvidenceIds:[]}
    ],
    recommendations:[{candidateId:'a',reason:'在已查看范围内满足多轮硬条件，留白清楚',tradeoff:'长回复布局尚未核验',unverified:['未实测交互']}],
    challenge:{status:'completed',searchIds:['s2'],candidateIds:['b'],outcome:'kept',reason:'补查 B 只有单轮，未替换 A'}
  };
};

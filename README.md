# UIPicks Skill

让你的 AI 按 UI 与交互设计师的标准，结合实际画面、原站案例和交互演示挑选 UI 参考。

## 让 AI 安装

将下面这句话发给支持 Skill 安装、具备联网与文件操作能力的 AI：

> 请帮我安装这个 UIPicks Skill：https://github.com/klosexf/uipicks-skill/tree/main/skills/uipicks-reference

也可以使用 [Skills CLI](https://www.skills.sh/docs/cli)：

```sh
npx skills add klosexf/uipicks-skill
```

客户端是否需要重新加载 Skill，以它的实际提示为准。普通聊天网页未必支持本地安装。

## 使用

安装后直接提出需求，例如：

> 用 UIPicks 帮我找适合内容网站的网页搜索框参考。希望有较好的视觉完成度，兼顾输入建议、键盘操作和移动端体验。

> 我想做一个 AI 对话 Agent，找几个聊天进行中的页面样式：要看得到用户提问、AI 回答和继续输入区，优先多轮对话。

Skill 将读取 [UIPicks](https://www.uipicks.top/) 的最新来源目录，按素材标签和访问条件选择来源，再去原站按需查看。从视觉完成度、实用性、交互体验和需求匹配四个方面评审，展示实际看过的图片、原始链接、具体借鉴点、取舍和未核验项。

查找前先确定对象、状态、必须可见内容和排除项；看图通过这些条件后再比较设计。交付前逐张核对，合格案例不足时少给。AI Chat 默认查找有提问与回复的对话画面；明确要欢迎页或空状态时按该要求筛选。工具失败不会放宽入选条件。

协议 v4 增加可检查的查找记录：保留用户原话与推断、实际查询、候选去留、逐图证据、原站访问、补查比较和停止原因。初选后继续寻找可能替换入选方案的候选，不把数量达标当作找到了最优。

调用方将记录放在本次任务工作目录，使用随包模板和只读校验脚本；不上传 UIPicks、不写入 Skill 安装目录。有 Node.js 时执行：

```sh
node <Skill目录>/scripts/validate-report.cjs <本次记录.json>
```

脚本检查硬条件、交付图证据引用、原始案例去重、原站访问记录及补查一致性。通过仅表示记录结构和关联通过，不证明图片内容、工具引用真实性、需求理解完整或全网最优。无 Node.js 时按指南人工核对并注明未运行程序校验，不自动安装运行时。

维护时用 [AI Chat 回归场景](tests/ai-chat-regression.md) 复测，包括正常对话、误选开场页、状态切换、免费源码要求与工具失败。格式检查不能代替实际看图和交互验证。

## 版本与网站依赖

2026-10-25 更新为研究协议 v4、查找记录格式 v1。GitHub 安装包自带完整指南、模板和校验脚本；网站部署与本仓库更新分别进行，不能由 GitHub 推送推断网站已上线。在线指南版本较旧时，不得降低本包的入选门槛和查找记录要求；最新来源标签、路径及访问条件仍须读取当前网站响应。入口不可用时披露实际限制，不把安装完成描述成检索已验证。

## 内容与能力

- `skills/uipicks-reference/SKILL.md`：Skill 入口。
- `skills/uipicks-reference/references/research-guide.md`：随包评审与检索指南，包含参数及证据边界。
- `skills/uipicks-reference/references/report-template.json`：未填写的查找记录模板，不能直接当成通过的案例。
- `skills/uipicks-reference/scripts/validate-report.cjs`：无第三方依赖的只读 Node 校验器，不联网、不抓图、不修改记录。
- 仅使用免费、无需登录或订阅的公开来源路径；图片留在原站。
- 不内置网站清单、图片、第三方账号、API Key 或可执行安装脚本。
- AI 需要自己的网页/HTTP 和看图工具；交互实测还需要浏览器。Skill 不提供这些能力，也不保证模型的审美判断质量。
- 最新来源查询依赖 UIPicks 网站。生产接口或页面不可用时，按 Skill 指南回退到可读的来源目录并披露实际检查日期与限制；不能把安装成功当作联网检索或交互实测通过。

仓库只分发 Skill 与必要说明，网站数据由 UIPicks 维护，素材与许可条件以原站为准。

## 维护与验证

```sh
node --test tests/check-reference-report.cjs
```

结构与关联的 36 项回归检查覆盖未知硬条件、错图取证、原站限制、重复案例、伪补查、SPA 路由及无工具降级。测试中的 example.org 和观察内容均为虚构数据，不能冒充实际找图结果。真实任务的人工盲评流程见 [找图质量评测](tests/reference-search-evaluation.md)；没有人工标注时不报告质量提升百分比。

已安装的客户端需要更新本仓库的 Skill 文件，并按客户端要求重新加载；GitHub 更新不会自动替换每个客户端的本地副本。

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

Skill 将读取 [UIPicks](https://www.uipicks.top/) 的最新来源目录，按素材标签和访问条件选择来源，再去原站按需查看。从视觉完成度、实用性、交互体验和需求匹配四个方面评审，展示实际看过的图片、原始链接、具体借鉴点、取舍和未核验项。

## 当前上线状态

2026-10-20 发布前检查：正式网站的来源目录可访问；新版 `/api/sources` 与在线评审指南尚未发布，当前返回 404。包内评审指南可读，但完整的新版来源检索能力仍需网站单独部署。遇到不可用入口应披露限制，不把安装完成描述成检索已验证。

## 内容与能力

- `skills/uipicks-reference/SKILL.md`：Skill 入口。
- `skills/uipicks-reference/references/research-guide.md`：随包评审与检索指南，包含参数及证据边界。
- 仅使用免费、无需登录或订阅的公开来源路径；图片留在原站。
- 不内置网站清单、图片、第三方账号、API Key 或可执行安装脚本。
- AI 需要自己的网页/HTTP 和看图工具；交互实测还需要浏览器。Skill 不提供这些能力，也不保证模型的审美判断质量。
- 最新来源查询依赖 UIPicks 网站。生产接口或页面不可用时，按 Skill 指南回退到可读的来源目录并披露实际检查日期与限制；不能把安装成功当作联网检索或交互实测通过。

仓库只分发 Skill 与必要说明，网站数据由 UIPicks 维护，素材与许可条件以原站为准。

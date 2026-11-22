# TimeCue TODO

本清单记录后续计划与完成状态；未勾选的条目尚未实现或仍待讨论。当前功能见 [中文说明](README.zh-CN.md) / [English README](README.md)。

## 首要待办：语音控制 Start / Stop

目标：训练时通过语音开始和停止计时，减少伸手操作手机。用户已提出此需求，具体交互和技术方案待确定。

### 交互与行为

- [ ] 支持英文语音命令 `start` 和 `stop`。
- [ ] 提供语音控制开关及清晰的麦克风状态：未开启、正在监听、不可用。首次启用时请求麦克风权限，关闭后停止监听。
- [ ] `start` 沿用当前准备倒计时设置；正在计时时重复说 `start` 不重置计时。
- [ ] `stop` 停止计时并保留待保存的 Set，继续由用户手动修改和保存；重复说 `stop` 不生成重复记录。
- [ ] 准备倒计时期间说 `stop` 可取消本次开始，不生成 Set。
- [ ] 保留按钮操作；拒绝麦克风权限、识别不受支持或识别失败时，仍可正常使用计时器。
- [ ] 明确暂停状态下 `start` 的含义，以及存在未保存 Set 时的处理方式，避免误操作或覆盖记录。

### 技术验证与验收

- [ ] 先在目标手机浏览器验证语音识别能力，记录兼容性、联网要求、连续监听限制，再确定网页版可用范围。
- [ ] 验证语音报时和语音控制能否同时工作：避免应用自己的声音触发命令，并测试播报期间能否识别 `stop`。
- [ ] 测试运动噪声、音乐、不同距离和耳机环境下的识别准确度；必要时评估 `TimeCue start` / `TimeCue stop` 等更明确的口令。
- [ ] 测量从说出 `stop` 到实际停止的延迟，明确停止时间的计算方式；继续支持保存前修正时长。
- [ ] 处理监听意外中断及重新启用，让界面状态与实际监听状态一致。
- [ ] 验证重复命令、无关语音、权限拒绝、开始倒计时、暂停、未保存 Set 等场景，不破坏现有计时与 Session 行为。
- [ ] 更新中英文使用说明，说明支持的设备、命令、权限与限制。

## 已完成：独立的组间休息计时

目标：每个 Set 之间持续显示已间隔多久，方便掌握休息时间；独立于主计时。已实现，并通过单元测试及浏览器验证。

- [x] 使用正向累计计时，显示组间已休息时长。
- [x] 独立显示休息时间，不覆盖或修改上一组的主计时结果。
- [x] 休息时间不计入 Set 时长或 Session 训练总时长，不影响主计时的报时间隔。
- [x] 保存、修改 Set 时长或处理未保存提示时，休息计时继续，不因记录操作重置。
- [x] 在停止一组后自动开始休息计时，下一组正式开始时结束；下一组准备倒计时计入休息时间，取消准备倒计时后继续休息。
- [x] 结束 Session 时结束休息计时，新 Session 不沿用上一轮休息时间。
- [x] 验证保存、丢弃、准备倒计时及取消、下一组开始等操作下，两个计时互不干扰；组内暂停不作为组间休息。
- [x] 在 Saved sets 和 Session 汇总中增加 Rest after 列：下一组正式开始时，将间隔记录在前一组上，包含准备倒计时，不计入训练总时长；未完成的间隔显示为 —。
- [ ] 待讨论：是否需要休息语音提醒及其间隔。

## 已完成：按次数保存 Set

- [x] 增加 Time / Reps 记录类型，支持卧推等按次数记录的训练。
- [x] Stop 后输入正整数次数，再手动 Save set；开始下一组时清空次数输入。
- [x] 保留 Start / Stop 和准备倒计时以准确记录组间间隔；Reps 模式不播报已用时。
- [x] Saved sets 显示次数，Session 分别汇总计时组时长与总次数，不将次数当作秒数。
- [x] 支持停止后切换尚未保存的记录类型、保存或丢弃提示、删除记录，以及混合类型训练。

## 已完成：训练日历与 JSON 备份

- [x] 使用 IndexedDB 持久保存完整 Session，包含 Time / Reps、实测时长和 Rest after。
- [x] Finish session 后手动 Save to calendar，默认归属开始时的本地日期，允许补记日期。
- [x] 提供月历、每日 Session 数量与汇总、展开查看 Set 明细和删除记录。
- [x] 重复保存使用同一 ID，允许在当前完成页面修改归属日期，不重复插入。
- [x] JSON 导出、导入预览、全文件校验、相同 ID 跳过和事务回滚。
- [x] 验证刷新恢复、跨时区导入、跨午夜日期、闰月、存储不可用及手机布局。

## 后续方向：Google 登录与云端同步

目前仅讨论方案，尚未开始实现或确定服务商。目标是使用同一个 Google 账号（包括 Gmail 账号）在手机和电脑上访问训练日历。登录由 Google 完成，TimeCue 不接收邮箱密码。

### 服务选型

| 方案 | 登录与数据库 | 适用特点 |
| --- | --- | --- |
| Firebase | Firebase Authentication + Firestore | Google 登录集成方便，适合后续 Android APP |
| Supabase | Supabase Auth + PostgreSQL | 适合按日期、动作查询和统计，关系型数据管理更直观 |

考虑到 Android 计划，当前建议优先评估 Firebase，但这不是已确定的技术决策。网页仍可部署在 GitHub Pages，通过认证和数据库服务访问云端数据。

- [ ] 核对服务的免费额度、计费规则、数据区域及目标用户的访问可用性。
- [ ] 配置 Sign in with Google、授权域名及登录回调，验证手机和电脑上的登录体验。
- [ ] 使用认证服务提供的稳定用户 ID 归属记录，并通过数据库访问规则确保用户只能读写自己的数据。

### 本地与云端数据

- [ ] 保留 IndexedDB 与 JSON 导出／导入，未登录时继续支持本地使用和备份。
- [ ] 登录后提供“上传本地历史”选项，由用户选择是否迁移已有记录。
- [ ] 同一账号跨设备同步完整 Session、Time / Reps、Rest after 和日历归属日期。
- [ ] 沿用稳定的 Session ID 去重，并设计更新时间、版本及冲突处理规则；明确多设备修改同一记录时如何处理。
- [ ] 离线时先保存在本地，联网后重试同步，显示待同步、已同步和失败状态。
- [ ] 为删除记录设计同步标记，防止离线设备重新上传已删除的数据。
- [ ] 明确退出和切换账号时本地缓存的保留、清理及隔离规则，避免展示或上传其他账号的记录。

### 实施顺序与验证

- [ ] 先验证 Google 登录与按用户隔离的云端读写，再实现本地历史迁移和双向同步。
- [ ] 验证跨设备访问、重复上传、离线恢复、并发修改、删除传播、权限拒绝及账号切换。
- [ ] 更新中英文说明，解释本地与云端保存方式、同步状态、备份和数据删除行为。

主要工作是可靠的双向同步；接入 Google 登录本身不等于完成云同步。

## 后续方向：Android APP

这是此前讨论过的目标，尚未开始实现，也未选定技术路线。

- [ ] 确定 Android 版本是否需要锁屏或后台报时、后台语音控制及离线使用。
- [ ] 根据上述要求比较网页封装与原生 Android 等方案，优先验证报时和语音识别的实际可靠性。
- [ ] 确定首版范围、APK 分发和升级方式，再安排开发。

## 后续方向：Google Play 上架

目前仅记录发布计划，尚未开始 Android 开发或提交上架。建议首版包含本地训练、日历和 JSON 备份，之后再迭代 Google 登录与云同步。以下要求于 **2026-11-22** 核对，实际发布前需再次检查官方政策。

### 账号与发布包

- [ ] 注册 Google Play Console，选择个人或组织开发者账号。当前注册费为一次性 **25 美元**，完成身份和联系方式验证；新个人账号还需验证 Android 设备。[官方账号说明](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en)
- [ ] 确定唯一包名，例如 `io.github.omegazhang3.timecue`（仅为候选，尚未采用），生成签名的 **Android App Bundle（.aab）**，配置 Play App Signing，妥善保存上传密钥。[创建和设置应用](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en)
- [ ] 核对目标 API 要求：自 2026-08-31 起，普通手机应用的新应用和更新需 target **Android 16 / API 36 或更高**。最低支持的 Android 版本单独设置，不代表只能安装在 Android 16 上。[目标 API 官方要求](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)

### 商店页面与应用声明

- [ ] 准备 TimeCue 名称、简短介绍、完整说明、图标、宣传图、手机截图和支持邮箱；确定发布地区以及免费／付费方式。第一版可先提供英文商店页面。
- [ ] 准备公开可访问的隐私政策，并根据应用及所用 SDK 的实际数据流填写 Data safety、内容分级、广告和目标受众等声明。
- [ ] 完成 Health apps declaration，如实声明运动训练相关功能。[健康应用声明](https://support.google.com/googleplay/android-developer/answer/14738291?hl=en)
- [ ] 后续加入麦克风语音控制、前台服务或云同步时，核对相关权限与声明要求并同步更新。
- [ ] 若支持在应用内创建账号，按政策提供应用内及网页端的账号删除请求入口，并处理关联用户数据。[账号删除要求](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)

### 测试、审核与更新

- [ ] 先进行内部测试，验证计时、报时、日历持久化、JSON 备份恢复及版本升级兼容性。
- [ ] 如果使用 **2023-11-13 之后创建的个人开发者账号**，安排至少 **12 名测试者连续加入封闭测试 14 天**，收集反馈并修复问题，再申请正式发布权限。人数和天数达标不代表自动获批。[个人账号测试要求](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [ ] 完成 Play Console 发布检查，上传正式版本并提交审核；审核通过后发布到选定地区。
- [ ] 后续更新保持同一包名并递增版本号，按 Play Console 要求提交更新审核。
- [ ] 提前准备开发者账号和测试者，排期包含封闭测试、正式发布权限申请及审核时间，不只计算编码时间。

## 后续方向：Solana Seeker / dApp Store 上架

Seeker 手机上的 Solana dApp Store 是独立于 Google Play 的发布渠道。官方支持原生 Android 应用及网页封装 APK。当前仅记录计划，未开始封装、注册、链上交易或提交审核。以下要求于 **2026-11-22** 核对，发布前需再次确认。

### 发布准备

- [ ] 生成正式签名的 **APK**，不是 Google Play 使用的 AAB；不能使用 Debug 包，需支持 `arm64-v8a`，包大小不超过 2 GB。[构建与签名说明](https://docs.solanamobile.com/dapp-store/build-and-sign-an-apk)
- [ ] 在 [Publisher Portal](https://publish.solanamobile.com/) 注册发布者账号，填写开发者名称和公开网站；个人完成 KYC，企业完成 KYB，验证通过后才能添加应用。
- [ ] 准备专用发布钱包，例如 Phantom 或 Solflare，并准备少量 SOL 用于链上发布交易。费用以实际提交时提示为准；后续版本仍需使用该发布钱包，应长期保留访问权限。
- [ ] 准备 512×512 不透明背景图标、1200×600 横幅及 4–8 张截图，以及应用介绍、支持邮箱和公开网站。[商店素材要求](https://docs.solanamobile.com/dapp-store/listing-page-guidelines)
- [ ] 准备各自独立、公开可通过 HTTPS 访问的服务条款和隐私政策页面；可使用现有 GitHub Pages 承载。阅读 [Publisher Policy](https://docs.solanamobile.com/dapp-store/publisher-policy) 与 [Developer Agreement](https://docs.solanamobile.com/dapp-store/agreement)。

### 提交与更新

- [ ] 填写与 APK application ID 完全一致的包名及应用资料，在发布钱包中确认创建 App NFT 的交易；包名需唯一，创建后不能更改。
- [ ] 进入 Releases → New Version，上传 APK 或提供 APK URL，填写更新说明，确认发布流程中的钱包签名请求并提交审核。链上记录用于应用发布，TimeCue 的运动数据仍可保存在本地，无需上链。
- [ ] 跟进审核邮件。官方当前提供的首次审核参考时间为 3–4 个工作日，不保证固定时限；通过后在相应分类上线。[完整提交流程](https://docs.solanamobile.com/dapp-store/submit-new-app)
- [ ] 后续更新继续使用同一 dApp Store 应用签名密钥和发布钱包，提高 `versionCode` 后提交新版本。

### 双商店发布与 TimeCue 验证

- [ ] 若同时上架 Google Play，按 Solana 官方当前要求，为 dApp Store 使用与 Google Play **不同的签名密钥**，在 Android 工程中分别配置两个渠道的构建。[双商店发布说明](https://docs.solanamobile.com/dapp-store/publishing-from-google-play)
- [ ] 规划跨商店安装和数据迁移：同包名、不同签名的安装包不能直接互相覆盖升级；迁移前可使用 JSON 备份。
- [ ] 比较原生实现与官方网页封装工具；若封装现有网页，验证 WebView 的语音合成能力，必要时接入 Android 原生 TextToSpeech。
- [ ] 测试计时、语音报时、休息计时、日历持久化、JSON 导入／导出和版本升级。开发不强制要求拥有 Seeker，但建议提交前在 Seeker 真机验证。[官方 FAQ](https://docs.solanamobile.com/get-started/faq)

## 候选功能：待讨论，不纳入已确认范围

- [ ] **训练预设**：按“跳绳”“悬挂”等活动保存报时间隔、准备倒计时和播报模式，减少重复设置。
- [ ] **更多语音命令**：在 Start / Stop 稳定后，评估 Pause / Resume；Save set / Next set 需要单独设计确认及防误触行为。
- [ ] **分享训练汇总**：复制或导出当前 Session 的组数、每组时长和总时长，方便自行记录。
- [ ] **中文界面与播报**：在英文版本稳定后评估，语音控制的中文命令另行验证。

## 当前约定

- 网页版继续使用 GitHub Pages，保持轻量、无需注册。
- Set 手动保存；语音停止不自动保存。
- 当前训练仍为临时记录；已完成的 Session 可手动保存到 IndexedDB 日历，并通过 JSON 备份迁移。
- 保持屏幕常亮暂不纳入需求；后台与锁屏能力另行评估。
- 建议先完成语音 Start / Stop 的手机实测，再决定是否扩展命令或转向 Android 实现。

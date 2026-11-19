# 森光守夜 · Forest Nightwatch

**当前版本：v1.10.1 · 全身职业卡与猎手移动**　｜　[版本说明](https://github.com/DraymondZhou/forest-nightwatch/releases/tag/v1.10.1) · [下载离线游戏（HTML）](https://github.com/DraymondZhou/forest-nightwatch/releases/download/v1.10.1/Forest-Nightwatch-v1.10.1.html)

《森光守夜》是一款支持手机横屏和电脑浏览器的森林生存肉鸽。先选职业，再选流派：法师靠雷电、孢子或余火控制战场；剑卫用盾反或重斩近身作战；猎手用穿杨或散射调整交战距离。

每局第 3 分钟迎战棘冠山主或月绒蛾后，第 6 分钟迎战古树守卫。观察冲撞路线、挥砍扇面和蛾粉环带来闪避；同时在场的首领分别显示血条。

普通怪有 12% 概率掉 1 金币；精英有 65% 概率掉 3 金币；小首领必掉 12 金币，最终首领必得 25 金币，随胜利自动结算。已拾取的金币在死亡或主动结束后保留。在主菜单的「营地训练」永久提升全职业的生命或移速，每项最多五级，局内祝福每局重新选择。

## 开发

需要 Node.js 22.12+（开发机器已验证 Node.js 26）。

```sh
npm ci
npm run dev
npm test
npm run build
```

`dist/` 为可部署静态站点，通过 HTTP(S) 访问，不能直接双击 HTML。手机访问开发服务器需要与电脑在同一网络并允许本地服务器连接。

## 约定

- 开局直接选职业，再定流派。法师有雷行、孢庭、余火，剑卫有盾反、重斩，猎手有穿杨、散射。六级开启流派专精，九级起可抽到流派天赋。
- 在职业页选择简单、标准或困难，默认标准。难度会被记住并在每局开始时锁定，暂停和结算可查看。
- 飞蛾可用群攻快速清除，甲虫能吸收 52% 的范围冲击。对付甲虫时可用余烬直击、持续灼烧、月孢或流星穿透。

- WASD / 方向键移动；触屏使用左侧虚拟摇杆。自动攻击。按 Esc 或点击暂停可查看本局天赋、技能联动与当前数值。空格或右侧「闪避」可闪避；险避成功会吸引附近的经验种荚。
- 设置中的怪物血条默认开启。勾选「血量数字」可显示当前 / 最大生命，关闭血条会暂时隐藏数字并记住选择。
- 在 1:30 和 3:45 可绕路点亮林灯，选择回血或限时增伤。三分钟出现棘冠山主或月绒蛾后，六分钟出现古树守卫，八分钟时结束。选择奖励或升级时暂停战斗。
- 不含广告、内购、用户追踪或云存档。进度保存在当前浏览器，支持导出。
- iPhone 17 Pro Safari 为目标验收设备；实机测试完成前不宣称手机性能已验收。
- 阶段代码以独立 Git 提交和标签保存，审核记录见 `docs/reviews.md`。

## 资源与许可

剑卫和猎手的独立动作图集由 `scripts/bake-martial.cjs` 烘焙，基础图集每份含 36 帧；猎手移动时分别绘制腿和上身，每个方向有 24 个步态采样，开弓并不打断步态。职业卡使用完整人物并统一脚底线。三只首领沿用原造型绘制正常和受损两套动作，每只共 48 帧，见 `scripts/bake-mini-bosses.cjs` 和 `scripts/bake-chief-regalia.cjs`；不同敌种的树脂弹、晶片、蛾粉和树种由 `src/encounterInk.ts` 绘制。

星雷命中图集 `public/art/storm-impact.png` 改编自 13rice 的 *Radial lightning effect*。本作裁取六帧，并为普通和满电攻击分别着色。原素材采用 CC0。[作者及原图](https://opengameart.org/content/radial-lightning-effect) · [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)

自制代码与游戏资源目前未授予开源使用许可。公开仓库用于交付与审阅，并不自动授权复制发行。第三方依赖沿用其各自许可；AI 辅助资源会记录生成方式与提示词。

## 离线与手机试玩

运行 npm run build 后执行 node offline.mjs。用 Edge 或 Chrome 双击打开生成的 Forest-Nightwatch.html 即可离线游玩。这个版本内嵌脚本、样式与运行素材。浏览器存档受打开方式和浏览器配置影响，换入口前可以在设置中导出。

安装 Node.js 的 Windows 电脑可双击「手机同网试玩.cmd」。保持窗口开启，在同一 Wi-Fi 的手机 Safari 输入窗口列出的 WLAN 完整链接。每次启动会生成新地址，关闭窗口即停止服务。访客网络、设备间隔离及防火墙可能阻止同网访问。

地图使用可重复拼接的草地图块；装饰按世界坐标布置，角色可以向任意方向持续移动。图块实现参考 Phaser 官方 TileSprite 指南：https://phaser.io/oss/docs/phaser/concepts/gameobjects/tile-sprite

怪物骨架、关节与动作曲线在 `scripts/enemy-skeletons.cjs`。如需修改，在可加载 sharp 的 Node 环境运行 `node scripts/bake-enemies.cjs` 重建图集。正常开发和游玩直接使用已提交图集。

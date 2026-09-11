# 园丁 Codex 桌宠

一款使用原创 Q 版素材制作的《第五人格》园丁（艾玛·伍兹）同人桌宠。

## 网友一行安装（macOS）

将下面这行指令交给 AI 运行，或直接粘贴到终端：

```bash
curl -fsSL https://raw.githubusercontent.com/iisland2008/identity-v-gardener-desktop-pet/main/install.sh | bash
```

安装器会自动识别 Apple Silicon 或 Intel Mac，下载最新版，安装到 `~/Applications/园丁桌宠.app` 并启动。

## 功能

- 拖动帽子区域，可以把园丁放到屏幕任意位置。
- 点击园丁，她会随机说一句话。
- 园丁会监听本机 Codex 会话的生命周期事件：Codex 开始处理时切换为“任务进行中”，完成回复时切换为“任务完成”，随后自动回到待机。
- 状态监听只解析 `task_started`、`task_complete`、`turn_aborted` 三种事件及时间，不读取对话正文。
- 点击右下角的花朵按钮，可以查看当前联动状态。
- 右键园丁也可以展开或收起任务面板。
- 菜单栏中的园丁图标可以隐藏、叫回或退出桌宠。

每个状态都有独立台词池：待机 7 句、任务中 5 句、任务完成 5 句。状态切换时会自动显示对应气泡，点击园丁也可以随机触发。

## 本地开发

```bash
npm install
npm start
```

## 小红书宣传素材

- [园丁桌宠发布海报](poster/gardener-launch/gardener-codex-pet-poster.png)
- [待机状态气泡](poster/gardener-dialogues/01-idle-dialogues.png)
- [任务进行中气泡](poster/gardener-dialogues/02-working-dialogues.png)
- [任务完成气泡](poster/gardener-dialogues/03-complete-dialogues.png)

## 打包 macOS 版本

```bash
npm run dist:mac
```

生成文件位于 `release/`。当前配置生成 Apple Silicon（arm64）的 DMG 和 ZIP。

## 同人声明

本项目为非官方同人作品，与网易游戏及《第五人格》官方无关。角色名称与相关世界观归其权利人所有；桌宠插画与程序代码请按发布者另行声明的许可使用。请勿将本项目冒充官方产品或用于未经授权的商业用途。

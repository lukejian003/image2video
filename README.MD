# image2video

这个 Node.js 应用程序通过将音频文件与图像结合，将音频文件转换为视频文件。生成的视频文件将具有音频作为背景音乐和指定图像作为视觉组件。

## 安装
1. 将此存储库克隆到本地计算机。
2. 运行 `npm install` 安装所需的依赖项。

## 用法
1. 将音频文件放置在 `audio` 目录中。
2. 用要用于视频的图像替换根目录中的 `image.jpg` 文件。
3. 修改 `config.json` 文件以自定义水印文本、字体和其他设置。
4. 使用 `node app.js` 运行应用程序。
5. 处理完成后，生成的视频将位于 `video` 目录中。

## 配置
您可以在 `config.json` 文件中自定义以下设置：
- `audioDir`：存放音频文件的目录。
- `imageFile`：要用于视频的图像文件的名称。
- `videoDir`：生成的视频文件将保存在的目录。
- `imageDir`：中间图像文件将保存在的目录。
- `watermarkFontSize`：文本的字体大小。
- `fillStyle`：文本的字体颜色。
- `xPosition`：文本的x轴位置，0为居中。
- `yPosition`：文本的y轴位置，0为居中。
- `watermarkFontPath`：文本的字体文件路径。
- `ffmpegPath`：FFmpeg 可执行文件的路径。

## 错误处理
转换过程中遇到的任何错误将记录在 `error.log` 文件中。

---

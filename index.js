const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const ffmpeg = require('fluent-ffmpeg');
const sizeOf = require('image-size');
const { createCanvas, loadImage, registerFont } = require('canvas');
const ProgressBar = require('./progress_bar.js');
// const config = require('./config.json');
let config = {}
async function loadConfig() {
  const configPath = path.join(process.cwd(), 'config.json');
  try {
    await fs.access(configPath);
  } catch (error) {
    console.error('config.json 文件不存在，正在创建该文件...');
    const defaultConfig = {
      "audioDir": "audio",
      "imageFile": "image.jpg",
      "videoDir": "video",
      "imageDir": "images",
      "watermarkFontSize": 190,
      "watermarkX": "(w-tw)/2",
      "watermarkY": "(h-th)/2",
      "watermarkFontPath": "font.ttf",
      "ffmpegPath": "ffmpeg/bin/ffmpeg"
    };
    try {
      await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
      console.log('config.json 文件创建成功。');
    } catch (err) {
      console.error(`无法创建 config.json 文件: ${err.message}`);
      throw err;
    }
  }
  const configData = await fs.readFile(configPath, 'utf-8');
  return JSON.parse(configData);
}

// 确保输出文件夹存在，如果不存在就自动创建
async function ensureDirectoryExists(directory) {
  try {
    await fs.access(directory);
  } catch (error) {
    console.error(`${directory} 文件夹不存在，正在创建该文件夹...`);
    try {
      await fs.mkdir(directory, { recursive: true });
      console.log(`${directory} 文件夹创建成功。`);
    } catch (err) {
      console.error(`无法创建 ${directory} 文件夹: ${err.message}`);
      throw err;
    }
  }
}


// 确保输出文件夹存在
async function ensureOutputDirectoriesExist() {
  try {
    await ensureDirectoryExists(config.videoDir);
    await ensureDirectoryExists(config.imageDir);
  } catch (error) {
    process.exit(1);
  }
}

// 确保音频文件夹存在
async function ensureAudioDirectoryExists() {
  try {
    await ensureDirectoryExists(config.audioDir);
  } catch (error) {
    process.exit(1);
  }
}

// 检测并创建错误日志文件
async function ensureErrorLogFileExists() {
  const logFilePath = path.join(process.cwd(), 'error.log'); // 使用当前工作目录
  try {
    await fs.access(logFilePath);
  } catch (error) {
    // console.error(`错误日志文件不存在，正在创建: ${logFilePath}`);
    try {
      await fs.writeFile(logFilePath, '');
      // console.log('错误日志文件创建成功。');
    } catch (err) {
      console.error(`无法创建错误日志文件: ${err.message}`);
      process.exit(1);
    }
  }
}

// 获取音频文件列表
async function getAudioFiles() {
  try {
    return await fs.readdir(config.audioDir);
  } catch (error) {
    console.error(`无法读取音频文件: ${error.message}`);
    process.exit(1);
  }
}

// 记录错误日志
async function logError(error) {
  const logFilePath = path.join(process.cwd(), 'error.log'); // 使用当前工作目录
  const errorMessage = `${new Date().toISOString()}: ${error.message}\n`;
  try {
    await fs.appendFile(logFilePath, errorMessage);
    console.error('发生错误，请查看 error.log 文件获取详细信息。');
  } catch (err) {
    console.error(`无法记录错误日志: ${err.message}`);
  }
}

// 入口函数
async function main() {
  try {
    config = await loadConfig();
    await ensureErrorLogFileExists();
    await ensureOutputDirectoriesExist();
    await ensureAudioDirectoryExists();
    const audioFiles = await getAudioFiles();

    for (let i = 0; i < audioFiles.length; i++) {
      const audioFile = audioFiles[i];
      const audioPath = path.join(config.audioDir, audioFile);
      const audioFileName = path.basename(audioFile, path.extname(audioFile));
      const videoPath = path.join(config.videoDir, `${audioFileName}.mp4`);
      const imagePath = path.join(config.imageDir, `${audioFileName}.jpg`);
      const pb = new ProgressBar(videoPath, 0);
      // 获取图片尺寸
      const { width, height } = sizeOf(config.imageFile);

      // 生成带有文字的新图片
      const watermarkBuffer = await generateWatermark(audioFileName, config.watermarkFontPath, config.watermarkFontSize, width, height);

      // 将文字图片与原始图片合成
      const finalImageBuffer = await compositeImages(config.imageFile, watermarkBuffer, width, height);
      await fs.writeFile(imagePath, finalImageBuffer);

      // 使用 ffmpeg 生成视频
      await generateVideo(audioPath, imagePath, videoPath, width, height, pb);
    }

    console.log('处理完成，请按下回车键退出。');
    // 等待用户按下回车键
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('按下回车键退出。', () => {
      rl.close();
      process.exit(0);
    });
  } catch (error) {
    await logError(error);
    console.log('发生错误，请按下回车键退出。');
    // 等待用户按下回车键
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('按下回车键退出。', () => {
      rl.close();
      process.exit(1);
    });
  }
}

async function generateWatermark(text, fontPath, fontSize, width, height, lineHeight = fontSize * 1.2) {
  registerFont(fontPath, { family: 'custom-font' });
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontSize}px "custom-font"`;
  ctx.fillStyle = config.fillStyle;
  ctx.textBaseline = 'top'; // 从顶部开始绘制
  ctx.textAlign = 'center';

  let words = text.split('');
  let lines = [];
  let currentLine = words[0];
  let lineWidth = ctx.measureText(currentLine).width;

  for (let n = 1; n < words.length; n++) {
    let testLine = currentLine + words[n];
    let metrics = ctx.measureText(testLine);
    let testWidth = metrics.width;
    if (testWidth < width && words[n] !== '') {
      currentLine = testLine;
      lineWidth = testWidth;
    } else {
      lines.push(currentLine);
      currentLine = words[n];
      lineWidth = ctx.measureText(currentLine).width;
    }
  }
  lines.push(currentLine);

  const xPosition = config.xPosition || width / 2
  const yPosition = config.yPosition || (height / 2) - (lineHeight / 2 * lines.length)
  let y = yPosition;
  for (let line of lines) {
    ctx.fillText(line, xPosition, y);
    y += lineHeight;
  }

  return canvas.toBuffer('image/png');
}

async function compositeImages(backgroundImagePath, watermarkBuffer, width, height) {
  const backgroundImage = await loadImage(backgroundImagePath);
  const watermarkImage = await loadImage(watermarkBuffer);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  // 绘制背景图片
  ctx.drawImage(backgroundImage, 0, 0, width, height);
  // 绘制文字图片
  ctx.drawImage(watermarkImage, 0, 0, width, height);
  return canvas.toBuffer();
}

async function generateVideo(audioPath, imagePath, videoPath, width, height, pb) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .setFfmpegPath(config.ffmpegPath)
      .input(audioPath)
      .input(imagePath)
      .videoCodec('libx264')
      .size(`${width}x${height}`)
      .outputOptions(['-pix_fmt yuv420p', '-crf 24', '-preset 8', '-r 6', '-b:v 6M', '-x264-params', 'keyint=infinite:scenecut=60', '-vf', `scale=${width}:${height}:flags=lanczos`])
      .save(videoPath)
      .on('progress', (progress) => {
        const percent = progress.percent.toFixed(2);
        pb.render({ completed: percent, total: 100 });
      })
      .on('end', () => {
        pb.render({ completed: 100, total: 100 });
        console.log(`\n视频 ${videoPath} 已生成`);
        resolve();
      })
      .on('error', (err) => {
        reject(new Error(`视频生成错误: ${err.message}`));
      });
  });
}

main().catch(async (error) => {
  await logError(error);
  console.log('发生错误，请按下回车键退出。');
  // 等待用户按下回车键
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('按下回车键退出。', () => {
    rl.close();
    process.exit(1);
  });
});
import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { cwd, platform, chdir } from 'process';

const STORMLIB_REPO = 'https://github.com/ladislav-zezula/StormLib.git';
const STORMLIB_DIR = join(cwd(), 'StormLib');

function runCommand(command) {
  console.log(`Running: ${command}`);
  execSync(command, { stdio: 'inherit' });
}

function getCMakePath() {
  // 1. 尝试直接调用全局 cmake
  try {
    execSync('cmake --version', { stdio: 'ignore' });
    return 'cmake';
  } catch (e) {
    // 全局没找到，继续往下
  }

  // 2. 如果是 Windows，尝试通过 vswhere 查找 VS 自带的 cmake
  if (platform === 'win32') {
    try {
      // vswhere 的标准安装路径
      const vswherePath = join(
        process.env['ProgramFiles(x86)'] || process.env['ProgramFiles'],
        'Microsoft Visual Studio',
        'Installer',
        'vswhere.exe'
      );

      if (existsSync(vswherePath)) {
        // 使用 vswhere 查找安装了 CMake 组件的 VS 实例，并输出 cmake.exe 的路径
        // -latest: 找最新的 VS
        // -products *: 包含社区版、企业版等
        // -requires: 确保安装了 CMake 组件
        // -find: 直接返回文件路径
        const cmd = `"${vswherePath}" -latest -products * -requires Microsoft.VisualStudio.Component.VC.CMake.Project -find **\\bin\\cmake.exe`;

        const output = execSync(cmd, { encoding: 'utf8' }).trim();

        if (output && existsSync(output)) {
          console.log(`[Build] Found VS CMake at: ${output}`);
          return `"${output}"`; // 返回带引号的路径，防止空格报错
        }
      }
    } catch (e) {
      // 查找失败，忽略
    }
  }

  // 3. 实在找不到，抛出带有指导意义的错误
  console.error('\x1b[31m%s\x1b[0m', 'Error: CMake not found in PATH nor in Visual Studio.');
  console.error('\x1b[33m%s\x1b[0m', 'Hint: Install CMake via "winget install Kitware.CMake" OR run this in "Developer PowerShell for VS".');
  process.exit(1);
}

function compileStormLib() {
  if (!existsSync(STORMLIB_DIR)) {
    console.log('Cloning StormLib repository...');
    runCommand(`git clone ${STORMLIB_REPO} ${STORMLIB_DIR}`);
  } else {
    console.log('StormLib directory already exists. Updating...');
    runCommand(`cd ${STORMLIB_DIR} && git pull`);
  }

  console.log('Compiling StormLib...');
  const buildDir = join(STORMLIB_DIR, 'build');
  if (existsSync(buildDir)) {
    rmSync(buildDir, { recursive: true, force: true });
  }
  mkdirSync(buildDir);

  chdir(buildDir);

  if (platform === 'win32') {
    const cmakeCmd = getCMakePath();
    const cmakeArgs = [
      `${cmakeCmd} ..`,
      '-G "Visual Studio 17 2022"',
      '-A x64',
      '-DCMAKE_POSITION_INDEPENDENT_CODE=ON',
      '-DCMAKE_POLICY_DEFAULT_CMP0091=NEW',
      '-DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreaded',
      '-DCMAKE_C_FLAGS_RELEASE=/MT',
      '-DCMAKE_CXX_FLAGS_RELEASE=/MT',
      '-DCMAKE_C_FLAGS_DEBUG=/MTd',
      '-DCMAKE_CXX_FLAGS_DEBUG=/MTd'
    ].join(' ');
    runCommand(cmakeArgs);
    runCommand(`${cmakeCmd} --build . --config Release`);
  } else {
    runCommand('cmake .. -DCMAKE_POSITION_INDEPENDENT_CODE=ON');
    runCommand('make CFLAGS="-fPIC" CXXFLAGS="-fPIC"');
  }

  console.log('StormLib compilation completed.');
}

compileStormLib();
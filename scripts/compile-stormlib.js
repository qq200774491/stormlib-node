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
    const cmakeArgs = [
      'cmake ..',
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
    runCommand('cmake --build . --config Release');
  } else {
    runCommand('cmake .. -DCMAKE_POSITION_INDEPENDENT_CODE=ON');
    runCommand('make CFLAGS="-fPIC" CXXFLAGS="-fPIC"');
  }

  console.log('StormLib compilation completed.');
}

compileStormLib();
import path from 'path';

import fs from 'fs-extra';
import minimist from 'minimist';

// TODO: support -r for recursive
// TODO: support other than default export
// TODO: support multiple paths
// TODO: support custom output
// TODO: case insensitive
// TODO: add tests
// TODO: allow targetting .js
// TODO: add help or manual

export async function main() {
  let argv = minimist(process.argv.slice(2), {
    boolean: ['f'],
    string: ['sourceExts'],
    default: {
      sourceExts: 'js,ts',
    },
  });

  let targetDir = argv._[0] ?? '.';
  let workDir = path.join(process.cwd(), targetDir);

  let files = await fs.readdir(workDir);

  let targetIndex = 'index.ts';
  let targetIndexPath = path.join(workDir, targetIndex);
  let targetIndexPathRelative = path.join(targetDir, targetIndex);

  let force = Boolean(argv.f);
  if (!force && files.includes(targetIndex)) {
    // TODO: Add confirmation instead of exit.
    exitWithError(
      `\`${targetIndexPathRelative}\` already exist.\nUse -f to force writing the index file.`,
      1,
    );
  }

  let sourceExts = splitSourceExtsArg(String(argv.sourceExts).trim());

  let matchedFiles = files
    // Skip dotfiles
    .filter((f) => !!getExportName(f))
    .filter((f) => matchExts(sourceExts, f));

  let indexLines = matchedFiles.map(getExportDefaultFromLine);
  let indexSource = indexLines.join('\n');

  await fs.writeFile(targetIndexPath, indexSource + '\n');
}

function exitWithError(message: string, code: number) {
  console.error(`Error: ${message}`);
  process.exit(code);
}

const OPTIONAL_EXTENSION = /\.((js|ts)x?)$/i;
function getModuleName(fileName: string) {
  fileName = fileName.replace(OPTIONAL_EXTENSION, '');
  return `./${fileName}`;
}

function getExportName(fileName: string) {
  return fileName.split('.')[0];
}

function getExportDefaultFromLine(fileName: string) {
  return `export { default as ${getExportName(
    fileName,
  )} } from '${getModuleName(fileName)}';`;
}

function splitSourceExtsArg(sourceExtsArg: string) {
  return sourceExtsArg.split(',').map((ext) => ext.trim());
}

function matchExts(exts: Array<string>, filePath: string) {
  return exts.some((ext) => filePath.endsWith(ext));
}

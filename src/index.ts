import path from 'path';

import fs from 'fs-extra';
import minimist from 'minimist';

// TODO: support -r for recursive
// TODO: support other than default export
// TODO: support multiple paths
// TODO: support custom output
// TODO: add tests
// TODO: allow targetting .js
// TODO: add help or manual

export async function main() {
  let argv = minimist(process.argv.slice(2), {
    boolean: ['f', 'version'],
    string: ['sourceExts'],
    default: {
      sourceExts: 'js,ts',
    },
  });

  if (argv.version) {
    exit(`${(await getPackageJson()).version}`);
  }

  let targetDir = argv._[0] ?? '.';

  let matchedFiles = await writeIndexForDir(
    targetDir,
    splitSourceExtsArg(String(argv.sourceExts).trim()),
    Boolean(argv.f),
  );

  echo(`Finished exporting ${matchedFiles.length} file(s).`);
}

async function writeIndexForDir(
  targetDir: string,
  sourceExts: Array<string>,
  force: boolean,
) {
  let workDir = path.join(process.cwd(), targetDir);

  let files: Array<string> = [];
  try {
    files = await fs.readdir(workDir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      exitWithError(`\`${targetDir}\` directory does not exist.`, 3);
    } else {
      exitWithError(`Failed to read \`${targetDir}\`.`, 4);
    }
  }

  let targetIndex = 'index.ts';
  let targetIndexPath = path.join(workDir, targetIndex);
  let targetIndexPathRelative = path.join(targetDir, targetIndex);

  if (!force && files.includes(targetIndex)) {
    exitWithError(
      `\`${targetIndexPathRelative}\` already exist.\nUse -f to force writing the index file.`,
      1,
    );
  }

  let matchedFiles = files
    // Skip dotfiles and target file
    .filter((f) => !!getExportName(f) && f !== targetIndex)
    .filter((f) => matchExts(sourceExts, f));

  if (!matchedFiles.length) {
    exitWithError(`No files matched.`, 2);
  }

  let indexLines = matchedFiles.map(getExportDefaultFromLine);
  let indexSource = indexLines.join('\n');

  await fs.writeFile(targetIndexPath, indexSource + '\n');
  return matchedFiles;
}

function echo(message: string) {
  console.log(message);
}

function exit(message?: string) {
  message && console.log(message);
  process.exit(0);
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
  return sourceExtsArg.split(',').map((ext) => ext.trim().toLowerCase());
}

function matchExts(exts: Array<string>, filePath: string) {
  return exts.some((ext) => filePath.toLowerCase().endsWith(ext));
}

async function getPackageJson() {
  let config = await fs.readFile(
    path.join(__dirname, '../package.json'),
    'utf-8',
  );
  return JSON.parse(config);
}

#!/usr/bin/env ts-node

import { JsonFile } from '@microsoft/node-core-library';
import { remove, rename } from 'fs-extra';
import { sync as glob } from 'globby';
import { basename, dirname, join } from 'path';
import * as ts from 'typescript';

buildAll()
  .catch(error => {
    console.error(`[CRASH] unhandled error: ${error.stack}`);
    process.exit(-1);
  });

async function buildAll(): Promise<void> {
  const tsconfig: { exclude: Array<string> } = JsonFile.load('tsconfig.json');

  tsconfig.exclude.push(
    'script',
    'src/__tests__'
  );

  const parsedCommandLine: ts.ParsedCommandLine = ts.parseJsonConfigFileContent(
    tsconfig,
    ts.sys,
    process.cwd()
  );

  const config = {
    ...parsedCommandLine,
    options: {
      ...parsedCommandLine.options,
      outDir: 'dist'
    }
  };

  await clean(config);
  await buildEsModule(config);
  await buildCommonJS(config);
}

async function clean(config: ts.ParsedCommandLine): Promise<void> {
  await remove(config.options.outDir!);
}

async function buildEsModule(config: ts.ParsedCommandLine): Promise<void> {
  console.log('Building ES module version.');

  await build({
    ...config,
    options: {
      ...config.options,
      module: ts.ModuleKind.ESNext,
      
    }
  });

  for (const module of glob(join(config.options.outDir!, '**/*.js'))) {
    await rename(module, join(dirname(module), `${basename(module, '.js')}.mjs`));
  }
}

async function buildCommonJS(config: ts.ParsedCommandLine): Promise<void> {
  console.log('Building CommonJS version.');
  await build({
    ...config,
    options: {
      ...config.options,
      module: ts.ModuleKind.CommonJS
    }
  });
}

async function build(config: ts.ParsedCommandLine): Promise<void> {
  ts.createProgram(
    config.fileNames,
    config.options
  ).emit();
}

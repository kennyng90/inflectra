// Learn more https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

/* Git worktrees live in .claude/worktrees/ inside the repo, so a dev server
   would otherwise bundle every other worktree's src/app alongside this one.
   Everything under .claude/worktrees/ except the directory we booted from. */
const here = path.basename(__dirname).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const otherWorktrees = new RegExp(`[\\\\/]\\.claude[\\\\/]worktrees[\\\\/](?!${here}[\\\\/])`);

config.resolver.blockList = [
  ...[config.resolver.blockList].flat().filter(Boolean),
  otherWorktrees,
];

module.exports = config;

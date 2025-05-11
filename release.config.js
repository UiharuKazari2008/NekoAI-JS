module.exports = {
  branches: ['main'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/npm',
    [
      '@semantic-release/exec',
      {
        prepareCmd: 'node -e "const fs = require(\'fs\'); const pkg = JSON.parse(fs.readFileSync(\'./package.json\')); const jsr = JSON.parse(fs.readFileSync(\'./jsr.json\')); jsr.version = pkg.version; fs.writeFileSync(\'./jsr.json\', JSON.stringify(jsr, null, 4) + \'\\n\');"',
      }
    ],
    '@semantic-release/github',
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'package-lock.json', 'jsr.json'],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
      }
    ]
  ]
}; 
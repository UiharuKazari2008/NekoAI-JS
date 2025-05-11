module.exports = {
  branches: ['main'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/npm',
    [
      '@semantic-release/exec',
      {
        prepareCmd: 'node -e "const pkg=require(\'./package.json\'); const jsr=require(\'./jsr.json\'); jsr.version=pkg.version; require(\'fs\').writeFileSync(\'./jsr.json\', JSON.stringify(jsr, null, 4) + \'\\n\')"',
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
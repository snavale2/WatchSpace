/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type must be one of the conventional commit types
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation only
        'style', // Formatting, missing semicolons, etc. (no code change)
        'refactor', // Code change that neither fixes a bug nor adds a feature
        'perf', // Performance improvement
        'test', // Adding or correcting tests
        'build', // Changes to build system or external dependencies
        'ci', // CI configuration changes
        'chore', // Other changes that don't modify src or test files
        'revert', // Reverts a previous commit
      ],
    ],
    // Subject must not be empty
    'subject-empty': [2, 'never'],
    // Subject in lower case
    'subject-case': [2, 'always', 'lower-case'],
    // Subject must not end with a period
    'subject-full-stop': [2, 'never', '.'],
    // Type must be lower case
    'type-case': [2, 'always', 'lower-case'],
    // Type must not be empty
    'type-empty': [2, 'never'],
    // Header must be <= 100 chars
    'header-max-length': [2, 'always', 100],
  },
};

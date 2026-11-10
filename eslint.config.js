const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const forbidImports = (files, group, message) => ({
  files,
  rules: { 'no-restricted-imports': ['error', { patterns: [{ group, message }] }] },
});

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*'] },
  forbidImports(
    ['src/lib/**', 'src/hooks/**', 'src/utils/**', 'src/components/**', 'src/config/**', 'src/testing/**'],
    ['@/features/*', '@/app/*'],
    'El código compartido no puede depender de features ni de rutas.',
  ),
  ...['markets', 'portfolio', 'orders'].map((feature) => forbidImports(
    [`src/features/${feature}/**`],
    ['@/app/*', '@/features/*', `!@/features/${feature}/*`],
    'Una feature no puede depender de rutas ni de otra feature.',
  )),
]);

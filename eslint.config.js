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
    ['src/lib/**', 'src/hooks/**', 'src/utils/**', 'src/components/**', 'src/config/**'],
    ['@/features/*', '@/app/*'],
    'El código compartido no puede depender de features ni de rutas.',
  ),
  forbidImports(
    ['src/features/markets/**'],
    ['@/app/*', '@/features/*', '!@/features/markets/*'],
    'Una feature no puede depender de rutas ni de otra feature.',
  ),
]);

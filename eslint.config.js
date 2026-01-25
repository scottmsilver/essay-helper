import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'functions']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['*/firebase/firestore'],
          importNames: ['EssayDocument', 'SharedEssayRef', 'SharingInfo', 'Collaborator', 'Permission', 'PermissionLevel', 'EssayWithPermissions'],
          message: 'Import document types from models/document.ts instead of firebase/firestore.ts'
        }]
      }],
    },
  },
])

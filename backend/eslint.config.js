const globals = require("globals");

module.exports = [
    {
        ignores: [
            "node_modules/**",
            "index.js",
            "middleware/authMiddleware.js",
            "coverage/**",
            "dist/**",
        ],
    },
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",
            globals: {
                ...globals.node,
            },
        },
        rules: {
            "no-undef": "error",
            "no-unreachable": "error",
            "no-dupe-keys": "error",
            "no-duplicate-case": "error",
            "no-unexpected-multiline": "error",
            "valid-typeof": "error",
            "eqeqeq": ["error", "always"],
            "curly": ["error", "all"],
            "prefer-const": "error",
            "no-var": "error",
            "no-unused-vars": [
                "error",
                {
                    args: "none",
                    caughtErrors: "none",
                },
            ],
        },
    },
];

import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import cpp from "highlight.js/lib/languages/cpp";
import java from "highlight.js/lib/languages/java";
import python from "highlight.js/lib/languages/python";
import php from "highlight.js/lib/languages/php";
import csharp from "highlight.js/lib/languages/csharp";
import go from "highlight.js/lib/languages/go";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import bash from "highlight.js/lib/languages/bash";
import shell from "highlight.js/lib/languages/shell";
import json from "highlight.js/lib/languages/json";
import yaml from "highlight.js/lib/languages/yaml";
import markdown from "highlight.js/lib/languages/markdown";
import ini from "highlight.js/lib/languages/ini";
import diff from "highlight.js/lib/languages/diff";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import plaintext from "highlight.js/lib/languages/plaintext";
import sql from "highlight.js/lib/languages/sql";
import http from "highlight.js/lib/languages/http";
import nginx from "highlight.js/lib/languages/nginx";
import apache from "highlight.js/lib/languages/apache";
import rehypeHighlight from "rehype-highlight";

import xml from "highlight.js/lib/languages/xml";

export const highlightPlugin = {
    rehypePlugin: [
        rehypeHighlight,
        {
            ignoreMissing: true,
            languages: {
                xml,
                css,
                javascript,
                typescript,
                cpp,
                java,
                python,
                php,
                csharp,
                go,
                ruby,
                rust,
                bash,
                shell,
                json,
                yaml,
                markdown,
                ini,
                diff,
                dockerfile,
                plaintext,
                sql,
                http,
                nginx,
                apache,
                // Updated Svelte 5 language definition
                svelte: ((hljs: any) => {
                    // Basic script block recognition (JS/TS)
                    const SVELTE_SCRIPT_MODE = (lang) => ({
                        begin: /^(\s*)(<script(\s+lang="ts")?\s*>)/gm,
                        end: /^(\s*)(<\/script>)/gm,
                        subLanguage: lang,
                        excludeBegin: true,
                        excludeEnd: true,
                        contains: [
                            // Highlight Svelte 5 runes
                            {
                                match: /\$(state|derived|effect|props|inspect|host)\b/,
                                className: 'keyword' // Or 'built_in' depending on theme preference
                            },
                            // Highlight $: derived assignments (still valid)
                            {
                                begin: /^(\s*)(\$:)/gm,
                                end: /(\s*)/gm, // Match until end of line or significant whitespace
                                className: 'keyword' // Or 'built_in'
                            }
                        ]
                    });

                    // Basic style block recognition
                    const SVELTE_STYLE_MODE = {
                        begin: /^(\s*)(<style(\s.*)*>)/gm,
                        end: /^(\s*)(<\/style>)/gm,
                        subLanguage: 'css', // Can be extended for sass/less if needed
                        excludeBegin: true,
                        excludeEnd: true
                    };

                    // Basic template expression/block recognition
                    const SVELTE_TEMPLATE_MODE = {
                        begin: /\{/gm,
                        end: /\}/gm,
                        subLanguage: 'javascript', // Expressions are JS-like
                        contains: [
                            { begin: /\{/, end: /\}/, skip: true }, // Skip nested braces for now
                            // Highlight control flow blocks and snippet/render tags
                            {
                                match: /([#:/@])(if|else|each|await|then|catch|debug|html|key|snippet|render|const)\b/,
                                className: 'keyword', // Or 'built_in'
                                relevance: 10
                            }
                        ]
                    };

                    return {
                        name: 'svelte',
                        subLanguage: 'xml', // Base language is HTML/XML
                        contains: [
                            hljs.COMMENT('<!--', '-->', { relevance: 10 }),
                            SVELTE_SCRIPT_MODE('javascript'),
                            SVELTE_SCRIPT_MODE('typescript'), // Handles <script lang="ts">
                            SVELTE_STYLE_MODE,
                            SVELTE_TEMPLATE_MODE
                        ]
                    };
                })
            }
        }
    ]
};

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import base path from constants
import { basePath } from "../app/constants.mjs";

// Recursively find all .tsx files in a directory
function findTsxFiles(dir, fileList = []) {
    const files = readdirSync(dir);

    files.forEach(file => {
        const filePath = join(dir, file);
        const stat = statSync(filePath);

        if (stat.isDirectory()) {
            findTsxFiles(filePath, fileList);
        } else if (file.endsWith('.tsx')) {
            fileList.push(filePath);
        }
    });

    return fileList;
}

// Find all generated .tsx files
const generatedDir = join(__dirname, '..', 'app', '__generated__');
const files = findTsxFiles(generatedDir);

let totalReplacements = 0;

files.forEach(file => {
    let content = readFileSync(file, 'utf8');
    const originalContent = content;
    let fileReplacements = 0;

    // Replace internal link hrefs (but not external ones, anchors, or mailto links)
    content = content.replace(
        /href=\{("\/[^"]*?")\}/g,
        (match, quotedPath) => {
            // Remove quotes to check the path
            const path = quotedPath.slice(1, -1);

            // Skip if it's already prefixed, is an external URL, anchor, or mailto
            if (
                path.startsWith(basePath) ||
                path.includes('http://') ||
                path.includes('https://') ||
                path.startsWith('#') ||
                path.startsWith('mailto:')
            ) {
                return match;
            }

            fileReplacements++;
            return `href={"${basePath}${path}"}`;
        }
    );

    // Also handle hrefs within rich text (like <a href={"/path"}>)
    content = content.replace(
        /href=\{("\/[^}]*?")\}/g,
        (match, quotedPath) => {
            // Remove quotes to check the path
            const path = quotedPath.slice(1, -1);

            // Skip if it's already prefixed, is an external URL, anchor, or mailto
            if (
                path.startsWith(basePath) ||
                path.includes('http://') ||
                path.includes('https://') ||
                path.startsWith('#') ||
                path.startsWith('mailto:')
            ) {
                return match;
            }

            // Don't double count if already replaced above
            if (originalContent.includes(match) && !content.includes(match)) {
                return match;
            }

            return `href={"${basePath}${path}"}`;
        }
    );

    // Only write if content changed
    if (content !== originalContent) {
        writeFileSync(file, content, 'utf8');
        totalReplacements += fileReplacements;
        console.log(`  ✓ ${file.split('/').pop()}: ${fileReplacements} link(s) fixed`);
    }
});

console.log(`\n✓ Fixed ${totalReplacements} internal link(s) across ${files.length} file(s)`);
console.log(`  Base path: ${basePath}`);

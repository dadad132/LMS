#!/usr/bin/env python3
"""Fix encoding issues in admin.js file"""

# Read admin.js
with open('app/static/js/admin.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Count and fix corrupted Browse pattern
corrupted_browse = '\u00f0\u009f\u0093\u0081 Browse'
count = content.count(corrupted_browse)
print(f'Found {count} corrupted Browse buttons (pattern 1)')

content = content.replace(corrupted_browse, 'Browse')

# Try alternative pattern (mojibake)
alt_pattern = 'ðŸ" Browse'
count2 = content.count(alt_pattern)
print(f'Found {count2} corrupted Browse buttons (pattern 2)')
content = content.replace(alt_pattern, 'Browse')

# Write back with UTF-8 encoding
with open('app/static/js/admin.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed admin.js!')

import re

with open(r'C:\Users\user\Desktop\kayal-lifeos\app\purchase\[toolId]\page.tsx', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

replacements = {
    'Ã¢Å"â€œ': '✓',
    'Ã°Å¸â€œÂ¦': '📦',
    'Ã°Å¸â€Â®': '🔮',
    'Ã¢â‚¬â€': '—',
    'Ã‚Â·': '·',
}

for bad, good in replacements.items():
    content = content.replace(bad, good)

with open(r'C:\Users\user\Desktop\kayal-lifeos\app\purchase\[toolId]\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
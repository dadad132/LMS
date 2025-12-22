#!/usr/bin/env python3
"""Fix encoding issues in template files"""
import os
import re

def fix_template_encoding():
    """Check and fix encoding in index.html"""
    template_path = os.path.join("app", "templates", "index.html")
    
    with open(template_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Check for mojibake patterns (UTF-8 decoded as Windows-1252)
    # Common patterns for corrupted emojis
    
    # Define emoji replacements - corrupt patterns to correct emojis
    # Using raw byte sequences to avoid encoding issues in this script
    replacements = {
        # Common corrupted emoji patterns (use Unicode escapes)
        "\u00f0\u009f\u008e\u0093": "\U0001F393",  # graduation cap
        "\u00e2\u008f\u00b0": "\u23F0",            # alarm clock
        "\u00f0\u009f\u008f\u0086": "\U0001F3C6",  # trophy
        "\u00f0\u009f\u0093\u00a7": "\U0001F4E7",  # email
        "\u00f0\u009f\u0093\u009e": "\U0001F4DE",  # telephone
        "\u00f0\u009f\u0093\u008d": "\U0001F4CD",  # location pin
        "\u00e2\u009c\u00a8": "\u2728",            # sparkles
    }
    
    changes_made = False
    for corrupt, correct in replacements.items():
        if corrupt in content:
            print(f"Found corrupt pattern: {repr(corrupt)} -> replacing with emoji")
            content = content.replace(corrupt, correct)
            changes_made = True
    
    # Check feature section
    feature_match = re.search(r'<div class="feature-icon">(.*?)</div>', content, re.DOTALL)
    if feature_match:
        print(f"Feature icon content (hex): {feature_match.group(1).encode('utf-8').hex()}")
        print(f"Feature icon content: {repr(feature_match.group(1))}")
    
    if changes_made:
        print("Saving fixed template...")
        with open(template_path, "w", encoding="utf-8") as f:
            f.write(content)
        print("Template fixed!")
    else:
        print("No corrupted emojis found in template.")
        # Print some sample content to check
        if "feature-icon" in content:
            print("\nChecking feature icons...")
            matches = re.findall(r'<div class="feature-icon">(.*?)</div>', content)
            for i, m in enumerate(matches[:5]):
                print(f"  Icon {i+1}: {repr(m)}")

if __name__ == "__main__":
    fix_template_encoding()

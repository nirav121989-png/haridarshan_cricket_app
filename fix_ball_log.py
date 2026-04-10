import sys

path = r'c:\Users\nirav\.gemini\antigravity\playground\magnetic-hypernova\custom-cricket-scorer\src\pages\ScorePage.jsx'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "B{ballNum}" in line and "<span" in line:
        # Detected the line! 
        # Extract the leading indentation from the line itself
        indent = line[:line.find('<span')]
        
        # Build the replacement structure
        new_lines.append(f"{indent}<div className=\"flex-col items-center\" style={{{{ minWidth: '42px' }}}}>\n")
        new_lines.append(f"{indent}    <span style={{{{ fontSize: '0.45rem', fontWeight: '950', color: 'var(--primary)', opacity: 0.9 }}}}>B{{ballNum}}</span>\n")
        new_lines.append(f"{indent}    <span style={{{{ fontSize: '0.45rem', fontWeight: '700', color: 'var(--text-muted)', textAlign: 'center', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', width: '100%' }}}}>\n")
        new_lines.append(f"{indent}        {{getPlayerName(ball.bowlerId).split(' ')[0].toUpperCase()}}\n")
        new_lines.append(f"{indent}    </span>\n")
        new_lines.append(f"{indent}</div>\n")
    else:
        new_lines.append(line)

with open(path, 'w', encoding='utf-8', newline='') as f:
    f.writelines(new_lines)

print("SUCCESS: Ball log updated with bowler names.")
